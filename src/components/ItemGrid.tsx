"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import ItemCard from "./ItemCard";
import FilterBar, { type Filters } from "./FilterBar";

export interface Item {
  id: string;
  name: string | null;
  category: string | null;
  category_id: string | null;
  brand: string | null;
  brands: { id: string; name: string }[];
  color: string | null;
  material: string | null;
  size: string | null;
  location: string | null;
  condition: string | null;
  purchase_price: number | null;
  price_modifier: string | null;
  created_at: string;
}

interface ItemGridProps {
  refreshTrigger: number;
  onItemClick?: (item: Item) => void;
}

const defaultFilters: Filters = {
  search: "",
  category: null,
  brandId: null,
  color: null,
  size: null,
  minPrice: "",
  maxPrice: "",
  sort: "newest",
  favoritesOnly: false,
};

export default function ItemGrid({ refreshTrigger, onItemClick }: ItemGridProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(true);

  // Reference data for filters
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    loadAll();
  }, [refreshTrigger]);

  async function loadAll() {
    setLoading(true);

    // Load items
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const itemIds = data.map((i) => i.id);

    // Load brands in parallel
    const { data: brandData } = await supabase
      .from("item_brands")
      .select("item_id, brands(id, name)")
      .in("item_id", itemIds);

    const brandMap: Record<string, { id: string; name: string }[]> = {};
    if (brandData) {
      for (const row of brandData) {
        if (!brandMap[row.item_id]) brandMap[row.item_id] = [];
        if (row.brands) brandMap[row.item_id].push(row.brands as any);
      }
    }

    // Load favorites
    const { data: { user } } = await supabase.auth.getUser();
    const favIds = new Set<string>();
    if (user) {
      const { data: favData } = await supabase
        .from("favorites")
        .select("item_id")
        .eq("user_id", user.id);
      if (favData) {
        for (const f of favData) favIds.add(f.item_id);
      }
    }
    setFavoriteIds(favIds);

    // Load categories for filter bar
    const { data: catData } = await supabase
      .from("categories")
      .select("id, name")
      .eq("is_default", true)
      .order("name");
    if (catData) setCategories(catData);

    // Load brands for filter bar
    const { data: allBrands } = await supabase
      .from("brands")
      .select("id, name")
      .order("name");
    if (allBrands) setBrands(allBrands);

    setItems(
      data.map((i) => ({
        ...i,
        brands: brandMap[i.id] || [],
      }))
    );
    setLoading(false);

    // Load photos
    if (itemIds.length > 0) {
      const { data: photoData } = await supabase
        .from("item_photos")
        .select("item_id, storage_path")
        .in("item_id", itemIds);

      if (photoData) {
        const photoMap: Record<string, string> = {};
        for (const p of photoData) {
          if (!photoMap[p.item_id]) {
            const { data: urlData } = supabase.storage
              .from("item-photos")
              .getPublicUrl(p.storage_path);
            photoMap[p.item_id] = urlData.publicUrl;
          }
        }
        setPhotos(photoMap);
      }
    }
  }

  const handleFavoriteToggle = (itemId: string, isFavorite: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorite) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  // Filter + sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.brand?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.color?.toLowerCase().includes(q) ||
          item.material?.toLowerCase().includes(q) ||
          item.brands.some((b) => b.name.toLowerCase().includes(q))
      );
    }

    // Category
    if (filters.category) {
      result = result.filter((item) => item.category_id === filters.category);
    }

    // Brand
    if (filters.brandId) {
      result = result.filter((item) =>
        item.brands.some((b) => b.id === filters.brandId)
      );
    }

    // Color
    if (filters.color) {
      const q = filters.color.toLowerCase();
      result = result.filter((item) =>
        item.color?.toLowerCase().includes(q)
      );
    }

    // Size
    if (filters.size) {
      const q = filters.size.toLowerCase();
      result = result.filter((item) =>
        item.size?.toLowerCase().includes(q)
      );
    }

    // Price range
    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      if (!isNaN(min)) {
        result = result.filter((item) =>
          item.purchase_price != null && item.purchase_price >= min
        );
      }
    }
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      if (!isNaN(max)) {
        result = result.filter((item) =>
          item.purchase_price != null && item.purchase_price <= max
        );
      }
    }

    // Favorites only
    if (filters.favoritesOnly) {
      result = result.filter((item) => favoriteIds.has(item.id));
    }

    // Sort
    switch (filters.sort) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "price_high":
        result.sort((a, b) => (b.purchase_price || 0) - (a.purchase_price || 0));
        break;
      case "price_low":
        result.sort((a, b) => (a.purchase_price || 0) - (b.purchase_price || 0));
        break;
      case "name_az":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
    }

    return result;
  }, [items, filters, favoriteIds]);

  if (loading && items.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500 text-sm">
        Loading...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500 text-sm">
        No items yet. Add your first piece above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        categories={categories}
        brands={brands}
        itemCount={filteredItems.length}
      />

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-neutral-500 text-sm">
          No items match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <div key={item.id} onClick={() => onItemClick?.(item)}>
              <ItemCard
                item={item}
                primaryPhoto={photos[item.id] || null}
                isFavorite={favoriteIds.has(item.id)}
                onFavoriteToggle={handleFavoriteToggle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}