import copy
import io
import json
import os
import sys
import uuid
from pathlib import Path
import pytest
from pymongo import MongoClient
from fastapi.testclient import TestClient
from openpyxl import Workbook

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
DB='jlt_qa_test_'+uuid.uuid4().hex
os.environ.update(MONGO_URL='mongodb://127.0.0.1:27017',DB_NAME=DB,ADMIN_EMAIL='qa@example.com',ADMIN_PASSWORD='test-only-password',
    JWT_SECRET='qa-test-signing-key-with-at-least-32-characters',APP_ENV='development',ENABLE_DEV_ADMIN='true',
    DEV_ADMIN_USERNAME='admin',DEV_ADMIN_PASSWORD='admin',DEV_ADMIN_EMAIL='qa-dev@example.com',RAZORPAY_KEY_ID='test',RAZORPAY_KEY_SECRET='test')
from discovery import normalized,matches,filter_options,blank_metadata_patch
import server

@pytest.fixture(scope='module')
def api():
    c=MongoClient(os.environ['MONGO_URL']); db=c[DB]
    fixtures=json.loads((ROOT/'qa-before-products.json').read_text(encoding='utf-8'))
    db.products.insert_many(copy.deepcopy(fixtures))
    archived=copy.deepcopy(fixtures[0]);archived['slug']='archived-only';archived['brand_inspiration']='Archived Unique Brand';archived['is_active']=False
    db.products.insert_one(archived)
    with TestClient(server.app) as client:yield client
    assert DB.startswith('jlt_qa_test_'); c.drop_database(DB);c.close()

@pytest.fixture
def auth(api):
    r=api.post('/api/auth/login',json={'username':'admin','password':'admin'});assert r.status_code==200,r.text
    return {'Authorization':'Bearer '+r.json()['token']}

def test_login_and_protected_admin(api,auth):
    assert api.post('/api/auth/login',json={'username':'admin','password':'wrong'}).status_code==401
    assert api.get('/api/auth/me',headers=auth).status_code==200
    assert api.get('/api/admin/pricing-defaults').status_code==401
    assert api.post('/api/admin/products',json={}).status_code==401
    assert api.get('/api/products').json()['total']==804

def test_all_dynamic_options_have_matches(api):
    opts=api.get('/api/products/filters').json()
    mapping={'brands':'brand','categories':'category','tiers':'tier','scent_families':'scent','notes':'note','occasions':'occasion','seasons':'season','moods':'mood','sizes':'size','genders':'gender','longevity':'longevity','projection':'projection'}
    assert 'Archived Unique Brand' not in opts['brands']
    for field,param in mapping.items():
        for value in opts[field]:
            response=api.get('/api/products',params={param:value,'limit':1})
            assert response.status_code==200 and response.json()['total']>0,(param,value,response.text)

def test_combined_or_and_normalization(api):
    rows=api.get('/api/products',params=[('brand','Creed'),('note','Vanilla'),('note','Bergamot'),('max_price','1200'),('limit','120')]).json()
    assert rows['total']>0
    for p in rows['items']:
        assert p['brand_inspiration']=='Creed'
        assert {'vanilla','bergamot'} & {v.lower() for part in p['notes'].values() for v in part}
        assert any(s['price']<=1200 for s in p['sizes'])
    assert api.get('/api/products?brand=%20creed%20').json()['total']==api.get('/api/products?brand=Creed').json()['total']
    assert api.get('/api/products?size=100ml&max_price=1200').json()['total']==0
    assert api.get('/api/products?min_price=2000&max_price=1000').status_code==422

def test_search_pagination_and_archives(api):
    assert api.get('/api/products?q=refined%20fragrance').json()['total']>0
    assert api.get('/api/products?q=%5B').status_code==200
    a=api.get('/api/products?limit=20&page=1').json()['items'];b=api.get('/api/products?limit=20&page=2').json()['items']
    assert len(a)==20 and len(b)==20 and not({p['slug'] for p in a}&{p['slug'] for p in b})
    assert api.get('/api/products/archived-only').status_code==404
    related=api.get('/api/products/'+a[0]['slug']).json()['related'];assert all(p.get('is_active') is not False for p in related)

def test_missing_fields_and_conservative_derivation():
    p=normalized({'notes':{'top':' Bergamot, Lemon; Mandarin ','middle':['White Musk, Iris']},'scent_family':None,'sizes':[{'size':'20ml','price':449}]})
    assert p['notes']['top']==['Bergamot','Lemon','Mandarin']
    assert p['notes']['heart']==['White Musk','Iris']
    assert matches(p,{'note':[' lemon ']})
    assert blank_metadata_patch(p)=={'scent_family':['Citrus','Floral','Musky']}
    assert blank_metadata_patch({**p,'scent_family':['Existing']})=={}
    assert blank_metadata_patch({'notes':{},'sizes':[]})=={}

def test_metadata_audit_no_changes_needed():
    original=json.loads((ROOT/'qa-before-products.json').read_text(encoding='utf-8'))
    assert len(original)==804
    assert sum(bool(blank_metadata_patch(p)) for p in original)==0

def test_admin_crud_prices_and_archive_in_isolated_db(api,auth):
    p=api.get('/api/products?limit=1').json()['items'][0];p['name']='QA disposable product';p['description']='Description saved';p['sizes'][1]['price']=1234
    r=api.post('/api/admin/products',headers=auth,json=p);assert r.status_code==200,r.text
    slug=r.json()['product']['slug'];assert api.get('/api/products/'+slug).json()['product']['description']=='Description saved'
    p['name']='QA edited';p['sizes'][1]['price']=1235
    r=api.put('/api/admin/products/'+slug,headers=auth,json=p);assert r.status_code==200,r.text
    assert api.get('/api/products/'+slug).json()['product']['sizes'][1]['price']==1235
    assert api.delete('/api/admin/products/'+slug,headers=auth).status_code==200
    assert api.get('/api/products/'+slug).status_code==404
    assert api.get('/api/products').json()['total']==804

def test_excel_preview_only(api,auth):
    w=Workbook();w.active.append(['Name','Brand Inspiration','Category']);w.active.append(['QA preview','Test','Niche']);b=io.BytesIO();w.save(b)
    r=api.post('/api/admin/import/preview',headers=auth,files={'file':('qa.xlsx',b.getvalue())});assert r.status_code==200,r.text
    assert r.json()['valid_rows']==1
    assert api.get('/api/products').json()['total']==804

def test_order_prices_still_authoritative(api,monkeypatch):
    captured=[]
    def create(data):captured.append(data);return {'id':'order_qa_'+uuid.uuid4().hex}
    monkeypatch.setattr(server.razorpay_client.order,'create',create)
    p=api.get('/api/products?limit=1').json()['items'][0]
    for v in p['sizes']:
        r=api.post('/api/orders',json={'customer_name':'QA','customer_email':'qa@example.com','customer_phone':'9000000000','shipping_address':'Test only','shipping_city':'Test','shipping_state':'Test','shipping_pin':'123456','items':[{'slug':p['slug'],'name':'Forged','brand':'Forged','size':v['size'],'price':1,'qty':1}],'total_amount':1})
        assert r.status_code==200,r.text
        assert captured[-1]['amount']==(v['price']+(49 if v['price']<2000 else 99))*100

def test_order_request_id_is_idempotent_and_shipping_split(api,monkeypatch):
    captured=[]
    def create(data):captured.append(data);return {'id':'order_qa_'+uuid.uuid4().hex}
    monkeypatch.setattr(server.razorpay_client.order,'create',create)
    p=api.get('/api/products?limit=1').json()['items'][0];v=p['sizes'][0]
    body={'customer_name':'QA','customer_email':'qa@example.com','customer_phone':'9000000000','shipping_address':'Test only','shipping_city':'Test','shipping_state':'Test','shipping_pin':'123456','request_id':uuid.uuid4().hex,'items':[{'slug':p['slug'],'size':v['size'],'qty':1}]}
    a=api.post('/api/orders',json=body).json();b=api.post('/api/orders',json=body).json()
    assert a['order_id']==b['order_id'] and len(captured)==1
    assert a['subtotal_amount']+a['shipping_amount']==a['total_amount']

def test_discovery_contracts(api):
    combos=api.get('/api/combos').json();sets=api.get('/api/discovery-sets').json()['items']
    all_sets=combos['tester_combos']+combos['special_offers']+sets
    assert len(all_sets)==12 and len({s['slug'] for s in all_sets})==12
    assert all(s['title'] and s['subtitle'] and s['price']>0 and s['description'] for s in all_sets)
