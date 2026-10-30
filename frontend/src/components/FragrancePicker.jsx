import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "./ui/command";

export default function FragrancePicker({ products, value, onChange, label, dark }) {
  const [open, setOpen] = useState(false);
  const selected = products.find(product => product.slug === value);
  return <div>
    <span className="block text-xs mb-2">{label}</span>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${label}: ${selected ? selected.name : "Choose fragrance"}`} aria-expanded={open}
          className={`w-full min-h-[48px] flex items-center justify-between gap-3 border px-3 py-2 text-left text-sm transition-colors hover:border-jlt-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jlt-gold ${dark ? "bg-jlt-black text-jlt-ivory border-jlt-ivory/30" : "bg-jlt-ivory text-jlt-black border-jlt-black/20"}`}>
          <span className="min-w-0"><span className="block truncate">{selected?.name || "Choose fragrance"}</span>{selected && <span className="block text-xs opacity-60 truncate">{selected.brand_inspiration}</span>}</span>
          <ChevronsUpDown size={16} className="shrink-0 text-jlt-gold" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-32px)] p-0 rounded-none border-jlt-gold bg-jlt-ivory shadow-xl">
        <Command className="rounded-none bg-jlt-ivory text-jlt-black">
          <CommandInput placeholder="Search perfume or brand…" aria-label={`Search ${label.toLowerCase()}`} className="h-12" />
          <CommandList className="max-h-64 overscroll-contain">
            <CommandEmpty>No fragrances found. Try another perfume or brand.</CommandEmpty>
            {products.map(product => <CommandItem key={product.slug} value={`${product.name} ${product.brand_inspiration} ${product.slug}`}
              onSelect={() => { onChange(product.slug); setOpen(false); }}
              className="rounded-none px-3 py-3 cursor-pointer data-[selected=true]:bg-jlt-bone data-[selected=true]:text-jlt-black">
              <span className="flex-1 min-w-0"><span className="block break-words">{product.name}</span><span className="block text-xs text-jlt-black/60">{product.brand_inspiration}</span></span>
              {value === product.slug && <Check size={16} className="text-jlt-gold shrink-0" />}
            </CommandItem>)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>;
}
