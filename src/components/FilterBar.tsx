"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";

export interface Filters {
  search: string;
  category: string | null;
  brandId: string | null;
  color: string | null;
  size: string | null;
  minPrice: string;
  maxPrice: string;
  sort: "newest" | "oldest" | "price_high" | "price_low" | "name_az";
  favoritesOnly: boolean;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  itemCount: number;
}

export default function FilterBar({
  filters,
  onChange,
  categories,
  brands,
  itemCount,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (partial: Partial<Filters>) => {
    onChange({ ...filters, ...partial });
  };

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.brandId ? 1 : 0) +
    (filters.color ? 1 : 0) +
    (filters.size ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search + filter toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="text"
            placeholder="Search by name, brand, category..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            showAdvanced || activeFilterCount > 0
              ? "bg-white text-black"
              : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-600"
          }`}
        >
          <SlidersHorizontal size={14} />
          {activeFilterCount > 0 && (
            <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick category chips */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => update({ favoritesOnly: !filters.favoritesOnly })}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filters.favoritesOnly
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          ♥ Favorites
        </button>
        <button
          onClick={() => update({ category: null })}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !filters.category
              ? "bg-white text-black"
              : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          All
        </button>
        {categories.slice(0, 6).map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              update({
                category: filters.category === cat.id ? null : cat.id,
              })
            }
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filters.category === cat.id
                ? "bg-white text-black"
                : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Brand filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Brand
              </label>
              <select
                value={filters.brandId || ""}
                onChange={(e) =>
                  update({ brandId: e.target.value || null })
                }
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none"
              >
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Color filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Color
              </label>
              <input
                type="text"
                placeholder="e.g., Black, Blue"
                value={filters.color || ""}
                onChange={(e) => update({ color: e.target.value || null })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>

            {/* Size filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Size
              </label>
              <input
                type="text"
                placeholder="e.g., M, 32, 9.5"
                value={filters.size || ""}
                onChange={(e) => update({ size: e.target.value || null })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Sort by
              </label>
              <select
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value as Filters["sort"] })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="price_high">Price: high → low</option>
                <option value="price_low">Price: low → high</option>
                <option value="name_az">Name: A → Z</option>
              </select>
            </div>
          </div>

          {/* Price range */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium whitespace-nowrap">
              Price
            </label>
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => update({ minPrice: e.target.value })}
              className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none"
            />
            <span className="text-neutral-600">—</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => update({ maxPrice: e.target.value })}
              className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <button
              onClick={() =>
                onChange({
                  search: "",
                  category: null,
                  brandId: null,
                  color: null,
                  size: null,
                  minPrice: "",
                  maxPrice: "",
                  sort: "newest",
                  favoritesOnly: false,
                })
              }
              className="text-xs text-neutral-500 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Item count */}
      <p className="text-xs text-neutral-500">
        {itemCount} item{itemCount !== 1 ? "s" : ""}
        {activeFilterCount > 0 && ` (filtered)`}
      </p>
    </div>
  );
}