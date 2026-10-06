import json, urllib.request
from pathlib import Path
import server
res = server.parse_import_workbook(Path(r"..\..\JLT_Fragrances_List.xlsx").read_bytes(), legacy_mapping=True)
ex = {r["matching_identifier"]: r for r in res["rows"] if r["action"]!="REJECT"}
api = {}
page = 1
while True:
    d = json.load(urllib.request.urlopen(f"http://127.0.0.1:8001/api/products?limit=120&page={page}"))
    for p in d["items"]:
        if p.get("import_identifier"): api[p["import_identifier"]] = p
    if page * 120 >= d["total"]: break
    page += 1
print("api active imported", len(api), "excel valid", len(ex))
bad = {}
for k, r in ex.items():
    p = api.get(k)
    if not p: bad.setdefault("missing",[]).append(k); continue
    if p["name"]!=r["name"]: bad.setdefault("name",[]).append(k)
    if p["brand_inspiration"]!=r["brand"]: bad.setdefault("brand",[]).append(k)
    if (p.get("description") or "")!=r["description"]: bad.setdefault("desc",[]).append(k)
    if p["sizes"]!=r["sizes"]: bad.setdefault("sizes",[]).append(k)
    if p.get("pricing_tier")!=r["pricing_tier"]: bad.setdefault("tier",[]).append(k)
    for lvl in ("top","heart","base"):
        if p["notes"][lvl]!=r["notes"][lvl]: bad.setdefault("notes",[]).append(k)
    for f,v in r["attributes"].items():
        if f in("is_active",):continue
        if p.get(f)!=v: bad.setdefault("attr_"+f,[]).append(k)
print({k:len(v) for k,v in bad.items()}); print({k:v[:2] for k,v in bad.items()})
print("empty desc in excel:", sum(1 for r in ex.values() if not r["description"]))
import collections
print(collections.Counter(len(p.get("image_url") or "")>0 for p in api.values()))
