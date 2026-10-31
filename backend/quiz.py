"""Inventory-aware scent quiz; every option and recommendation uses one predicate."""
import math

from discovery import key, normalized, values

STEPS = ('occasion', 'note', 'projection', 'budget')
OCCASIONS = (
    'Wedding', 'Daily Wear', 'Office', 'Date Night', 'Party',
    'Casual Outings', 'Special Occasions', 'Other',
)
PROJECTIONS = (('Soft', 'Light'), ('Moderate', 'Moderate'), ('Strong', 'Strong'))
LEGACY_FIELDS = {'scent': 'scent_family', 'gender': 'gender'}
MAX_NOTE_OPTIONS = 12


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


def attributes(product, step):
    if step == 'note':
        notes = product.get('notes') if isinstance(product.get('notes'), dict) else {}
        return values([
            *[note for level in notes.values() for note in values(level)],
            *values(product.get('scent_family')),
        ])
    field = {'occasion': 'occasions', 'projection': 'projection', **LEGACY_FIELDS}.get(step)
    if not field:
        return []
    return values(product.get(field))


def matching(products, answers):
    return [product for product in products if all(
        any(size['price'] <= value for size in product['sizes']) if step == 'budget'
        else key(value) in {key(candidate) for candidate in attributes(product, step)}
        for step, value in answers.items()
        if step in (*STEPS, *LEGACY_FIELDS) and value is not None
    )]


def choices(products, step):
    if step == 'occasion':
        return [
            {'value': value, 'label': value, 'count': len(matching(products, {step: value}))}
            for value in OCCASIONS
        ]
    if step == 'projection':
        return [
            {'value': value, 'label': label, 'count': len(matching(products, {step: value}))}
            for value, label in PROJECTIONS
        ]
    if step == 'budget':
        options = sorted({min(size['price'] for size in product['sizes']) for product in products})
        return [
            {'value': value, 'label': f'Up to ₹{value:g}', 'count': len(matching(products, {step: value}))}
            for value in options
        ]
    if step == 'note':
        options = {}
        for product in products:
            for value in attributes(product, step):
                normalized_value = key(value)
                options.setdefault(normalized_value, {'value': value, 'label': value, 'count': 0})
                options[normalized_value]['count'] += 1
        return sorted(options.values(), key=lambda option: (-option['count'], key(option['label'])))[:MAX_NOTE_OPTIONS]
    return []


def recommendations(products, answers):
    results = []
    for product in matching(products, answers):
        sizes = sorted(
            (size for size in product['sizes'] if size['price'] <= answers['budget']),
            key=lambda size: size['price'],
        )
        if not sizes:
            continue
        selected_size = sizes[0]
        notes = {key(note) for level in product['notes'].values() for note in level}
        families = {key(family) for family in product['scent_family']}
        projection_label = dict(PROJECTIONS).get(answers['projection'], answers['projection'])
        note_reason = (
            f"Contains the note {answers['note']}"
            if key(answers['note']) in notes
            else f"Matches the {answers['note']} scent family"
        )
        reasons = [
            f"Tagged for {answers['occasion']}",
            note_reason,
            f"{projection_label} projection",
            f"Within your budget: ₹{selected_size['price']:g} ({selected_size['size']})",
        ]
        product_occasions = {key(value) for value in attributes(product, 'occasion')}
        product_projections = {key(value) for value in attributes(product, 'projection')}
        score = (
            3 * (key(answers['occasion']) in product_occasions)
            + 2 * (key(answers['note']) in notes | families)
            + (key(answers['note']) in notes)
            + (key(answers['projection']) in product_projections)
            + (selected_size['price'] <= answers['budget'])
        )
        product = dict(product)
        product['quiz_match'] = {
            'size': selected_size['size'],
            'price': selected_size['price'],
            'reasons': reasons,
            'score': score,
        }
        results.append(product)
    results.sort(key=lambda product: (
        -product['quiz_match']['score'],
        -(product.get('rating') or 0),
        not product.get('is_bestseller'),
        product['quiz_match']['price'],
    ))
    return results
