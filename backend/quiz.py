"""Inventory-aware quiz; choices and recommendations share one predicate."""
import math
from discovery import normalized, key, values

STEPS = ('scent', 'occasion', 'projection', 'budget', 'gender')
FIELDS = {'scent': 'scent_family', 'occasion': 'occasions', 'projection': 'projection', 'gender': 'gender'}
UNKNOWN = '__unspecified__'


def inventory(products):
    result = []
    for product in products:
        if product.get('is_active') is False or product.get('in_stock') is False:
            continue
        p = normalized(product)
        p['sizes'] = [s for s in p['sizes'] if s.get('in_stock') is not False and math.isfinite(s['price'])]
        if p['sizes']:
            result.append(p)
    return result


def attributes(p, step):
    return values(p.get(FIELDS[step])) or [UNKNOWN]


def matching(products, answers):
    return [p for p in products if all(
        any(s['price'] <= value for s in p['sizes']) if step == 'budget'
        else key(value) in {key(v) for v in attributes(p, step)}
        for step, value in answers.items() if step in STEPS and value is not None)]


def choices(products, step):
    if step == 'budget':
        options = sorted({min(s['price'] for s in p['sizes']) for p in products})
        return [{'value': v, 'label': f'Up to ₹{v:g}', 'count': len(matching(products, {step: v}))} for v in options]
    options = {}
    for p in products:
        for value in attributes(p, step):
            options.setdefault(key(value), value)
    return [{'value': v, 'label': 'Not specified' if v == UNKNOWN else v,
             'count': len(matching(products, {step: v}))} for v in sorted(options.values(), key=key)]
