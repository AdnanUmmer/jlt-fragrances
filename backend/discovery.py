"""Read-only normalization and filtering of the existing active catalogue.

No inventory, pricing, reviews, notes or factual performance claims are generated.
Both options and matching use this same representation (OR within, AND between).
"""
import copy
import re
import unicodedata


def key(value):
    return ' '.join(unicodedata.normalize('NFKC', str(value or '')).strip().casefold().split())


def values(value):
    if value is None:
        return []
    items = value if isinstance(value, (list, tuple)) else [value]
    result = {}
    for item in items:
        if isinstance(item, str):
            for token in re.split(r'[,;|]', item):
                token = ' '.join(token.split())
                if token:
                    result.setdefault(key(token), token)
    return list(result.values())


def normalized(p):
    p = copy.deepcopy(p)
    notes = p.get('notes') if isinstance(p.get('notes'), dict) else {}
    p['notes'] = {
        'top': values(notes.get('top') or p.get('top_notes')),
        'heart': values(notes.get('heart') or notes.get('middle') or p.get('heart_notes') or p.get('middle_notes')),
        'base': values(notes.get('base') or p.get('base_notes')),
    }
    for field in ('scent_family', 'moods', 'occasions', 'seasons', 'tags'):
        p[field] = values(p.get(field))
    p['sizes'] = [s for s in p.get('sizes', []) if isinstance(s, dict) and isinstance(s.get('price'), (int,float)) and s['price'] > 0]
    return p


def blank_metadata_patch(p):
    """Only derive a blank scent family from explicit, existing notes.

    Conservative deterministic browsing labels, not new perfume notes. All other
    blanks remain unknown rather than inferring occasion/intensity from a brand.
    """
    if values(p.get('scent_family')):
        return {}
    n = normalized(p)
    notes = {key(v) for part in n['notes'].values() for v in part}
    rules = {
        'Citrus': {'bergamot','lemon','lime','orange','mandarin','mandarin orange','grapefruit'},
        'Floral': {'rose','jasmine','iris','violet','tuberose','orange blossom','ylang-ylang'},
        'Woody': {'sandalwood','cedar','cedarwood','vetiver','patchouli'},
        'Musky': {'musk','white musk','musk accord'},
        'Sweet': {'vanilla','caramel','honey','tonka bean'},
        'Oud': {'oud','agarwood'},
        'Spicy': {'saffron','cinnamon','cardamom','black pepper','pink pepper'},
    }
    derived = [family for family,tokens in rules.items() if notes & tokens]
    return {'scent_family': derived} if derived else {}


FIELDS = {'brand':'brand_inspiration','category':'category','tier':'pricing_tier','scent':'scent_family',
          'mood':'moods','occasion':'occasions','season':'seasons','gender':'gender','longevity':'longevity','projection':'projection'}


def matches(p, selected, q='', min_price=None, max_price=None, bestseller=None, new_arrival=None, niche=None):
    for group,field in FIELDS.items():
        wanted = {key(x) for x in (selected.get(group) or []) if key(x)}
        actual = {key(x) for x in (p.get(field) if isinstance(p.get(field),list) else [p.get(field)])}
        if wanted and not (wanted & actual):
            return False
    wanted_notes = {key(x) for x in selected.get('note', []) if key(x)}
    if wanted_notes and not (wanted_notes & {key(x) for part in p['notes'].values() for x in part}):
        return False
    for field,flag in (('is_bestseller',bestseller),('is_new_arrival',new_arrival),('is_niche',niche)):
        if flag is not None and bool(p.get(field)) != flag:
            return False
    wanted_sizes = {key(x) for x in selected.get('size', []) if key(x)}
    # Size and both price bounds must match the SAME available variant.
    if (wanted_sizes or min_price is not None or max_price is not None) and not any(
        (not wanted_sizes or key(s['size']) in wanted_sizes) and
        (min_price is None or s['price'] >= min_price) and
        (max_price is None or s['price'] <= max_price) for s in p['sizes']):
        return False
    if q and key(q):
        text = ' '.join(str(p.get(k) or '') for k in ('name','brand_inspiration','description','category','pricing_tier','smells_like'))
        text += ' ' + ' '.join(x for part in p['notes'].values() for x in part)
        text += ' ' + ' '.join(x for field in ('occasions','scent_family','moods','seasons','tags') for x in p[field])
        if key(q) not in key(text):
            return False
    return True


def filter_options(products):
    mapping = {'brands':'brand_inspiration','categories':'category','tiers':'pricing_tier','scent_families':'scent_family',
               'moods':'moods','occasions':'occasions','seasons':'seasons','genders':'gender','longevity':'longevity','projection':'projection'}
    result = {}
    for name,field in mapping.items():
        unique = {}
        for p in products:
            for v in p.get(field,[]) if isinstance(p.get(field),list) else [p.get(field)]:
                if key(v): unique.setdefault(key(v), str(v).strip())
        result[name] = sorted(unique.values(),key=key)
    notes, sizes = {}, {}
    prices=[]
    for p in products:
        for part in p['notes'].values():
            for v in part: notes.setdefault(key(v),v)
        for s in p['sizes']:
            sizes.setdefault(key(s['size']),s['size']); prices.append(s['price'])
    result.update(notes=sorted(notes.values(),key=key),sizes=sorted(sizes.values(),key=lambda s: int(re.sub(r'\D','',s) or 0)),
        price_range={'min':min(prices,default=0),'max':max(prices,default=0)},
        niche_brands=sorted({p['brand_inspiration'] for p in products if p.get('is_niche') and p.get('brand_inspiration')},key=key),
        has_bestsellers=any(p.get('is_bestseller') for p in products), has_new_arrivals=any(p.get('is_new_arrival') for p in products),
        total=len(products))
    return result
