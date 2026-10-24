import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SWAP } from '../../portal/client/swap-config.js';
import { paymentLinkUrl, shopPassUpgradeHtml } from '../../portal/client/lib/shopPassUpgrade.js';

test('Shop Pass defaults stay frozen and on hold, with portal billing disabled', () => {
  assert.ok(Object.isFrozen(SWAP.shopPass));
  assert.equal(SWAP.shopPass.productName, 'Shop Pass');
  assert.equal(SWAP.shopPass.monthlyPriceLabel, '$99/mo');
  assert.equal(SWAP.shopPass.deployPriceLabel, '$499');
  assert.equal(SWAP.shopPass.offered, false);
  assert.equal(SWAP.shopPass.shopPassPaymentLinkUrl, 'https://buy.stripe.com/7sY00j8mj3fjbFhaxQ1Nu01');
  assert.equal(SWAP.shopPass.deployPaymentLinkUrl, 'https://buy.stripe.com/6oU7sLgSP7vz10DdK21Nu00');
  assert.equal(SWAP.billing.enabled, false);
  assert.equal(SWAP.billing.disclosures, false);
});

test('both Payment Links require the offer gate and their own valid HTTPS URL', () => {
  for (const key of ['shopPassPaymentLinkUrl', 'deployPaymentLinkUrl']) {
    const configured = { ...SWAP.shopPass, [key]: 'https://buy.stripe.com/example' };
    assert.equal(paymentLinkUrl(configured, key), '');
    assert.equal(paymentLinkUrl({ ...configured, offered: true }, key), configured[key]);
    for (const value of ['', 'invalid', 'javascript:alert(1)', 'http://buy.stripe.com/example']) {
      assert.equal(paymentLinkUrl({ ...configured, offered: true, [key]: value }, key), '');
    }
  }
});

test('extend card shows contact fallback on hold and external buttons only when available', () => {
  const held = String(shopPassUpgradeHtml({ ...SWAP, shopPass: {
    ...SWAP.shopPass, shopPassPaymentLinkUrl: 'https://buy.stripe.com/monthly',
    deployPaymentLinkUrl: 'https://buy.stripe.com/deploy',
  } }));
  assert.match(held, /Keep your Shop Pass\./);
  assert.match(held, /Shop Pass is not offered yet\./);
  assert.match(held, /mailto:parker@mnclockworks.com/);
  assert.match(held, /Priority support: members' questions are answered before non-member requests, usually within one business day\./);
  assert.ok(!held.includes('target="_blank"'));
  const open = String(shopPassUpgradeHtml({ ...SWAP, shopPass: {
    ...SWAP.shopPass, offered: true, shopPassPaymentLinkUrl: 'https://buy.stripe.com/monthly',
    deployPaymentLinkUrl: 'https://buy.stripe.com/deploy',
  } }));
  assert.match(open, /Get Shop Pass/);
  assert.match(open, /Pay deploy \(\$499\)/);
  assert.equal((open.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 2);
  const missing = String(shopPassUpgradeHtml({ ...SWAP, shopPass: {
    ...SWAP.shopPass, offered: true, shopPassPaymentLinkUrl: '', deployPaymentLinkUrl: '',
  } }));
  assert.match(missing, /not offered yet/);
  assert.ok(!missing.includes('target="_blank"'));
});
