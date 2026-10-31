"""Durable confirmed-order email delivery using the existing SMTP provider.

The pending event is stored in the same atomic write as payment confirmation.
Workers claim it atomically. SMTP's ambiguous acceptance window is held for
operator review rather than blindly retried and potentially duplicated.
"""
import asyncio
import hashlib
import html
import json
import logging
import os
import smtplib
import ssl
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import parseaddr
from zoneinfo import ZoneInfo
from pymongo import ReturnDocument

log = logging.getLogger('jlt.notifications')


def utcnow():
    return datetime.now(timezone.utc)


def pending_event():
    return {'status': 'pending', 'attempts': 0, 'next_attempt_at': utcnow(), 'event': 'order.paid.v1'}


def enabled():
    return os.getenv('ORDER_EMAIL_ENABLED', 'false').lower() == 'true'


def configuration_error():
    required = ('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM', 'EMAIL_TO')
    missing = [k for k in required if not os.getenv(k, '').strip()]
    if missing: return 'Missing ' + ', '.join(missing)
    try:
        if not 1 <= int(os.environ['SMTP_PORT']) <= 65535: return 'Invalid SMTP_PORT'
    except ValueError: return 'Invalid SMTP_PORT'
    for field in ('EMAIL_FROM', 'EMAIL_TO'):
        address = os.environ[field]
        if '\r' in address or '\n' in address or '@' not in parseaddr(address)[1]: return 'Invalid ' + field
    return None


def money(paise):
    return f"₹{paise / 100:,.2f}"


def ist(value):
    if not value: return None
    try:
        date = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        if date.tzinfo is None: date = date.replace(tzinfo=timezone.utc)
        return date.astimezone(ZoneInfo('Asia/Kolkata')).strftime('%d %b %Y, %I:%M %p IST')
    except (ValueError, TypeError): return str(value)


def build_message(order):
    esc = lambda v: html.escape(str(v), quote=True)
    order_id = str(order['order_id'])
    text = ['JLT Fragrances — Order confirmed', 'Smell Luxurious. Spend Smart.', '']
    sections = []
    def section(title, rows):
        rows = [(label, value) for label, value in rows if value is not None and value != '']
        if not rows: return
        text.extend([title] + [f'{label}: {value}' for label, value in rows] + [''])
        cells = ''.join(f'<tr><td style="padding:5px 0;color:#6b6257;vertical-align:top;width:38%">{esc(label)}</td><td style="padding:5px 0;overflow-wrap:anywhere">{esc(value)}</td></tr>' for label, value in rows)
        sections.append(f'<h2 style="font-family:Georgia,serif;font-size:21px;margin:24px 0 10px">{esc(title)}</h2><table role="presentation" width="100%" style="font-size:14px;border-collapse:collapse">{cells}</table>')
    section('Order information', [('Order ID', order_id), ('Order placed', ist(order.get('created_at'))),
        ('Payment confirmed', ist(order.get('paid_at'))), ('Payment status', order.get('payment_status')),
        ('Payment method', order.get('payment_method')), ('Order status', order.get('order_status')),
        ('Razorpay order', order.get('razorpay_order_id')), ('Razorpay payment', order.get('razorpay_payment_id'))])
    section('Customer', [('Full name', order.get('customer_name')), ('Email', order.get('customer_email')), ('Phone', order.get('customer_phone'))])
    section('Shipping address', [('Recipient', order.get('customer_name')), ('Street address', order.get('shipping_address')),
        ('Apartment / building', order.get('shipping_address_line2') or order.get('shipping_apartment')),
        ('Landmark', order.get('shipping_landmark')), ('City', order.get('shipping_city')),
        ('State', order.get('shipping_state')), ('PIN code', order.get('shipping_pin')), ('Country', order.get('shipping_country'))])
    text.append('Items')
    item_rows = []
    for item in order.get('items', []):
        # Item prices are RUPEES; the order totals are PAISE.
        unit = round(item['price'] * 100)
        qty = item['qty']
        details = [item.get('brand'), item.get('size')]
        details = [str(x) for x in details if x]
        selected = []
        for fragrance in item.get('selected_products') or []:
            selected.append(' — '.join(str(v) for v in [fragrance.get('name'), fragrance.get('brand'), fragrance.get('size') or item.get('size')] if v))
        description = ' · '.join(details)
        text.append(f"{item.get('name', '')} | {description} | Qty: {qty} | Unit: {money(unit)} | Total: {money(unit * qty)}")
        text.extend('  • ' + name for name in selected)
        contents = ''.join(f'<li>{esc(name)}</li>' for name in selected)
        item_rows.append(f'<tr><td style="padding:14px 8px;border-bottom:1px solid #e5d9c5;vertical-align:top"><strong>{esc(item.get("name", ""))}</strong><br><span style="color:#6b6257">{esc(description)}</span>' + (f'<ul style="padding-left:16px;margin:8px 0">{contents}</ul>' if contents else '') + f'<br><span style="font-size:12px">Unit price: {money(unit)}</span></td><td style="padding:14px 6px;vertical-align:top;border-bottom:1px solid #e5d9c5">{qty}</td><td style="padding:14px 6px;vertical-align:top;border-bottom:1px solid #e5d9c5;text-align:right;white-space:nowrap">{money(unit * qty)}</td></tr>')
    sections.append('<h2 style="font-family:Georgia,serif;font-size:21px;margin:24px 0 10px">Items</h2><table width="100%" style="font-size:13px;border-collapse:collapse"><thead><tr style="background:#efe7d6;text-align:left"><th style="padding:10px 8px">Fragrance / Set</th><th style="padding:10px 6px">Qty</th><th style="padding:10px 6px;text-align:right">Total</th></tr></thead><tbody>' + ''.join(item_rows) + '</tbody></table>')
    text.append('')
    summary = [('Subtotal', order.get('subtotal_amount')), ('Discount', order.get('discount_amount')),
               ('Shipping', order.get('shipping_amount')), ('Tax', order.get('tax_amount')), ('Total paid', order.get('total_amount'))]
    section('Payment summary', [(label, money(value)) for label, value in summary if isinstance(value, (int, float))])
    section('Delivery instructions', [('Notes', order.get('delivery_notes') or order.get('special_instructions'))])
    message = EmailMessage()
    message['From'] = os.environ['EMAIL_FROM'].strip()
    message['To'] = os.environ['EMAIL_TO'].strip()
    message['Subject'] = f'New JLT Order Confirmed — #{order_id} — {money(order["total_amount"])}'
    domain = parseaddr(message['From'])[1].split('@')[-1]
    event_key = hashlib.sha256((order_id + ':order.paid.v1').encode()).hexdigest()
    message['Message-ID'] = f'<jlt-{event_key}@{domain}>'
    message.set_content('\n'.join(text))
    message.add_alternative('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#efe7d6;color:#0e0c0a;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0"><tr><td align="center" style="padding:16px 8px"><table role="presentation" width="100%" style="max-width:640px;background:#f7f1e6" cellspacing="0"><tr><td style="background:#0e0c0a;color:#f7f1e6;padding:28px 20px"><div style="color:#c9a86a;letter-spacing:3px;font-size:12px">JLT FRAGRANCES</div><h1 style="font-family:Georgia,serif;font-size:28px;font-weight:normal">New order confirmed</h1><p style="font-size:13px">Smell Luxurious. Spend Smart.</p></td></tr><tr><td style="padding:8px 20px 28px">' + ''.join(sections) + '</td></tr></table></td></tr></table></body></html>', subtype='html')
    return message


def smtp_send(order):
    """Return a disposition; never expose provider messages or customer data in logs."""
    if configuration_error(): return {'status': 'failed', 'error': 'smtp_configuration'}
    connection, delivering = None, False
    try:
        message = build_message(order)
        port = int(os.environ['SMTP_PORT'])
        context = ssl.create_default_context()
        if port == 465:
            connection = smtplib.SMTP_SSL(os.environ['SMTP_HOST'], port, timeout=20, context=context)
        else:
            connection = smtplib.SMTP(os.environ['SMTP_HOST'], port, timeout=20)
            connection.starttls(context=context)
        connection.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
        delivering = True
        refused = connection.send_message(message)
        if refused: return {'status': 'failed', 'error': 'recipient_refused'}
        return {'status': 'sent'}
    except smtplib.SMTPRecipientsRefused as exc:
        retry = all(400 <= code < 500 for code, _ in exc.recipients.values())
        return {'status': 'retry' if retry else 'failed', 'error': 'recipient_refused'}
    except smtplib.SMTPResponseException as exc:
        return {'status': 'retry' if 400 <= exc.smtp_code < 500 else 'failed', 'error': type(exc).__name__}
    except (OSError, smtplib.SMTPServerDisconnected) as exc:
        return {'status': 'uncertain' if delivering else 'retry', 'error': type(exc).__name__}
    except Exception as exc:
        return {'status': 'uncertain' if delivering else 'failed', 'error': type(exc).__name__}
    finally:
        if connection:
            # SMTP acceptance is already final; a failed QUIT must not trigger another send.
            try: connection.close()
            except Exception: pass


async def deliver_one(db, sender=None):
    now = utcnow()
    # A crashed sender may have delivered. Never blindly resend expired claims.
    await db.orders.update_many({'order_email.status': 'sending', 'order_email.lease_until': {'$lte': now}},
        {'$set': {'order_email.status': 'uncertain', 'order_email.last_error': 'worker_interrupted'}})
    token = uuid.uuid4().hex
    order = await db.orders.find_one_and_update(
        {'payment_status': 'paid', 'order_email.status': {'$in': ['pending', 'retry']}, 'order_email.next_attempt_at': {'$lte': now}},
        {'$set': {'order_email.status': 'sending', 'order_email.claim': token, 'order_email.lease_until': now + timedelta(minutes=10)}, '$inc': {'order_email.attempts': 1}},
        return_document=ReturnDocument.AFTER)
    if not order: return False
    try:
        result = await asyncio.to_thread(sender or smtp_send, order)
    except Exception as exc:
        result = {'status': 'uncertain', 'error': type(exc).__name__}
    attempts = order['order_email']['attempts']
    status = result['status']
    if status == 'retry' and attempts >= 8: status = 'failed'
    update = {'order_email.status': status, 'order_email.last_error': result.get('error'), 'order_email.updated_at': utcnow()}
    if status == 'sent': update['order_email.sent_at'] = utcnow()
    if status == 'retry': update['order_email.next_attempt_at'] = utcnow() + timedelta(seconds=min(3600, 60 * 2 ** (attempts - 1)))
    await db.orders.update_one({'_id': order['_id'], 'order_email.claim': token, 'order_email.status': 'sending'},
        {'$set': update, '$unset': {'order_email.claim': '', 'order_email.lease_until': ''}})
    log.info(json.dumps({'event': 'order_email', 'order_id': order['order_id'], 'status': status, 'attempt': attempts, 'error': result.get('error')}))
    return True


async def worker(db):
    while True:
        try:
            if not configuration_error():
                for _ in range(10):
                    if not await deliver_one(db): break
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.error(json.dumps({'event': 'order_email_worker_error', 'error': type(exc).__name__}))
        await asyncio.sleep(5)
