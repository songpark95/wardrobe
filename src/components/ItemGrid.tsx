"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ItemCard from "./ItemCard";

export interface Item {
  id: string;
  name: string | null;
  category: string | null;
  category_id: string | null;
  brand: string | null; // legacy
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

export default function ItemGrid({ refreshTrigger, onItemClick }: ItemGridProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadItems();
  }, [refreshTrigger]);

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase.from("items").select("*").order("created_at", { ascending: false });
    if (!data) { setLoading(false); return; }

    // Load brands for all items
    const itemIds = data.map((i) => i.id);
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

    const itemsWithBrands: Item[] = data.map((i) => ({
      ...i,
      brands: brandMap[i.id] || [],
    }));

    setItems(itemsWithBrands);
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.id} onClick={() => onItemClick?.(item)}>
          <ItemCard item={item} primaryPhoto={photos[item.id] || null} />
        </div>
      ))}
    </div>
  );
}