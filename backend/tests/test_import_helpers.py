from io import BytesIO

from openpyxl import Workbook

from server import parse_import_workbook


def workbook_bytes(rows):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Name", "Brand Inspiration", "Category", "Base Price", "Description"])
    for row in rows:
        sheet.append(row)
    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


def test_legacy_price_mapping_and_variants():
    result = parse_import_workbook(workbook_bytes([["Scent", "Brand", None, 549, "Desc"]]), legacy_mapping=True)
    row = result["rows"][0]
    assert row["pricing_tier"] == "Niche"
    assert row["sizes"] == [{"size": "20ml", "price": 549}, {"size": "50ml", "price": 1199}, {"size": "100ml", "price": 1799}]
    assert row["legacy_mapping"] is True


def test_unknown_legacy_price_is_rejected():
    result = parse_import_workbook(workbook_bytes([["Scent", "Brand", None, 999, "Desc"]]), legacy_mapping=True)
    assert result["rejected_rows"] == 1
    assert "tier" in result["rows"][0]["validation_message"]


def test_duplicate_normalized_brand_name_is_rejected():
    result = parse_import_workbook(workbook_bytes([["Scent", "Brand", None, 449, ""], ["scent", "brand", None, 449, ""]]), legacy_mapping=True)
    assert result["valid_rows"] == 1
    assert result["rejected_rows"] == 1


def test_notes_are_read_from_their_own_columns_in_order():
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Name", "Brand Inspiration", "Base Price", "Base Notes", "Top Notes", "Heart Notes"])
    sheet.append(["Scent", "Brand", 449, " Vanilla ,Amber", "Lemon; Ylang-Ylang", "Rose"])
    sheet.append(["Other", "Brand", 449, None, None, None])
    output = BytesIO()
    workbook.save(output)
    rows = parse_import_workbook(output.getvalue(), legacy_mapping=True)["rows"]
    assert rows[0]["notes"] == {"top": ["Lemon", "Ylang-Ylang"], "heart": ["Rose"], "base": ["Vanilla", "Amber"]}
    assert rows[1]["notes"] == {"top": [], "heart": [], "base": []}
