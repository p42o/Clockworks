import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SWAP } from '../../portal/client/swap-config.js';
import { shopPassUpgradeHtml } from '../../portal/client/lib/shopPassUpgrade.js';
import { shopPassComingSoonHtml } from '../../portal/client/lib/shopPassComingSoon.js';

const PRIORITY =
  "Priority support: members' questions are answered before non-member requests, usually within one business day.";

test('Coming soon modal HTML has Shop Pass, Coming soon, all five features, Counsel priority sentence', () => {
  const markup = String(shopPassComingSoonHtml(SWAP));
  assert.match(markup, /Shop Pass/);
  assert.match(markup, /Coming soon/);
  assert.match(markup, /Keep your AI team current with Shop Pass\./);
  assert.match(markup, /\$99 a month after the \$499 deploy\./);
  assert.match(markup, /Portal stays open after the grace window for your shop/);
  assert.match(markup, /Agent Newsletter tailored to your business and your agent team/);
  assert.match(markup, /specific updates you can hand them, not a general blast/);
  assert.match(markup, /Monthly remote tune-up for your setup/);
  assert.match(markup, /Quarterly check-in on your shop/);
  assert.ok(markup.includes(PRIORITY));
  assert.match(markup, /One-time 7-day extension available separately/);
  assert.match(markup, /disabled[^>]*>Coming soon</);
});

test('Coming soon modal never includes Stripe, Care Plan, Running Order, or Draft', () => {
  const markup = String(shopPassComingSoonHtml(SWAP));
  assert.ok(!markup.includes('buy.stripe.com'));
  assert.ok(!markup.includes('Care Plan'));
  assert.ok(!markup.includes('Running Order'));
  assert.ok(!/\bDraft\b/.test(markup));
});

test('extend card when offered false still says not offered yet and adds See what’s in Shop Pass', () => {
  const held = String(shopPassUpgradeHtml({
    ...SWAP,
    shopPass: {
      ...SWAP.shopPass,
      shopPassPaymentLinkUrl: 'https://buy.stripe.com/monthly',
      deployPaymentLinkUrl: 'https://buy.stripe.com/deploy',
    },
  }));
  assert.match(held, /Shop Pass is not offered yet\./);
  assert.match(held, /data-shop-pass-coming-soon/);
  assert.match(held, /See what’s in Shop Pass/);
  assert.ok(!held.includes('target="_blank"'));
});
