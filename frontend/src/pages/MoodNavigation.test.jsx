import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import Home from './Home';
import Shop from './CatalogueShop';
import http from '../lib/api';

jest.mock('../lib/api',()=>({__esModule:true,default:{get:jest.fn()},waLink:()=> 'https://wa.me/test',INSTAGRAM_URL:'https://instagram.com/test'}));
jest.mock('../components/ProductCard',()=>({ProductGrid:({items})=><div data-testid="products">{items.map(p=><span key={p.slug}>{p.name}</span>)}</div>}));
jest.mock('react-router-dom',()=>({
 Link:({to,children,...props})=><a href={to} {...props}>{children}</a>,
 useSearchParams:()=>{
   const React=require('react');
   const [query,setQuery]=React.useState(()=>globalThis.window.location.search);
   return [new URLSearchParams(query),next=>{
     const p=next instanceof URLSearchParams?next:new URLSearchParams(next);
     globalThis.window.history.pushState({},'',`/shop?${p}`);setQuery(p.toString());
   }];
 }
}),{virtual:true});
const moods=['Fresh','Sweet','Oud','Floral','Clean','Spicy','Musky'];
let host,root;
async function mount(component){await act(async()=>{root.render(component);});}
async function click(node){await act(async()=>node.click());}
const button=text=>[...host.querySelectorAll('button')].find(n=>n.textContent===text);
beforeEach(()=>{
 global.IS_REACT_ACT_ENVIRONMENT=true;
 globalThis.window.history.replaceState({},'','/shop');
 HTMLDialogElement.prototype.close=function(){this.open=false;};
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
 http.get.mockReset().mockImplementation(url=>Promise.resolve({data:url==='/products/filters'?{moods,price_range:{min:449,max:2000}}:{items:[{slug:'rose',name:'Rose'}],total:48}}));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});

test('homepage retains all seven original labels and links',async()=>{
 await mount(<Home/>);
 const links=[...host.querySelectorAll('[data-testid="shop-by-mood"] a')];
 expect(links.map(n=>n.textContent)).toEqual(moods);
 expect(links.map(n=>n.getAttribute('href'))).toEqual(moods.map(m=>`/shop?mood=${m}`));
});

test.each(moods)('%s stays selected after reload on both filter panels',async mood=>{
 globalThis.window.history.replaceState({},'',`/shop?mood=${mood}`);
 await mount(<Shop/>);
 expect(http.get.mock.calls.some(([url])=>url.startsWith(`/products?mood=${mood}`))).toBe(true);
 expect(host.querySelector(`[aria-label="Remove mood: ${mood}"]`)).not.toBeNull();
 let labels=[...host.querySelectorAll('label')].filter(n=>n.textContent===mood);
 expect(labels).toHaveLength(2);expect(labels.every(n=>n.querySelector('input').checked)).toBe(true);
 await act(async()=>root.unmount());root=createRoot(host);await mount(<Shop/>);
 expect(host.querySelector(`[aria-label="Remove mood: ${mood}"]`)).not.toBeNull();
 await click(host.querySelector('[data-testid="toggle-filters"]'));
 expect(host.querySelector('dialog').open).toBe(true);
 await click(host.querySelector(`[aria-label="Remove mood: ${mood}"]`));
 expect(new URLSearchParams(globalThis.window.location.search).has('mood')).toBe(false);
});

test('sort, pagination, search and combined filters preserve mood',async()=>{
 globalThis.window.history.replaceState({},'','/shop?mood=Floral&brand=Test');
 await mount(<Shop/>);
 const select=host.querySelector('[aria-label="Sort fragrances"]');
 await act(async()=>{select.value='price_asc';select.dispatchEvent(new Event('change',{bubbles:true}));});
 await click(button('Next'));
 let query=new URLSearchParams(globalThis.window.location.search);
 expect(query.get('mood')).toBe('Floral');expect(query.get('sort')).toBe('price_asc');expect(query.get('page')).toBe('2');expect(query.get('brand')).toBe('Test');
 const input=host.querySelector('[aria-label="Search fragrances"]');
 await act(async()=>{
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'rose');
  input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await act(async()=>host.querySelector('[role="search"]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 query=new URLSearchParams(globalThis.window.location.search);
 expect(query.get('q')).toBe('rose');expect(query.get('mood')).toBe('Floral');expect(query.has('page')).toBe(false);
 expect(host.querySelector('[role="status"]').textContent).toBe('48 fragrances');
 await click(button('Clear all'));
 expect(new URLSearchParams(globalThis.window.location.search).has('mood')).toBe(false);
});

