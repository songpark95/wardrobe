"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Plus, Check, ChevronDown } from "lucide-react";

interface Brand {
  id: string;
  name: string;
}

interface BrandSelectProps {
  brands: Brand[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onAddNew: (name: string) => void;
}

export default function BrandSelect({
  brands,
  selectedIds,
  onChange,
  onAddNew,
}: BrandSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBrands = brands.filter((b) => selectedIds.includes(b.id));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = search
    ? brands.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) &&
          !selectedIds.includes(b.id)
      )
    : brands.filter((b) => !selectedIds.includes(b.id));

  const handleToggle = useCallback(
    (brandId: string) => {
      if (selectedIds.includes(brandId)) {
        onChange(selectedIds.filter((id) => id !== brandId));
      } else {
        onChange([...selectedIds, brandId]);
      }
    },
    [selectedIds, onChange]
  );

  const handleAddNew = useCallback(() => {
    const trimmed = search.trim();
    if (trimmed) {
      onAddNew(trimmed);
      setSearch("");
    }
  }, [search, onAddNew]);

  const removeBrand = useCallback(
    (brandId: string) => {
      onChange(selectedIds.filter((id) => id !== brandId));
    },
    [selectedIds, onChange]
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger / pills area */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full min-h-[38px] px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-left flex items-center gap-1.5 flex-wrap hover:border-neutral-600 transition-colors"
      >
        {selectedBrands.length === 0 && (
          <span className="text-neutral-500">Brands</span>
        )}
        {selectedBrands.map((brand) => (
          <span
            key={brand.id}
            className="inline-flex items-center gap-1 bg-neutral-700 px-2 py-0.5 rounded text-xs text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {brand.name}
            <span
              onClick={(e) => {
                e.stopPropagation();
                removeBrand(brand.id);
              }}
              className="cursor-pointer hover:text-neutral-300"
            >
              <X size={12} />
            </span>
          </span>
        ))}
        <ChevronDown
          size={14}
          className={`text-neutral-500 ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-neutral-800">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands..."
              className="w-full px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-md text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {/* Add new */}
            {search.trim() && filtered.length === 0 && (
              <button
                type="button"
                onClick={handleAddNew}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-neutral-800 transition-colors"
              >
                <Plus size={14} className="text-neutral-400" />
                <span>Add &ldquo;{search.trim()}&rdquo; as brand</span>
              </button>
            )}

            {filtered.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleToggle(brand.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-neutral-800 transition-colors"
              >
                <span>{brand.name}</span>
                {selectedIds.includes(brand.id) && (
                  <Check size={14} className="text-white" />
                )}
              </button>
            ))}

            {filtered.length === 0 && !search.trim() && (
              <div className="px-3 py-4 text-sm text-neutral-500 text-center">
                All brands selected
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}