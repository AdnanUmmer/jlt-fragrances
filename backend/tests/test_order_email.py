"""Disposable local MongoDB; payment and SMTP integrations are mocked. No mail leaves."""
import asyncio
import hashlib
import hmac
import json
import os
import sys
import uuid
from datetime import timedelta
from pathlib import Path
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.update(MONGO_URL='mongodb://127.0.0.1:27017', DB_NAME='jlt_email_test_import', APP_ENV='test',
                  ADMIN_EMAIL='qa@example.com',ADMIN_PASSWORD='local-test-password',JWT_SECRET='test-key-not-for-production-32-chars',
                  RAZORPAY_KEY_ID='rzp_test_localQA',RAZORPAY_KEY_SECRET='test-secret',RAZORPAY_MODE='test',ORDER_EMAIL_ENABLED='false',ENABLE_DEV_ADMIN='false')
import server
import order_email


@pytest.fixture
def env(monkeypatch):
    name='jlt_email_test_'+uuid.uuid4().hex
    client=AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    sync=MongoClient('mongodb://127.0.0.1:27017',serverSelectionTimeoutMS=2000)
    monkeypatch.setattr(server,'db',client[name]); monkeypatch.setattr(server,'client',client)
    for k,v in {'APP_ENV':'test','ORDER_EMAIL_ENABLED':'false','ENABLE_DEV_ADMIN':'false','ADMIN_EMAIL':'qa@example.com','ADMIN_PASSWORD':'local-test-password',
                'RAZORPAY_KEY_ID':'rzp_test_localQA','RAZORPAY_KEY_SECRET':'test-secret','RAZORPAY_MODE':'test','RAZORPAY_WEBHOOK_SECRET':'webhook-test-secret',
                'SMTP_HOST':'smtp.example.test','SMTP_PORT':'587','SMTP_USER':'test','SMTP_PASSWORD':'not-a-real-password',
                'EMAIL_FROM':'JLT <sender@example.test>','EMAIL_TO':'owner@example.test'}.items(): monkeypatch.setenv(k,v)
    sdk=MagicMock()
    sdk.order.create.side_effect=lambda **kwargs: {'id':'order_'+uuid.uuid4().hex, **kwargs['data']}
    monkeypatch.setattr(server,'razorpay_client',sdk)
    async def noop(*args): return True
    monkeypatch.setattr(server,'send_telegram_notification',noop)
    smtp=MagicMock()
    smtp.send_message.return_value={}
    monkeypatch.setattr(order_email.smtplib,'SMTP',lambda *a,**k: smtp)
    monkeypatch.setattr(order_email.smtplib,'SMTP_SSL',lambda *a,**k: smtp)
    sync[name].products.insert_one({'slug':'rose','name':'Rose <Special>','brand_inspiration':'Test & Co', 'is_active':True,'in_stock':True,
                                  'sizes':[{'size':'20ml','price':449},{'size':'50ml','price':1099},{'size':'100ml','price':1699}]})
    with TestClient(server.app) as api:
        yield api,sync[name],sdk,smtp
    assert name.startswith('jlt_email_test_')
    sync.drop_database(name);sync.close()


def create(env, slug='rose', size='20ml', selections=None):
    api,db,sdk,smtp=env
    body=dict(customer_name='Test Buyer',customer_email='qa@example.com',customer_phone='9000000000',
              shipping_address='10 Test Street',shipping_city='Kochi',shipping_state='Kerala',shipping_pin='682001',
              request_id=uuid.uuid4().hex,items=[dict(slug=slug,size=size,qty=2,selections=selections or [])])
    response=api.post('/api/orders',json=body); assert response.status_code==200,response.text
    order=response.json(); pid='pay_'+uuid.uuid4().hex
    sdk.payment.fetch.return_value=dict(id=pid,order_id=order['razorpay_order_id'],amount=order['total_amount'],currency='INR',status='captured')
    signature=hmac.new(b'test-secret',f"{order['razorpay_order_id']}|{pid}".encode(),hashlib.sha256).hexdigest()
    payload=dict(razorpay_order_id=order['razorpay_order_id'],razorpay_payment_id=pid,razorpay_signature=signature)
    return order,payload


def deliver(env):
    return env[0].portal.call(order_email.deliver_one,server.db)


def test_verified_payment_one_complete_email_and_replay(env):
    api,db,sdk,smtp=env;order,payload=create(env)
    assert not deliver(env)
    assert api.post('/api/orders/verify-payment',json=payload).status_code==200
    assert api.post('/api/orders/verify-payment',json=payload).json()['already_verified']
    assert deliver(env) and not deliver(env)
    assert smtp.send_message.call_count==1
    mail=smtp.send_message.call_args.args[0]
    plain=mail.get_body(preferencelist=('plain',)).get_content()
    rich=mail.get_body(preferencelist=('html',)).get_content()
    for value in ('Test Buyer','qa@example.com','9000000000','10 Test Street','Kochi','Kerala','682001','20ml','₹449.00','₹898.00','IST','Subtotal','Shipping','Razorpay','confirmed'):
        assert value in plain
    assert 'Rose &lt;Special&gt;' in rich
    assert 'Rose <Special>' not in rich
    assert 'New JLT Order Confirmed' in str(mail['Subject'])
    assert db.orders.find_one({'order_id':order['order_id']})['order_email']['status']=='sent'


@pytest.mark.parametrize('invalid', ['signature','failed','authorized','amount','currency'])
def test_invalid_or_failed_payment_sends_nothing(env,invalid):
    api,db,sdk,smtp=env;order,payload=create(env)
    if invalid=='signature': payload['razorpay_signature']='invalid'
    elif invalid=='amount': sdk.payment.fetch.return_value['amount']=1
    elif invalid=='currency': sdk.payment.fetch.return_value['currency']='USD'
    else: sdk.payment.fetch.return_value['status']=invalid
    assert api.post('/api/orders/verify-payment',json=payload).status_code==400
    assert not deliver(env)
    assert not smtp.send_message.called
    assert db.orders.find_one({'order_id':order['order_id']})['payment_status']=='pending'


@pytest.mark.parametrize('slug,size,count',[('oud-discovery','8ml',5),('tester-3-8ml','8ml',3),('special-3-50ml','50ml',3)])
def test_sets_and_bundles_include_every_selection(env,slug,size,count):
    api,db,sdk,smtp=env;order,payload=create(env,slug,size,['rose']*count)
    assert api.post('/api/orders/verify-payment',json=payload).status_code==200
    assert deliver(env)
    plain=smtp.send_message.call_args.args[0].get_body(preferencelist=('plain',)).get_content()
    assert plain.count('Rose <Special> — Test & Co — '+size)==count
    assert 'Qty: 2' in plain


def test_provider_temporary_failure_retries_without_failing_payment(env):
    api,db,sdk,smtp=env;order,payload=create(env)
    smtp.send_message.side_effect=[order_email.smtplib.SMTPDataError(451,b'temporary'),{}]
    assert api.post('/api/orders/verify-payment',json=payload).status_code==200
    assert deliver(env)
    stored=db.orders.find_one({'order_id':order['order_id']})
    assert stored['payment_status']=='paid' and stored['order_email']['status']=='retry'
    assert not deliver(env)
    db.orders.update_one({'order_id':order['order_id']},{'$set':{'order_email.next_attempt_at':order_email.utcnow()-timedelta(seconds=1)}})
    assert deliver(env)
    assert db.orders.find_one({'order_id':order['order_id']})['order_email']['status']=='sent'
    assert smtp.send_message.call_count==2


def test_webhook_then_callback_and_duplicate_event_only_one_notification(env):
    api,db,sdk,smtp=env;order,payload=create(env)
    data={'event':'payment.captured','payload':{'payment':{'entity':sdk.payment.fetch.return_value}}}
    raw=json.dumps(data).encode()
    signature=hmac.new(b'webhook-test-secret',raw,hashlib.sha256).hexdigest()
    assert api.post('/api/webhooks/razorpay',content=raw,headers={'X-Razorpay-Signature':'bad'}).status_code==400
    for _ in range(2):
        assert api.post('/api/webhooks/razorpay',content=raw,headers={'X-Razorpay-Signature':signature}).status_code==200
    assert api.post('/api/orders/verify-payment',json=payload).json()['already_verified']
    assert deliver(env) and not deliver(env)
    assert smtp.send_message.call_count==1


def test_concurrent_workers_and_uncertain_delivery(env):
    api,db,sdk,smtp=env;order,payload=create(env)
    api.post('/api/orders/verify-payment',json=payload)
    smtp.send_message.side_effect=order_email.smtplib.SMTPServerDisconnected('ambiguous')
    async def two(): return await asyncio.gather(order_email.deliver_one(server.db),order_email.deliver_one(server.db))
    assert sorted(api.portal.call(two))==[False,True]
    assert db.orders.find_one({'order_id':order['order_id']})['order_email']['status']=='uncertain'
    assert not deliver(env)
    assert smtp.send_message.call_count==1


def test_unknown_events_do_not_confirm_order(env):
    api,db,sdk,smtp=env;order,payload=create(env)
    raw=json.dumps({'event':'payment.failed'}).encode()
    signature=hmac.new(b'webhook-test-secret',raw,hashlib.sha256).hexdigest()
    assert api.post('/api/webhooks/razorpay',content=raw,headers={'X-Razorpay-Signature':signature}).json()['ignored']
    assert not deliver(env)
