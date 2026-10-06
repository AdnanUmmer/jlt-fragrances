import collections
from pathlib import Path
import server
res = server.parse_import_workbook(Path(r"..\..\JLT_Fragrances_List.xlsx").read_bytes(), legacy_mapping=True)
print({k:(v if not isinstance(v,list) else len(v)) for k,v in res.items()})
bad=[r for r in res["rows"] if r.get("validation_message")]
print(collections.Counter(r["validation_message"] for r in bad))
for r in bad: print(r["source_row"], repr(r["name"]), repr(r["brand"]), r["validation_message"], r.get("sizes"))
