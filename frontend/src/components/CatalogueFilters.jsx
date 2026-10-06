import React, {useEffect,useState} from 'react';
export const groups=[['brand','Brand','brands'],['category','Collection','categories'],['tier','Pricing tier','tiers'],['scent','Fragrance family','scent_families'],['note','Notes','notes'],['occasion','Occasion','occasions'],['season','Season','seasons'],['mood','Mood','moods'],['gender','Gender','genders'],['size','Size','sizes'],['longevity','Longevity','longevity'],['projection','Projection','projection']];
function Group({name,label,options,selected,toggle}) {
  const [search,setSearch]=useState('');
  if(!options?.length)return null;
  const shown=options.filter(o=>o.toLowerCase().includes(search.toLowerCase()));
  return <details className="filter-group" open={selected.length>0||undefined}><summary>{label}{selected.length>0&&<span className="ml-2 text-jlt-gold">({selected.length})</span>}</summary>
    {options.length>10&&<input className="input-luxe my-2" aria-label={`Find ${label.toLowerCase()} options`} placeholder={`Find ${label.toLowerCase()}…`} value={search} onChange={e=>setSearch(e.target.value)}/>}
    <div className="max-h-52 overflow-y-auto mt-2">{shown.map(o=><label key={o} className="filter-choice"><input type="checkbox" checked={selected.some(v=>v.toLowerCase()===o.toLowerCase())} onChange={()=>toggle(name,o)}/><span>{o}</span></label>)}{!shown.length&&<p className="text-sm py-2">No matching options.</p>}</div>
  </details>;
}
export default function CatalogueFilters({filters,params,toggle,setSingle}) {
  const [min,setMin]=useState(params.get('min_price')||'');const [max,setMax]=useState(params.get('max_price')||'');
  useEffect(()=>{setMin(params.get('min_price')||'');setMax(params.get('max_price')||'');},[params]);
  return <>{groups.map(([name,label,k])=><Group key={name} name={name} label={label} options={filters[k]} selected={params.getAll(name)} toggle={toggle}/>)}
    <form className="py-4 border-b" onSubmit={e=>{e.preventDefault();setSingle({min_price:min,max_price:max});}}><fieldset><legend className="text-sm mb-2">Variant price (₹)</legend><p className="text-xs mb-3 text-jlt-black/60">₹{filters.price_range.min}–₹{filters.price_range.max}. Matches an available size within this range.</p><div className="grid grid-cols-2 gap-2"><label className="text-xs">Minimum<input className="input-luxe mt-1" type="number" min="0" step="1" value={min} onChange={e=>setMin(e.target.value)}/></label><label className="text-xs">Maximum<input className="input-luxe mt-1" type="number" min={min||0} step="1" value={max} onChange={e=>setMax(e.target.value)}/></label></div><button className="btn-outline w-full justify-center mt-3">Apply price</button></fieldset></form>
    {filters.has_bestsellers&&<label className="filter-choice"><input type="checkbox" checked={params.get('bestseller')==='true'} onChange={e=>setSingle({bestseller:e.target.checked?'true':''})}/>Bestsellers</label>}
    {filters.has_new_arrivals&&<label className="filter-choice"><input type="checkbox" checked={params.get('new_arrival')==='true'} onChange={e=>setSingle({new_arrival:e.target.checked?'true':''})}/>New arrivals</label>}
  </>;
}
