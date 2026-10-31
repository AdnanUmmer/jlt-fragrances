import React, { act } from "react";
import { createRoot } from "react-dom/client";
import FindYourScent from "./FindYourScent";
import http from "../lib/api";

jest.mock("../lib/api", () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock("../lib/store", () => ({ useCart: () => ({ addToCart: jest.fn() }) }));
jest.mock("react-router-dom", () => ({ Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
let host, root;
const pending = [];
const option = value => ({ value, label: value, count: 2 });
async function reply(data, index = pending.length - 1) {
  await act(async () => pending[index]({ data }));
}
async function click(text) {
  const button = [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
  expect(button).toBeDefined();
  await act(async () => button.click());
}
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  pending.length = 0;
  http.post.mockReset().mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  host = document.createElement('div'); document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(<FindYourScent />));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

test('rejects the old backend response instead of showing scent options under occasion', async () => {
  await reply({ step: 'scent', total: 10, options: [option('Oud')] });
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="quiz-option-Oud"]')).toBeNull();
});

test('changing an earlier answer clears descendants and ignores a late response', async () => {
  await reply({ step: 'occasion', total: 10, options: [option('Wedding'), option('Daily Wear')] });
  await click('Wedding');
  expect(http.post.mock.calls.at(-1)[1]).toEqual({ occasion: 'Wedding' });
  await reply({ step: 'note', total: 4, options: [option('Amber')] });
  await click('Amber');
  const oldRequest = pending.length - 1;
  await click('Occasion:');
  expect(http.post.mock.calls.at(-1)[1]).toEqual({});
  await reply({ step: 'occasion', total: 10, options: [option('Wedding'), option('Daily Wear')] });
  await click('Daily Wear');
  await reply({ step: 'note', total: 6, options: [option('Citrus')] });
  await reply({ step: 'projection', total: 2, options: [option('Strong')] }, oldRequest);
  expect(host.querySelector('h1').textContent).toBe('Which fragrance notes do you prefer?');
  expect(host.querySelector('[data-testid="quiz-option-Citrus"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="quiz-option-Strong"]')).toBeNull();
  expect(http.post.mock.calls.at(-1)[1]).toEqual({ occasion: 'Daily Wear' });
});

test('complete answers request recommendations with the selected price and show results', async () => {
  for (const [step, value] of [['occasion','Wedding'],['note','Amber'],['projection','Strong'],['budget',649]]) {
    await reply({ step, total: 2, options: [option(value)] });
    await click(String(value));
  }
  expect(http.post.mock.calls.at(-1).slice(0, 2)).toEqual(['/quiz/recommend', { occasion:'Wedding', note:'Amber', projection:'Strong', budget:649 }]);
  await reply({ total:1, items:[{ slug:'amber', name:'Amber Test', brand_inspiration:'Test', quiz_match:{ price:449, size:'20ml', reasons:['Contains the note Amber'] } }] });
  expect(host.querySelector('[data-testid="quiz-results"]')).not.toBeNull();
  expect(host.textContent).toContain('₹449');
  await click('Add to Cart');
  expect(host.querySelector('[role="status"]').textContent).toContain('added to your cart');
});
