"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Sparkles, Shirt, Check, Plus } from "lucide-react";
import type { Item } from "./ItemGrid";

interface OutfitBuilderProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function OutfitBuilder({ onClose, onSaved }: OutfitBuilderProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Analysis results
  const [mood, setMood] = useState("");
  const [palette, setPalette] = useState<string[]>([]);
  const [outfitName, setOutfitName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // For collage generation
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<Record<string, string>>({});

  const supabase = createClient();

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Load primary photos
      const { data: photoData } = await supabase
        .from("item_photos")
        .select("item_id, storage_path")
        .eq("is_primary", true)
        .in("item_id", data.map((i) => i.id));

      const urls: Record<string, string> = {};
      if (photoData) {
        for (const p of photoData) {
          const { data: urlData } = supabase.storage
            .from("item-photos")
            .getPublicUrl(p.storage_path);
          urls[p.item_id] = urlData.publicUrl;
        }
      }
      setSelectedPhotoUrls(urls);

      // Load brands
      const { data: brandData } = await supabase
        .from("item_brands")
        .select("item_id, brands(id, name)")
        .in("item_id", data.map((i) => i.id));

      const brandMap: Record<string, { id: string; name: string }[]> = {};
      if (brandData) {
        for (const row of brandData) {
          if (!brandMap[row.item_id]) brandMap[row.item_id] = [];
          if (row.brands) brandMap[row.item_id].push(row.brands as any);
        }
      }

      setItems(
        data.map((i) => ({
          ...i,
          brands: brandMap[i.id] || [],
        }))
      );
    }
    setLoading(false);
  }

  const toggleItem = useCallback((itemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  async function analyzeOutfit() {
    if (selectedIds.length < 2) return;
    setAnalyzing(true);
    setMood("");
    setPalette([]);
    setOutfitName("");

    try {
      const resp = await fetch("/api/analyze-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedIds }),
      });
      const data = await resp.json();
      setMood(data.mood || "");
      setPalette(data.palette || []);
      setOutfitName(data.name || "");
    } catch (err) {
      console.error("Analysis failed:", err);
    }
    setAnalyzing(false);
  }

  async function saveOutfit() {
    if (selectedIds.length < 2) return;

    // Find item positions (sort by category group: top → middle → bottom)
    const ordered = [...selectedIds];
    // Simple heuristic: tops first, then bottoms, then footwear, others at end
    const categoryOrder: Record<string, number> = {
      tops: 0, shirting: 0, sweaters: 1, jackets: 1, coats: 1, outerwear: 1,
      bottoms: 2, denim: 2, tailoring: 2, suits: 2,
      footwear: 3,
    };
    ordered.sort((a, b) => {
      const itemA = items.find((i) => i.id === a);
      const itemB = items.find((i) => i.id === b);
      const posA = categoryOrder[(itemA?.category || "").toLowerCase()] ?? 4;
      const posB = categoryOrder[(itemB?.category || "").toLowerCase()] ?? 4;
      return posA - posB;
    });

    const { data: outfit, error } = await supabase
      .from("outfits")
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        name: outfitName || "Unnamed outfit",
        occasion: occasion || null,
        date: date || null,
        mood: mood || null,
        palette: palette.length > 0 ? palette : null,
      })
      .select()
      .single();

    if (error || !outfit) {
      alert("Failed to save outfit: " + (error?.message || "Unknown error"));
      return;
    }

    // Insert outfit items
    const outfitItems = ordered.map((itemId, idx) => ({
      outfit_id: outfit.id,
      item_id: itemId,
      position: idx,
    }));
    await supabase.from("outfit_items").insert(outfitItems);

    onSaved();
    onClose();
  }

  const selectedItems = items.filter((i) => selectedIds.includes(i.id));
  const gridCols = selectedItems.length <= 3 ? `grid-cols-${selectedItems.length}` : "grid-cols-3";

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Shirt size={18} />
            Build an outfit
          </h2>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Item selector */}
          <div>
            <p className="text-xs text-neutral-500 mb-3">
              Select {Math.max(2, 3 - selectedIds.length)} more items
            </p>
            {loading ? (
              <p className="text-sm text-neutral-500">Loading...</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const photoUrl = selectedPhotoUrls[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className={`p-2 rounded-lg border transition-all text-left ${
                        isSelected
                          ? "border-white bg-neutral-800"
                          : "border-neutral-800 hover:border-neutral-600"
                      }`}
                    >
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={item.name || ""}
                          className="w-full aspect-square object-cover rounded-md mb-1.5"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-neutral-800 rounded-md mb-1.5 flex items-center justify-center">
                          <Shirt size={16} className="text-neutral-600" />
                        </div>
                      )}
                      <div className="text-xs truncate">
                        {item.name || "Unnamed item"}
                      </div>
                      {item.category && (
                        <div className="text-[10px] text-neutral-500">
                          {item.category}
                        </div>
                      )}
                      {isSelected && (
                        <Check size={12} className="text-white mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected items preview */}
          {selectedItems.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-2">Selected ({selectedItems.length})</p>
              <div className="grid grid-cols-2 gap-3">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center bg-neutral-800 rounded-lg p-3">
                    {selectedPhotoUrls[item.id] && (
                      <img
                        src={selectedPhotoUrls[item.id]}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{item.name || "Unnamed"}</div>
                      <div className="text-xs text-neutral-400">
                        {[item.category, item.color, item.size]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyze button */}
          {selectedIds.length >= 2 && (
            <button
              type="button"
              onClick={analyzeOutfit}
              disabled={analyzing}
              className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              {analyzing ? "Analyzing..." : "Analyze outfit"}
            </button>
          )}

          {/* Results */}
          {(mood || palette.length > 0 || outfitName) && (
            <div className="space-y-4 border-t border-neutral-800 pt-4">
              {/* Outfit name */}
              {outfitName && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 font-medium">
                    Name
                  </p>
                  <p className="text-lg font-semibold">{outfitName}</p>
                </div>
              )}

              {/* Mood */}
              {mood && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 font-medium">
                    Mood
                  </p>
                  <p className="text-sm text-neutral-300 leading-relaxed">{mood}</p>
                </div>
              )}

              {/* Color palette */}
              {palette.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 font-medium">
                    Color palette
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {palette.map((hex, i) => (
                      <div key={i} className="flex items-center gap-2 bg-neutral-800 rounded-lg px-3 py-1.5">
                        <div
                          className="w-5 h-5 rounded"
                          style={{ backgroundColor: hex }}
                        />
                        <span className="text-xs font-mono text-neutral-300">{hex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collage preview */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 font-medium">
                  Collage
                </p>
                <div className={`grid ${gridCols} gap-2 bg-neutral-950 rounded-lg p-4`}>
                  {selectedItems.map((item, idx) => (
                    <div key={item.id} className="relative">
                      {selectedPhotoUrls[item.id] ? (
                        <img
                          src={selectedPhotoUrls[item.id]}
                          alt=""
                          className="w-full aspect-[3/4] object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-neutral-800 rounded-lg flex items-center justify-center">
                          <Shirt size={20} className="text-neutral-600" />
                        </div>
                      )}
                      {palette[idx] && (
                        <div
                          className="absolute bottom-2 left-2 right-2 h-1 rounded-full"
                          style={{ backgroundColor: palette[idx] }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1 font-medium">
                    Occasion
                  </label>
                  <input
                    type="text"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    placeholder="e.g., Date night, Work"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1 font-medium">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              {/* Save */}
              <button
                type="button"
                onClick={saveOutfit}
                className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Save outfit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}