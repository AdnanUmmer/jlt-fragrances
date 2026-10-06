import {whatsappUrl,productOrderMessage,setOrderMessage} from './whatsapp';
test('product WhatsApp message retains special characters, selected size and price',()=>{
  const p={name:"Rose & Oud / L'Air",brand_inspiration:"D'Brand & Co"};const v={size:'100ml',price:1799};
  const message=productOrderMessage(p,v);const url=new URL(whatsappUrl('+918089083404',message));
  expect(url.pathname).toBe('/918089083404');expect(url.searchParams.get('text')).toBe(message);
  expect(message).toContain('Size: 100ml');expect(message).toContain('Price: ₹1799');expect(message).toContain(p.name);
});
test('discovery sets use their own title, subtitle and price without perfume assumptions',()=>{
  const message=setOrderMessage({title:'Wedding & Festive Discovery Set',subtitle:'5 x 8ml samples',price:899});
  expect(message).toContain('Price: ₹899');expect(message).toContain('5 x 8ml samples');expect(message).not.toContain('undefined');
  expect(new URL(whatsappUrl('+918089083404',message)).searchParams.get('text')).toBe(message);
});
test('combo messages retain count and size',()=>{
  const m=setOrderMessage({title:'Tester Combo',items:3,size:'8ml',subtitle:'3 × 8ml',price:549});
  expect(m).toContain('Fragrances: 3');expect(m).toContain('Size per fragrance: 8ml');
});
