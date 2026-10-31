"""Pure catalogue tests; no product writes or external requests."""
import copy
import json
import sys
from pathlib import Path
import pytest
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
import quick_quiz as quiz
from quiz import inventory


def product(slug='sample', **extra):
    return {'slug': slug, 'name': slug, 'notes': {'top':['Bergamot'], 'heart':['Rose'], 'base':['Musk']},
            'scent_family': [], 'occasions':['Daily Wear'], 'projection':'Moderate', 'gender':'Unisex',
            'sizes':[{'size':'20ml','price':449}, {'size':'50ml','price':1099}], **extra}


def answers(**extra):
    return {'family':'fresh','occasion':'everyday','intensity':'balanced','audience':'unisex','spend':'under500', **extra}


def test_groups_use_explicit_metadata_and_do_not_mutate():
    p=product(); before=copy.deepcopy(p)
    assert set(quiz.groups(p)) == {'fresh','floral','clean'}
    assert quiz.groups(product(notes={}, scent_family=[])) == {}
    assert quiz.groups(product(notes={'base':['Oud','Amber','Vanilla','Cedarwood']})).keys() >= {'warm','sweet','woody'}
    quiz.recommend(inventory([p]), answers())
    assert p == before


def test_stock_and_real_variant_budget_and_exact_labels():
    products=inventory([product(), product('inactive',is_active=False), product('out',in_stock=False),
                        product('no-size',sizes=[{'size':'20ml','price':449,'in_stock':False}])])
    assert len(products)==1
    result=quiz.recommend(products, answers(spend='1000to1999'))['items'][0]
    assert result['quiz_match']['size']=='50ml'
    assert result['quiz_match']['price']==1099
    assert result['quiz_match']['exact']
    result=quiz.recommend(products,answers(spend='2000plus'))['items'][0]['quiz_match']
    assert not result['exact'] and not result['budget_match']
    assert 'Below your selected price range' in result['differences']


def test_weights_rank_family_and_label_alternatives_without_overbudget_fill():
    products=inventory([product('exact'), product('same-family', occasions=['Office']),
                        product('different',notes={'base':['Oud']}),
                        product('expensive',sizes=[{'size':'100ml','price':2200}])])
    results=quiz.recommend(products,answers())['items']
    assert results[0]['slug']=='exact'
    assert results[1]['slug']=='same-family'
    assert not results[1]['quiz_match']['exact']
    assert all(p['quiz_match']['price']<500 for p in results)
    assert 'expensive' not in [p['slug'] for p in results]


def test_no_affordable_product_is_explicit_alternative():
    p=inventory([product(sizes=[{'size':'20ml','price':649}])])
    match=quiz.recommend(p,answers())['items'][0]['quiz_match']
    assert not match['exact']
    assert 'Above your budget' in match['differences']


def test_missing_attributes_are_not_claimed_and_wildcards_work():
    p=inventory([product(notes={},occasions=[],projection='',gender='')])
    result=quiz.recommend(p,answers())
    assert result['items'] and result['alternatives']
    assert not result['items'][0]['quiz_match']['reasons']
    assert quiz.validate(answers(occasion='any',intensity='any',audience='any',spend='any'))
    assert not quiz.validate(answers(family='invented'))


def test_real_catalogue_all_choices_are_bounded_and_can_finish():
    raw=json.loads((ROOT/'qa-before-products.json').read_text(encoding='utf-8'))
    before=copy.deepcopy(raw)
    products=inventory(raw)
    assert len(quiz.options(products,{})['options'])<=6
    for family in quiz.options(products,{})['options']:
        a={'family':family['value']}
        for field in quiz.STEPS[1:]:
            result=quiz.options(products,a)
            assert result['step']==field and 1<=len(result['options'])<=6
            a[field]=next(o['value'] for o in result['options'] if o['value']!='any') if any(o['value']!='any' for o in result['options']) else 'any'
        result=quiz.recommend(products,a)
        assert 1<=len(result['items'])<=6
        for p in result['items']:
            assert p['quiz_match']['price'] in [s['price'] for s in p['sizes']]
            if p['quiz_match']['exact']:
                assert all(quiz.matches(p,f,v) for f,v in a.items())
    assert raw==before
