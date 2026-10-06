import server


def test_shipping_boundaries():
    s = {"enabled": True, "threshold": 2000, "charge_below_threshold": 49, "charge_at_or_above_threshold": 99}
    assert server.calculate_shipping(1999, s) == 49
    assert server.calculate_shipping(2000, s) == 99
    assert server.calculate_shipping(2001, s) == 99
    assert server.calculate_shipping(449, s) == 49
    assert server.calculate_shipping(1999, {**s, "enabled": False}) == 0
