"""Mood classification and real FastAPI route tests; read-only catalogue fixtures."""
import copy
import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
os.environ.setdefault('MONGO_URL','mongodb://127.0.0.1:27017')
os.environ.setdefault('DB_NAME','jlt_mood_test_unused')
from discovery import normalized, mood_score, matches, MOOD_RULES, mood_available
import server


def product(slug,**fields):
    return {'slug':slug,'name':slug,'brand_inspiration':'Test','is_active':True,'in_stock':True,
            'sizes':[{'size':'20ml','price':449}],'moods':[],'scent_family':[],'notes':{},**fields}


@pytest.mark.parametrize('mood,notes',[('Fresh',['Bergamot','Lemon']),('Sweet',['Vanilla','Honey']),('Oud',['Agarwood']),
    ('Floral',['Rose','Jasmine']),('Clean',['Fresh Linen']),('Spicy',['Pink Pepper','Saffron']),('Musky',['White Musk'])])
def test_all_moods_match_related_notes_case_insensitively(mood,notes):
    p=product('x',notes={'top':[n.upper() for n in notes]})
    assert mood_score(p,' '+mood.lower()+' ')==100
    assert matches(normalized(p),{'mood':[mood]})


def test_multicategory_ranking_and_no_unrelated_oud():
    p=product('x',notes={'heart':['Rose','Jasmine'],'base':['Musk']})
    before=copy.deepcopy(p)
    assert mood_score(p,'Floral') and mood_score(p,'Musky')
    assert not mood_score(p,'Oud')
    assert not mood_score(product('no',scent_family=['Woody','Amber','Oriental'],description='A cloud of luxury'),'Oud')
    assert not mood_score(product('negative',description='No oud or rose notes'),'Oud')
    assert not mood_score(product('token',notes={'base':['Amberwood','Cloudberry']}),'Oud')
    assert mood_score(product('yes',scent_family=['Woody'],base_notes=['Oud']),'Oud')==100
    assert mood_score(product('exact',moods=['Floral']),'Floral')==300
    assert mood_score(product('family',scent_family=['White Floral']),'Floral')==200
    assert p==before


@pytest.mark.parametrize('fields',[{'is_active':False},{'in_stock':False},{'sizes':[]},
    {'sizes':[{'size':'20ml','price':449,'in_stock':False}]},{'sizes':[{'size':'20ml','price':float('nan')}]},
    {'sizes':[{'size':'20ml','price':0}]}])
def test_unavailable_excluded(fields):
    p=normalized(product('out',moods=['Fresh'],**fields))
    assert not matches(p,{'mood':['Fresh']})


@pytest.fixture
def api(monkeypatch):
    class Cursor:
        def __init__(self,products): self.products=products
        async def to_list(self,limit): return copy.deepcopy(self.products)
    class Products:
        rows=[]
        def find(self,*args): return Cursor([p for p in self.rows if p.get('is_active') is not False])
    products=Products()
    monkeypatch.setattr(server,'db',SimpleNamespace(products=products))
    # No lifespan means no DB indexes, workers, seeding or network calls.
    return TestClient(server.app),products


def test_ranking_counts_pagination_and_combined_filters(api):
    client,store=api
    store.rows=[product('notes',notes={'heart':['Rose']},rating=5),
                product('family',scent_family=['White Floral'],sizes=[{'size':'50ml','price':1099}]),
                product('exact',moods=['Floral'],sizes=[{'size':'20ml','price':649}]),
                product('unrelated',scent_family=['Woody']),product('inactive',moods=['Floral'],is_active=False),
                product('out',moods=['Floral'],in_stock=False)]
    first=client.get('/api/products?mood=Floral&limit=1').json()
    assert first['total']==3 and first['items'][0]['slug']=='exact'
    assert client.get('/api/products?mood=Floral&limit=1&page=2').json()['items'][0]['slug']=='family'
    assert client.get('/api/products?mood=Floral&limit=1&page=3').json()['items'][0]['slug']=='notes'
    low=client.get('/api/products?mood=Floral&sort=price_asc').json()
    assert [p['slug'] for p in low['items']]==['notes','exact','family']
    assert client.get('/api/products?mood=Floral&q=notes').json()['total']==1
    assert client.get('/api/products?mood=Floral&size=50ml&max_price=1200').json()['total']==1
    assert client.get('/api/products?mood=Floral&brand=Unrelated').json()['total']==0
    assert client.get('/api/products?mood=Floral&sort=rating').json()['items'][0]['slug']=='notes'
    assert client.get('/api/products?mood=Floral&mood=Oud').json()['total']==3
    filters=client.get('/api/products/filters').json()
    assert 'Floral' in filters['moods'] and filters['mood_counts']['Floral']==3


def test_available_size_is_used_for_matching_and_sorting(api):
    client,store=api
    store.rows=[product('mixed',moods=['Fresh'],sizes=[{'size':'20ml','price':100,'in_stock':False},{'size':'50ml','price':800}]),
                product('normal',moods=['Fresh'])]
    assert client.get('/api/products?mood=Fresh&size=20ml&max_price=200').json()['total']==0
    assert client.get('/api/products?mood=Fresh&sort=price_asc').json()['items'][0]['slug']=='normal'
    assert client.get('/api/products?mood=Fresh&size=50ml').json()['total']==1


def test_full_catalogue_counts_pagination_and_metadata_preserved(api):
    client,store=api
    store.rows=json.loads((ROOT/'qa-before-products.json').read_text(encoding='utf-8'))
    before=copy.deepcopy(store.rows)
    for mood in MOOD_RULES:
        expected={p['slug'] for p in store.rows if mood_available(p) and mood_score(p,mood)}
        assert expected
        first=client.get('/api/products',params={'mood':mood,'limit':120}).json()
        assert first['total']==len(expected)
        actual={p['slug'] for p in first['items']}
        for page in range(2,(len(expected)+119)//120+1):
            result=client.get('/api/products',params={'mood':mood,'limit':120,'page':page}).json()
            assert result['total']==len(expected)
            actual.update(p['slug'] for p in result['items'])
        assert actual==expected
        assert client.get('/api/products/filters').json()['mood_counts'][mood]==len(expected)
    assert store.rows==before
