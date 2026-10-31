"""Read-only lifestyle matching; source metadata is never changed."""
from discovery import key, values

STEPS = ('family', 'occasion', 'intensity', 'audience', 'spend')
FAMILIES = {
 'fresh': ('Fresh & Citrus', 'Bright citrus, fresh air and aquatic notes', 'fresh,citrus,lemon,bergamot,orange,mandarin,mandarin orange,grapefruit,lime,aquatic,marine,sea salt,water notes,mint'),
 'floral': ('Floral', 'Soft petals and blooming flowers', 'floral,rose,jasmine,lavender,peony,lily,lily of the valley,iris,violet,tuberose,orange blossom,neroli,ylang-ylang,geranium,magnolia'),
 'woody': ('Woody', 'Earthy woods with a smooth finish', 'woody,wood,woods,woody notes,sandalwood,cedar,cedarwood,vetiver,patchouli,oakmoss,guaiac wood'),
 'sweet': ('Sweet & Gourmand', 'Comforting vanilla and delicious sweet notes', 'sweet,gourmand,vanilla,caramel,chocolate,cacao,cocoa,honey,tonka bean,praline,coffee,almond,sugar'),
 'warm': ('Warm & Spicy', 'Rich amber, oud and warming spices', 'warm,spicy,oriental,amber,oud,agarwood,agarwood (oud),cinnamon,saffron,cardamom,clove,cloves,black pepper,pink pepper,nutmeg,incense,benzoin'),
 'clean': ('Musky & Clean', 'Airy musk, powder and freshly washed notes', 'musky,musk,white musk,musk accord,clean,powdery,powdery notes,soft,soap,aldehydes,cotton'),
}
OCCASIONS = {
 'everyday': ('Everyday', {'daily wear', 'daily', 'casual outings', 'casual'}),
 'office': ('Office / College', {'office', 'college', 'work'}),
 'date': ('Date Night', {'date night'}),
 'special': ('Parties & Special Occasions', {'party', 'parties', 'wedding', 'festive wear', 'special occasions'}),
 'any': ('Any Occasion', set()),
}
INTENSITIES = {'light': ('Light & Subtle', 'soft'), 'balanced': ('Balanced', 'moderate'), 'bold': ('Bold & Noticeable', 'strong'), 'any': ('Not Sure', None)}
AUDIENCES = {'men': 'Men', 'women': 'Women', 'unisex': 'Unisex', 'any': 'No Preference'}
BUDGETS = {'under500': ('Under ₹500', 0, 500), '500to999': ('₹500–₹999', 500, 1000), '1000to1999': ('₹1,000–₹1,999', 1000, 2000), '2000plus': ('₹2,000+', 2000, float('inf')), 'any': ('Flexible', 0, float('inf'))}
WEIGHTS = {'family': 5, 'occasion': 3, 'intensity': 2, 'audience': 2}


def groups(product):
    notes = {key(n) for part in product.get('notes', {}).values() for n in values(part)}
    metadata = notes | {key(v) for v in values(product.get('scent_family'))}
    return {g: sorted(metadata & set(tokens.split(','))) for g, (_, _, tokens) in FAMILIES.items() if metadata & set(tokens.split(','))}


def matches(p, field, value):
    if value == 'any': return True
    if field == 'family': return value in groups(p)
    if field == 'occasion': return bool({key(v) for v in values(p.get('occasions'))} & OCCASIONS[value][1])
    if field == 'intensity': return key(p.get('projection')) == INTENSITIES[value][1]
    if field == 'audience': return key(p.get('gender')) == key(AUDIENCES[value])
    if field == 'spend':
        _, low, high = BUDGETS[value]
        return any(low <= s['price'] < high for s in p['sizes'])
    return False


def labels(field):
    if field == 'family': return {k: v[0] for k, v in FAMILIES.items()}
    if field == 'occasion': return {k: v[0] for k, v in OCCASIONS.items()}
    if field == 'intensity': return {k: v[0] for k, v in INTENSITIES.items()}
    if field == 'audience': return AUDIENCES
    return {k: v[0] for k, v in BUDGETS.items()}


def validate(answers):
    return all(f in STEPS and v in labels(f) for f, v in answers.items())


def options(products, answers):
    prefix = {}
    for field in STEPS:
        if field not in answers:
            exact = [p for p in products if all(matches(p, f, v) for f, v in prefix.items())]
            pool = exact or products
            choices = []
            for value, label in labels(field).items():
                count = sum(matches(p, field, value) for p in pool)
                if count:
                    choices.append({'value': value, 'label': label, 'count': count, 'description': FAMILIES[value][1] if field == 'family' else ''})
            return {'step': field, 'options': choices, 'total': len(pool), 'alternatives': not bool(exact) and bool(products)}
        prefix[field] = answers[field]
    raise ValueError('All questions are answered')


def recommend(products, answers):
    affordable = [p for p in products if matches(p, 'spend', answers['spend'])]
    pool = affordable or products
    ranked = []
    for p in pool:
        matched = {f: matches(p, f, answers[f]) for f in WEIGHTS}
        score = sum(w for f, w in WEIGHTS.items() if answers[f] != 'any' and matched[f])
        _, low, high = BUDGETS[answers['spend']]
        sizes = [s for s in p['sizes'] if low <= s['price'] < high]
        size = min(sizes or p['sizes'], key=lambda s: (0 if low <= s['price'] < high else min(abs(s['price']-low), abs(s['price']-high)), s['price']))
        reasons, differences = [], []
        family = answers['family']
        if matched['family']:
            reasons.append(f"Your {FAMILIES[family][0].lower()} style: {', '.join(groups(p)[family][:3])}.")
        else: differences.append('A different scent family to explore')
        if answers['occasion'] != 'any':
            if matched['occasion']:
                actual = [v for v in values(p.get('occasions')) if key(v) in OCCASIONS[answers['occasion']][1]]
                reasons.append('Suited to ' + ', '.join(actual).lower() + '.')
            else: differences.append('Your occasion is not listed for this fragrance')
        if answers['intensity'] != 'any':
            if matched['intensity']: reasons.append(INTENSITIES[answers['intensity']][0] + ' projection.')
            else: differences.append('Different or unspecified intensity')
        if answers['audience'] != 'any':
            if matched['audience']: reasons.append('Listed for ' + str(p['gender']).lower() + '.')
            else: differences.append('Different or unspecified audience')
        if not sizes:
            differences.append('Above your budget' if size['price'] >= high else 'Below your selected price range')
        ranked.append({**p, 'quiz_match': {'size': size['size'], 'price': size['price'], 'score': score, 'exact': all(matched.values()) and bool(sizes), 'budget_match': bool(sizes), 'reasons': reasons, 'differences': differences}})
    ranked.sort(key=lambda p: (not p['quiz_match']['exact'], -p['quiz_match']['score'], -(p.get('rating') or 0), not p.get('is_bestseller'), p['quiz_match']['price'], p['slug']))
    exact = [p for p in ranked if p['quiz_match']['exact']]
    items = exact[:6] if len(exact) >= 3 else ranked[:3]
    return {'items': items, 'total': len(items), 'exact_total': len(exact), 'alternatives': any(not p['quiz_match']['exact'] for p in items)}
