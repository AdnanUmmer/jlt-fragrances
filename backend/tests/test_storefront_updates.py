"""Disposable MongoDB and real SDK requests to a loopback-only HTTP simulator."""
import copy
import hashlib
import hmac
import json
import os
import sys
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest
import razorpay
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
os.environ.update(MONGO_URL='mongodb://127.0.0.1:27017', DB_NAME='jlt_update_test_import',
                  APP_ENV='test', JWT_SECRET='local-test-only-signing-key-over-32-chars',
                  ADMIN_EMAIL='qa@example.com', ADMIN_PASSWORD='local-test-password',
                  RAZORPAY_KEY_ID='rzp_test_localQA', RAZORPAY_KEY_SECRET='local-test-secret',
                  RAZORPAY_MODE='test', ENABLE_DEV_ADMIN='false')
import server
from quiz import STEPS, choices, inventory, matching, recommendations


@pytest.fixture(scope='module')
def api():
    dbname = 'jlt_update_test_' + uuid.uuid4().hex
    sync = MongoClient('mongodb://127.0.0.1:27017', serverSelectionTimeoutMS=2000)
    local = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    original_db, original_client = server.db, server.client
    server.db, server.client = local[dbname], local
    products = json.loads((ROOT / 'qa-before-products.json').read_text(encoding='utf-8'))
    sync[dbname].products.insert_many(copy.deepcopy(products))
    async def no_notification(*args, **kwargs):
        return True
    mp = pytest.MonkeyPatch()
    mp.setattr(server, 'send_telegram_notification', no_notification)
    mp.setattr(server, 'send_admin_order_email_async', no_notification)
    with TestClient(server.app) as client:
        yield client, sync[dbname]
    after = list(sync[dbname].products.find({}, {'_id': 0}))
    assert after == products, 'Existing 804 products must remain byte-for-byte equivalent as documents'
    assert dbname.startswith('jlt_update_test_')
    sync.drop_database(dbname)
    sync.close()
    server.db, server.client = original_db, original_client
    mp.undo()


@pytest.fixture
def gateway(monkeypatch):
    state = {'calls': [], 'payments': {}, 'failure': False}
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass
        def reply(self, status, data):
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        def do_POST(self):
            assert self.path == '/v1/orders'
            data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            state['calls'].append(data)
            if state['failure']:
                return self.reply(401, {'error': {'code': 'BAD_REQUEST_ERROR', 'description': 'Authentication failed'}})
            self.reply(200, {**data, 'id': 'order_' + uuid.uuid4().hex})
        def do_GET(self):
            payment_id = self.path.rsplit('/', 1)[-1]
            self.reply(200, state['payments'][payment_id])
    http = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=http.serve_forever, daemon=True)
    thread.start()
    client = razorpay.Client(auth=('rzp_test_localQA', 'local-test-secret'))
    client.base_url = f'http://127.0.0.1:{http.server_port}'
    monkeypatch.setattr(server, 'razorpay_client', client)
    yield state
    http.shutdown()
    http.server_close()
    thread.join()


def order_body(items):
    return dict(customer_name='Test Buyer', customer_email='qa@example.com', customer_phone='9000000000',
                shipping_address='Test address only', shipping_city='Test', shipping_state='Test', shipping_pin='123456',
                request_id=uuid.uuid4().hex, items=items, total_amount=1)


def test_all_inventory_quiz_paths_and_missing_attributes():
    raw = json.loads((ROOT / 'qa-before-products.json').read_text(encoding='utf-8'))
    raw += [{'slug': 'missing', 'sizes': [{'size': '20ml', 'price': 1750}]},
            {'slug': 'inactive', 'is_active': False}, {'slug': 'out', 'in_stock': False}]
    products = inventory(raw)
    assert not {'inactive', 'out'} & {p['slug'] for p in products}
    paths = 0
    def walk(remaining, answers, depth):
        nonlocal paths
        if depth == len(STEPS):
            assert matching(products, answers)
            paths += 1
            return
        step = STEPS[depth]
        options = choices(remaining, step)
        assert options
        for option in options:
            if option['count'] == 0:
                continue
            next_answers = {**answers, step: option['value']}
            matches = matching(products, next_answers)
            assert len(matches) == option['count'] > 0
            walk(matches, next_answers, depth + 1)
    walk(products, {}, 0)
    assert paths > 0


def test_occasion_is_first_and_filters_later_choices():
    products = inventory([
        {'slug': 'wedding', 'occasions': ['Wedding'], 'notes': {'heart': ['Amber']}, 'projection': 'Moderate',
         'sizes': [{'size': '20ml', 'price': 1000}]},
        {'slug': 'daily', 'occasions': ['Daily Wear'], 'notes': {'heart': ['Citrus']}, 'projection': 'Soft',
         'sizes': [{'size': '20ml', 'price': 1000}]},
    ])
    assert STEPS == ('occasion', 'note', 'projection', 'budget')
    occasion_options = {option['label']: option for option in choices(products, STEPS[0])}
    assert occasion_options['Wedding']['count'] == 1
    assert occasion_options['Party']['count'] == 0

    wedding_matches = matching(products, {'occasion': 'Wedding'})
    assert [option['label'] for option in choices(wedding_matches, 'note')] == ['Amber']
    assert matching(wedding_matches, {'note': 'Amber'}) == wedding_matches


def test_catalogue_quiz_filters_and_recommendations_use_real_attributes():
    raw = json.loads((ROOT / 'qa-before-products.json').read_text(encoding='utf-8'))
    products = inventory(raw)
    wedding = matching(products, {'occasion': 'Wedding'})
    daily = matching(products, {'occasion': 'Daily Wear'})
    assert wedding and daily
    assert {p['slug'] for p in wedding} != {p['slug'] for p in daily}

    wedding_notes = choices(wedding, 'note')
    assert len(wedding_notes) <= 12
    assert {'Amber', 'Rose', 'Agarwood', 'Oud'} <= {option['label'] for option in wedding_notes}
    assert 'Fresh' in {option['label'] for option in choices(daily, 'note')}
    actual_wedding_notes = {
        str(note).casefold()
        for product in wedding
        for level in product['notes'].values()
        for note in level
    }
    actual_wedding_notes.update(
        str(family).casefold() for product in wedding for family in product['scent_family']
    )
    assert all(option['label'].casefold() in actual_wedding_notes for option in wedding_notes)

    amber_wedding = matching(wedding, {'note': 'Amber'})
    assert amber_wedding and len(amber_wedding) < len(wedding)
    assert all(any(str(note).casefold() == 'amber' for level in product['notes'].values() for note in level)
               for product in amber_wedding)
    amber_daily = matching(daily, {'note': 'Amber'})
    common_projection = next(
        option['value'] for option in choices(amber_wedding, 'projection')
        if option['count'] and any(
            other['value'] == option['value'] and other['count']
            for other in choices(amber_daily, 'projection')
        )
    )
    budget = 649
    wedding_results = recommendations(products, {
        'occasion': 'Wedding', 'note': 'Amber', 'projection': common_projection, 'budget': budget,
    })
    daily_results = recommendations(products, {
        'occasion': 'Daily Wear', 'note': 'Amber', 'projection': common_projection, 'budget': budget,
    })
    assert wedding_results and daily_results
    assert {p['slug'] for p in wedding_results} != {p['slug'] for p in daily_results}
    for product in wedding_results + daily_results:
        match = product['quiz_match']
        assert match['price'] <= budget
        assert any(size['size'] == match['size'] and size['price'] == match['price']
                   for size in product['sizes'])
        assert any(reason.startswith('Tagged for ') for reason in match['reasons'])
        assert any('Amber' in reason for reason in match['reasons'])


def test_quiz_api_and_stale_path(api):
    client, _ = api
    answers = {}
    for step in STEPS:
        response = client.post('/api/quiz/options', json={**answers, 'flow': 'legacy'}).json()
        assert response['step'] == step
        answers[step] = next(option['value'] for option in response['options'] if option['count'] > 0)
    result = client.post('/api/quiz/recommend', json={**answers, 'flow': 'legacy'}).json()
    assert result['items'] and result['items'][0]['quiz_match']['reasons']
    product = result['items'][0]
    if product.get('scent_family') and product.get('gender'):
        legacy = client.post('/api/quiz/recommend', json={
            'occasion': answers['occasion'],
            'scent': product['scent_family'][0],
            'projection': product['projection'],
            'budget': max(size['price'] for size in product['sizes']),
            'gender': product['gender'],
        })
        assert legacy.status_code == 200
    assert client.post('/api/quiz/options', json={'occasion': 'nonexistent', 'flow': 'legacy'}).json()['options'] == []
    assert client.post('/api/quiz/recommend', json={}).status_code == 422


def test_offer_prices_admin_auth_validation_and_cart(api):
    client, db = api
    assert client.get('/api/admin/offer-prices').status_code == 401
    assert client.put('/api/admin/offer-prices', json={'prices': {}}).status_code == 401
    token = client.post('/api/auth/login', json={'email': 'qa@example.com', 'password': 'local-test-password'}).json()['token']
    headers = {'Authorization': 'Bearer ' + token}
    offers = client.get('/api/admin/offer-prices', headers=headers).json()['items']
    prices = {o['slug']: o['price'] for o in offers}
    assert [prices[s] for s in ('special-5-20ml', 'special-3-50ml', 'special-2-100ml')] == [2149, 3099, 3199]
    assert 'special-4-30ml' not in prices
    assert all(o['price'] == 899 for o in offers if o.get('curated'))
    for invalid in (0, -1, 1.5, True, '899'):
        assert client.put('/api/admin/offer-prices', headers=headers, json={'prices': {**prices, 'oud-discovery': invalid}}).status_code == 422
    assert client.put('/api/admin/offer-prices', headers=headers, json={'prices': {**prices, 'special-4-30ml': 1}}).status_code == 422
    updated = {**prices, 'oud-discovery': 999, 'special-5-20ml': 2222}
    assert client.put('/api/admin/offer-prices', headers=headers, json={'prices': updated}).status_code == 200
    assert db.settings.find_one({'key': 'offer_prices'})['prices'] == updated
    assert next(x for x in client.get('/api/discovery-sets').json()['items'] if x['slug'] == 'oud-discovery')['price'] == 999
    product = db.products.find_one({'is_active': {'$ne': False}, 'in_stock': {'$ne': False}})
    item = {'slug': 'special-5-20ml', 'size': '20ml', 'qty': 1, 'price': 1, 'selections': [product['slug']] * 5}
    quoted = client.post('/api/cart/quote', json={'items': [item]})
    assert quoted.status_code == 200, quoted.text
    assert quoted.json()['subtotal_amount'] == 222200
    for bad in ({**item, 'selections': []}, {**item, 'selections': ['missing'] * 5}, {**item, 'size': '30ml'}, {**item, 'slug': 'special-4-30ml'}):
        assert client.post('/api/cart/quote', json={'items': [bad]}).status_code == 400
    client.put('/api/admin/offer-prices', headers=headers, json={'prices': prices})


def test_order_gateway_verification_and_replay(api, gateway):
    client, db = api
    product = db.products.find_one({'is_active': {'$ne': False}, 'in_stock': {'$ne': False}})
    body = order_body([{'slug': 'oud-discovery', 'size': '8ml', 'qty': 2, 'price': 1},
                       {'slug': 'special-3-50ml', 'size': '50ml', 'qty': 1, 'selections': [product['slug']] * 3}])
    created = client.post('/api/orders', json=body)
    assert created.status_code == 200, created.text
    order = created.json()
    assert order['subtotal_amount'] == (899 * 2 + 3099) * 100
    assert gateway['calls'][0]['amount'] == order['total_amount']
    assert client.post('/api/orders', json=body).json()['order_id'] == order['order_id']
    assert len(gateway['calls']) == 1
    pid = 'pay_test'
    signature = hmac.new(b'local-test-secret', f"{order['razorpay_order_id']}|{pid}".encode(), hashlib.sha256).hexdigest()
    verification = dict(razorpay_order_id=order['razorpay_order_id'], razorpay_payment_id=pid, razorpay_signature=signature)
    assert client.post('/api/orders/verify-payment', json={**verification, 'razorpay_signature': 'forged'}).status_code == 400
    payment = dict(order_id=order['razorpay_order_id'], amount=order['total_amount'], currency='INR', status='captured')
    for wrong in ({'amount': 1}, {'currency': 'USD'}, {'status': 'authorized'}, {'order_id': 'wrong'}):
        gateway['payments'][pid] = {**payment, **wrong}
        assert client.post('/api/orders/verify-payment', json=verification).status_code == 400
        assert db.orders.find_one({'order_id': order['order_id']})['payment_status'] == 'pending'
    gateway['payments'][pid] = payment
    assert client.post('/api/orders/verify-payment', json=verification).status_code == 200
    assert db.orders.find_one({'order_id': order['order_id']})['payment_status'] == 'paid'
    assert client.post('/api/orders/verify-payment', json=verification).json()['already_verified']


def test_missing_mismatched_and_rejected_credentials(api, gateway, monkeypatch):
    client, db = api
    body = order_body([{'slug': 'oud-discovery', 'size': '8ml', 'qty': 1}])
    before = db.orders.count_documents({})
    monkeypatch.setenv('RAZORPAY_KEY_SECRET', '')
    assert client.post('/api/orders', json=body).status_code == 503
    assert not server.verify_razorpay_signature('a', 'b', 'c')
    monkeypatch.setenv('RAZORPAY_KEY_SECRET', 'local-test-secret')
    monkeypatch.setenv('RAZORPAY_MODE', 'live')
    assert client.post('/api/orders', json=body).status_code == 503
    monkeypatch.setenv('RAZORPAY_MODE', 'test')
    gateway['failure'] = True
    assert client.post('/api/orders', json=body).status_code == 503
    assert len(gateway['calls']) == 1
    assert db.orders.count_documents({}) == before


def test_seven_rejections_reproduce_without_import():
    for filename, valid in [('JLT_Fragrances_List.xlsx', 804), ('JLT_Final_List.xlsx', 805)]:
        source = ROOT.parent / filename
        if not source.exists():
            pytest.skip('Original workbooks are not in this checkout')
        result = server.parse_import_workbook(source.read_bytes(), legacy_mapping=True)
        assert result['valid_rows'] == valid
        rejected = [r for r in result['rows'] if r['action'] == 'REJECT']
        assert [r['source_row'] for r in rejected] == [582, 584, 588, 594, 750, 752, 796]
        assert all(r['validation_message'].startswith('Duplicate spreadsheet identifier:') for r in rejected)


def test_every_offer_accepts_search_selections_through_order(api, gateway):
    client, db = api
    product = db.products.find_one({'is_active': {'$ne': False}, 'in_stock': {'$ne': False}})
    combos = client.get('/api/combos').json()
    offers = combos['tester_combos'] + combos['special_offers'] + client.get('/api/discovery-sets').json()['items']
    for offer in offers:
        item = dict(slug=offer['slug'], size=offer['size'], qty=1, selections=[product['slug']] * offer['items'])
        quote = client.post('/api/cart/quote', json={'items': [item]})
        assert quote.status_code == 200, quote.text
        assert len(quote.json()['items'][0]['selected_products']) == offer['items']
        created = client.post('/api/orders', json=order_body([item]))
        assert created.status_code == 200, created.text
        stored = db.orders.find_one({'order_id': created.json()['order_id']})
        assert stored['items'][0]['selections'] == item['selections']
        assert stored['total_amount'] == quote.json()['total_amount']
        for invalid in ([product['slug']], ['unavailable-fragrance'] * offer['items']):
            assert client.post('/api/cart/quote', json={'items': [{**item, 'selections': invalid}]}).status_code == 400


@pytest.mark.parametrize('failure', [server.PaymentConnectionError, server.PaymentTimeout])
def test_order_provider_network_failure_is_recoverable(api, gateway, monkeypatch, failure):
    client, db = api
    body = order_body([{'slug': 'oud-discovery', 'size': '8ml', 'qty': 1}])
    before = db.orders.count_documents({})
    original_create = server.razorpay_client.order.create
    def unavailable(*args, **kwargs):
        raise failure('simulated transport failure')
    monkeypatch.setattr(server.razorpay_client.order, 'create', unavailable)
    response = client.post('/api/orders', json=body)
    assert response.status_code == 503
    assert 'Unable to connect to the payment provider' in response.json()['detail']
    assert db.orders.count_documents({}) == before
    monkeypatch.setattr(server.razorpay_client.order, 'create', original_create)
    retried = client.post('/api/orders', json=body)
    assert retried.status_code == 200, retried.text
    assert db.orders.count_documents({}) == before + 1
    assert len(gateway['calls']) == 1
