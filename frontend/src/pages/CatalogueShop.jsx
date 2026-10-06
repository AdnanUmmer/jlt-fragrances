import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {SlidersHorizontal,X} from 'lucide-react';
import http from '../lib/api';
import {ProductGrid} from '../components/ProductCard';
import CatalogueFilters,{groups} from '../components/CatalogueFilters';

export default function Shop(){
  const [params,setParams]=useSearchParams();const query=params.toString();
  const stable=useMemo(()=>new URLSearchParams(query),[query]);
  const [data,setData]=useState({items:[],total:0});const [filters,setFilters]=useState(null);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [filterError,setFilterError]=useState('');
  const [retry,setRetry]=useState(0);const [search,setSearch]=useState(params.get('q')||'');const [open,setOpen]=useState(false);
  const dialog=useRef(null);const page=Math.max(1,Number(params.get('page'))||1);
  useEffect(()=>setSearch(stable.get('q')||''),[stable]);
  useEffect(()=>{const controller=new AbortController();setFilterError('');http.get('/products/filters',{signal:controller.signal}).then(r=>setFilters(r.data)).catch(e=>{if(e.code!=='ERR_CANCELED')setFilterError('Filters could not load.');});return()=>controller.abort();},[retry]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');const qp=new URLSearchParams(query);qp.set('limit','24');
    http.get(`/products?${qp}`,{signal:controller.signal}).then(r=>setData(r.data)).catch(e=>{if(e.code!=='ERR_CANCELED')setError(typeof e.response?.data?.detail==='string'?e.response.data.detail:"We couldn't load the fragrances. Please try again.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[query,retry]);
  useEffect(()=>{if(open){dialog.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};}dialog.current?.close();},[open]);
  const setSingle=changes=>{const next=new URLSearchParams(params);for(const[k,v]of Object.entries(changes)){next.delete(k);if(v!==''&&v!=null)next.set(k,v);}if(!('page'in changes))next.delete('page');setParams(next);};
  const toggle=(name,value)=>{const next=new URLSearchParams(params);const old=next.getAll(name);const active=old.some(x=>x.toLowerCase()===value.toLowerCase());next.delete(name);old.filter(x=>x.toLowerCase()!==value.toLowerCase()).forEach(v=>next.append(name,v));if(!active)next.append(name,value);next.delete('page');setParams(next);};
  const clear=()=>setParams({});const selected=[...params.entries()].filter(([k])=>!['sort','page','limit'].includes(k));
  const panel=filters?<CatalogueFilters filters={filters} params={stable} toggle={toggle} setSingle={setSingle}/>:<p className="text-sm">{filterError||'Loading filters…'}{filterError&&<button className="underline ml-2" onClick={()=>setRetry(n=>n+1)}>Retry</button>}</p>;
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10" data-testid="shop-page">
    <div className="flex items-end justify-between flex-wrap gap-4 mb-6"><div><div className="text-xs tracking-[0.3em] uppercase text-jlt-gold">Shop All</div><h1 className="font-display text-4xl sm:text-5xl mt-2">Just Like That Collection</h1><p className="text-sm mt-2" role="status">{loading?'Finding fragrances…':error?'Catalogue unavailable':`${data.total} fragrances`}</p></div><div className="flex flex-wrap gap-2 items-center"><button onClick={()=>setOpen(true)} className="btn-outline lg:hidden" data-testid="toggle-filters"><SlidersHorizontal size={16}/>Filters{selected.length?` (${selected.length})`:''}</button><select aria-label="Sort fragrances" className="input-luxe !w-auto max-w-full" value={params.get('sort')||'popular'} onChange={e=>setSingle({sort:e.target.value})}><option value="popular">Featured</option><option value="price_asc">Price: Low to high</option><option value="price_desc">Price: High to low</option><option value="rating">Highest rated</option><option value="new">Newest</option></select></div></div>
    <form className="flex gap-2 mb-5" role="search" onSubmit={e=>{e.preventDefault();setSingle({q:search.trim()});}}><input aria-label="Search fragrances" placeholder="Search names, brands, notes…" className="input-luxe" value={search} onChange={e=>setSearch(e.target.value)}/><button className="btn-primary !px-4">Search</button></form>
    {selected.length>0&&<div className="flex flex-wrap gap-2 mb-5" aria-label="Selected filters">{selected.map(([k,v],i)=><button key={`${k}-${v}-${i}`} className="chip" onClick={()=>groups.some(([g])=>g===k)?toggle(k,v):setSingle({[k]:''})} aria-label={`Remove ${k}: ${v}`}>{k.replace('_',' ')}: {v}<X size={13}/></button>)}<button className="underline text-sm px-2 min-h-11" onClick={clear}>Clear all</button></div>}
    <div className="grid lg:grid-cols-[250px_minmax(0,1fr)] gap-7"><aside className="hidden lg:block" aria-label="Fragrance filters">{panel}</aside><div className="min-w-0" aria-busy={loading}>
      {loading?<div className="grid grid-cols-2 md:grid-cols-3 gap-5" aria-label="Loading products">{[0,1,2,3,4,5].map(i=><div key={i} className="bg-jlt-bone aspect-[3/4] animate-pulse rounded"/>)}</div>:error?<div className="p-8 bg-white border" role="alert"><p>{error}</p><button onClick={()=>setRetry(n=>n+1)} className="btn-outline mt-4">Retry</button><button onClick={clear} className="underline ml-3">Clear filters</button></div>:!data.items.length?<div className="bg-white border p-8 sm:p-14 text-center"><h2 className="font-display text-3xl">No fragrances found</h2><p className="mt-2 text-sm">Try removing a filter or choosing a different note.</p><button onClick={clear} className="btn-primary mt-5">Clear filters</button></div>:<ProductGrid items={data.items}/>}
      {!loading&&data.total>24&&<div className="flex flex-wrap justify-center items-center gap-3 mt-10"><button disabled={page===1} onClick={()=>setSingle({page:page-1})} className="btn-outline">Previous</button><span className="text-sm">{page} / {Math.ceil(data.total/24)}</span><button disabled={page*24>=data.total} onClick={()=>setSingle({page:page+1})} className="btn-outline">Next</button></div>}
    </div></div>
    <dialog ref={dialog} className="filter-dialog" aria-labelledby="filter-title" onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}><div className="filter-sheet"><div className="flex justify-between items-center border-b p-4"><h2 id="filter-title" className="font-display text-2xl">Find your fragrance</h2><button onClick={()=>setOpen(false)} aria-label="Close filters" className="tap-target"><X/></button></div><div className="overflow-y-auto px-5 flex-1 min-h-0">{panel}</div><div className="flex gap-3 border-t p-4"><button onClick={clear} className="btn-outline">Clear</button><button onClick={()=>setOpen(false)} className="btn-primary flex-1 justify-center">{loading?'Apply filters':`Show ${data.total} fragrances`}</button></div></div></dialog>
  </div>;
}
