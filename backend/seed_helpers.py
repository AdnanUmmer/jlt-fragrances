"""Auto-generate product attributes from brand+name using keyword matching."""
import re
import hashlib
from typing import Dict, List

SCENT_FAMILIES = ["Oud", "Floral", "Fresh", "Sweet", "Spicy", "Musky", "Clean", "Woody", "Citrus", "Leather"]
MOODS = ["Fresh", "Sweet", "Oud", "Floral", "Clean", "Spicy", "Musky"]
OCCASIONS = ["Office", "Date Night", "Wedding", "Daily Wear", "Gifting", "Festive Wear"]

# Niche brands (case-insensitive match against brand_inspiration)
NICHE_BRANDS = {
    "AMOUAGE", "AMOUROUD", "ATKINSONS", "BOADICEA", "BOADICEA THE VICTORIOUS", "BODICEA THE VICTORIOUS",
    "BOND NO 9", "BOND NO. 9", "BYREDO", "CLIVE CHRISTIAN", "CLIVE CRISTIAN",
    "COMME DES GARCONS", "COMMES DE GARCONS", "CREED", "DIPTYQUE", "EX NIHILO",
    "FREDERIC MALLE", "GOLDFIELD & BANKS", "GOLDFIELD AND BANKS", "GOUTAL", "INITIO",
    "JO MALONE", "KAYALI", "KILIAN", "LE LABO", "MAISON CRIVELLI",
    "MAISON FRANCIS KURKDJIAN", "MAISON MARGIELA REPLICA", "MANCERA", "MATIERE PREMIERE",
    "MEMO PARIS", "MONTALE", "NASOMATTO", "NISHANE", "ORMONDE JAYNE",
    "PARFUMS DE MARLY", "PENHALIGON'S", "PENHALIGONS", "ROJA", "SORA DORA",
    "SOSPIRO", "SPIRIT OF DUBAI", "STEPHANE HUMBERT LUCAS 777", "THOMAS KOSMALA", "THOMAS KHOSALA",
    "TIZIANA TERENZI", "VILHELM PARFUMERIE", "XERJOFF", "ZOOLOGIST",
}

# Pricing: sizes 20ml / 50ml / 100ml
SIZES_NICHE = [
    {"size": "20ml", "price": 549},
    {"size": "50ml", "price": 1199},
    {"size": "100ml", "price": 1899},
]
SIZES_REGULAR = [
    {"size": "20ml", "price": 449},
    {"size": "50ml", "price": 1099},
    {"size": "100ml", "price": 1699},
]

SCENT_KEYWORDS = {
    "Oud": ["oud", "oudh", "dehn", "agar", "agarwood", "mukhalat", "mukhallat", "ajbar", "arabian"],
    "Floral": ["rose", "jasmine", "iris", "violet", "lily", "gardenia", "orchid", "flower", "blossom", "tubero", "wardat", "candy", "delina"],
    "Fresh": ["aqua", "cool", "water", "marine", "sea", "ocean", "fresh", "sport", "ice", "breeze", "blue", "fraiche", "fraichie"],
    "Sweet": ["candy", "cherry", "vanilla", "honey", "sugar", "caramel", "tonka", "pink", "peach", "mango", "fruit", "pear", "smoothie", "marshmallow", "cappuccino"],
    "Spicy": ["spice", "saffron", "cinnamon", "pepper", "cardamom", "ginger", "spicebomb", "amber wood"],
    "Musky": ["musk", "musc", "mousouf"],
    "Clean": ["clean", "soap", "white", "linen", "cotton", "happy"],
    "Woody": ["wood", "cedar", "sandal", "vetiver", "patchouli", "cypress", "timber", "talisman", "bois"],
    "Citrus": ["citrus", "lemon", "orange", "bergamot", "mandarin", "lime", "neroli", "amalfi"],
    "Leather": ["leather", "tuscan", "tabac", "tobacco", "smoke"],
}

GENDER_KEYWORDS = {
    "Men": ["men", "homme", "uomo", "boy", "rijaal", "him", "for him", "pour homme", "sport", "code men", "kourus"],
    "Women": ["women", "femme", "lady", "her", "for her", "girl", "elle", "donna", "she", "rose", "candy", "flower", "floral", "bombshell", "good girl", "libre", "opium", "delina"],
}

OCCASION_KEYWORDS = {
    "Wedding": ["oud", "wedding", "festive", "amber", "saffron", "rose"],
    "Date Night": ["seduction", "noir", "intense", "elixir", "passion", "love", "romance", "sexy", "cherry", "vanilla"],
    "Office": ["fresh", "aqua", "cool", "clean", "blue", "sport", "citrus", "marine"],
    "Daily Wear": ["everyday", "daily", "fresh", "cool", "light", "soft", "musk"],
    "Festive Wear": ["oud", "festive", "amber", "spice", "rich", "royal", "majestic"],
    "Gifting": ["bestseller", "premium", "luxury", "classic", "iconic"],
}


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text).strip("-")
    text = re.sub(r"-+", "-", text)
    return text


def is_niche_brand(brand: str) -> bool:
    b = brand.upper().strip()
    return b in NICHE_BRANDS or any(b.startswith(n) or n.startswith(b) for n in NICHE_BRANDS if len(n) >= 4)


def detect_scent_family(brand: str, name: str) -> List[str]:
    text = f"{brand} {name}".lower()
    families = []
    for fam, kws in SCENT_KEYWORDS.items():
        if any(k in text for k in kws):
            families.append(fam)
    if not families:
        idx = int(hashlib.md5(text.encode()).hexdigest(), 16) % len(SCENT_FAMILIES)
        families = [SCENT_FAMILIES[idx]]
    return families[:3]


def detect_gender(brand: str, name: str) -> str:
    text = f"{name} {brand}".lower()
    if any(k in text for k in GENDER_KEYWORDS["Men"]):
        return "Men"
    if any(k in text for k in GENDER_KEYWORDS["Women"]):
        return "Women"
    return "Unisex"


def detect_mood(families: List[str]) -> List[str]:
    moods = []
    for f in families:
        if f in MOODS: moods.append(f)
        elif f == "Woody": moods.append("Oud")
        elif f == "Citrus": moods.append("Fresh")
        elif f == "Leather": moods.append("Spicy")
    return list(dict.fromkeys(moods)) or ["Fresh"]


def detect_occasions(brand: str, name: str, families: List[str]) -> List[str]:
    text = f"{brand} {name}".lower()
    occs = []
    for occ, kws in OCCASION_KEYWORDS.items():
        if any(k in text for k in kws):
            occs.append(occ)
    if "Oud" in families: occs.extend(["Wedding", "Festive Wear", "Date Night"])
    if "Fresh" in families or "Citrus" in families: occs.extend(["Office", "Daily Wear"])
    if "Sweet" in families or "Floral" in families: occs.append("Date Night")
    if not occs: occs = ["Daily Wear", "Gifting"]
    return list(dict.fromkeys(occs))[:4]


def detect_longevity_projection(families: List[str], name: str):
    nm = name.lower()
    if "Oud" in families or "Leather" in families or any(x in nm for x in ["intense","elixir","extreme","parfum"]):
        return "Long Lasting (8-12 hrs)", "Strong"
    if "Fresh" in families or "Citrus" in families:
        return "Moderate (4-6 hrs)", "Soft"
    return "Long Lasting (6-8 hrs)", "Moderate"


def detect_season(families: List[str]) -> List[str]:
    if any(f in families for f in ["Oud","Spicy","Leather"]): return ["Winter", "Autumn"]
    if any(f in families for f in ["Fresh","Citrus"]): return ["Summer", "Spring"]
    return ["All Seasons"]


def gen_notes(brand: str, name: str, families: List[str]) -> Dict[str, List[str]]:
    note_db = {
        "Oud": {"top": ["Saffron", "Bergamot"], "heart": ["Rose", "Agarwood"], "base": ["Amber", "Musk", "Leather"]},
        "Floral": {"top": ["Pink Pepper", "Bergamot"], "heart": ["Rose", "Jasmine", "Iris"], "base": ["Musk", "Sandalwood"]},
        "Fresh": {"top": ["Bergamot", "Lemon", "Sea Notes"], "heart": ["Lavender", "Geranium"], "base": ["Ambroxan", "Cedar"]},
        "Sweet": {"top": ["Bergamot", "Mandarin"], "heart": ["Vanilla", "Tonka Bean"], "base": ["Amber", "Caramel", "Musk"]},
        "Spicy": {"top": ["Cinnamon", "Black Pepper"], "heart": ["Saffron", "Cardamom"], "base": ["Amber", "Tobacco"]},
        "Musky": {"top": ["Aldehydes", "Bergamot"], "heart": ["White Musk", "Iris"], "base": ["Sandalwood", "Vanilla"]},
        "Clean": {"top": ["Aldehydes", "Citrus"], "heart": ["White Florals", "Cotton"], "base": ["White Musk", "Cedar"]},
        "Woody": {"top": ["Bergamot"], "heart": ["Cedar", "Sandalwood"], "base": ["Vetiver", "Patchouli"]},
        "Citrus": {"top": ["Lemon", "Bergamot", "Grapefruit"], "heart": ["Neroli", "Petitgrain"], "base": ["Cedar", "Musk"]},
        "Leather": {"top": ["Saffron"], "heart": ["Leather", "Tobacco"], "base": ["Amber", "Oud", "Suede"]},
    }
    primary = families[0] if families else "Fresh"
    return note_db.get(primary, note_db["Fresh"])


def gen_description(brand: str, name: str, families: List[str], occasions: List[str]) -> Dict[str, str]:
    primary = families[0] if families else "Fresh"
    descriptors = {
        "Oud": "A bold, rich oud composition with smoky depth and a warm amber-musk dry down.",
        "Floral": "A radiant floral bouquet with elegant petals, soft musk, and a sophisticated finish.",
        "Fresh": "A crisp, aquatic opening with clean marine notes and a long-lasting cedar base.",
        "Sweet": "A gourmand delight with creamy vanilla, soft amber, and a warm, hypnotic dry down.",
        "Spicy": "A spicy, warm composition with saffron, pepper, and a rich tobacco-amber finish.",
        "Musky": "A clean white musk fragrance with a soft, intimate, skin-like trail.",
        "Clean": "A polished, fresh-clean signature with soft florals and a soapy musk finish.",
        "Woody": "A sophisticated woody composition with rich sandalwood, vetiver, and earthy depth.",
        "Citrus": "A vibrant citrus opening, bright and uplifting, finishing on warm cedar.",
        "Leather": "A smoky, dark leather fragrance with tobacco and amber for a confident trail.",
    }
    short = descriptors.get(primary, descriptors["Fresh"])
    best_for = ", ".join(occasions[:3]) if occasions else "everyday wear"
    smells_like = f"{short} A premium-inspired interpretation of {brand.title()} {name.title()} — crafted with rich oils for excellent depth and projection."
    return {
        "smells_like": smells_like,
        "best_for": f"Best for {best_for.lower()}, and anyone seeking a memorable, premium scent.",
        "who_should_buy": f"Ideal for fragrance lovers who appreciate {primary.lower()} compositions and want a luxury-inspired scent at a smart price.",
    }


def build_product(idx: int, brand: str, name: str) -> dict:
    families = detect_scent_family(brand, name)
    gender = detect_gender(brand, name)
    moods = detect_mood(families)
    occasions = detect_occasions(brand, name, families)
    longevity, projection = detect_longevity_projection(families, name)
    seasons = detect_season(families)
    notes = gen_notes(brand, name, families)
    desc = gen_description(brand, name, families, occasions)
    pretty_name = name.title().replace("'S", "'s")
    pretty_brand = brand.title().replace("'S", "'s")
    slug = slugify(f"{pretty_name}-inspired-by-{pretty_brand}-{idx}")

    niche = is_niche_brand(brand)
    sizes = SIZES_NICHE if niche else SIZES_REGULAR
    base_price = sizes[0]["price"]

    is_bestseller = idx % 11 == 0
    is_new = idx % 17 == 0

    return {
        "slug": slug, "name": pretty_name, "brand_inspiration": pretty_brand,
        "is_niche": niche,
        "scent_family": families, "moods": moods, "gender": gender,
        "occasions": occasions, "seasons": seasons,
        "longevity": longevity, "projection": projection,
        "notes": notes,
        "smells_like": desc["smells_like"], "best_for": desc["best_for"], "who_should_buy": desc["who_should_buy"],
        "sizes": sizes, "base_price": base_price,
        "is_bestseller": is_bestseller, "is_new_arrival": is_new,
        "image_url": None, "in_stock": True,
        "rating": round(4.2 + (idx % 7) * 0.1, 1),
        "review_count": 5 + (idx * 7) % 80,
    }


# Convenience export for server.py (defaults to regular sizes; admin-created products)
SIZES = SIZES_REGULAR
