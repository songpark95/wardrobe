"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Sparkles, Camera, Shirt, X, Check, Loader2 } from "lucide-react";
import CollageExport from "./CollageExport";

interface AnalysisResult {
  items: {
    name: string;
    category: string;
    color: string;
    material: string;
    brandGuess: string;
    sizeGuess: string;
  }[];
  palette: string[];
  vibe: string;
  emotion: string;
  outfitName: string;
  matchingItemIds: string[];
  unmatchedItems: {
    name: string;
    category: string;
    color: string;
    material: string;
    brandGuess: string;
    sizeGuess: string;
  }[];
}

interface MatchedItem {
  id: string;
  name: string | null;
  category: string | null;
  photo: string | null;
}

export default function PhotoOutfitAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPhotoUrl(previewUrl);
    setResult(null);
    setMatchedItems([]);
    setSaved(false);

    // Upload to Supabase storage
    const ext = file.name.split(".").pop();
    const filePath = `outfit-analysis/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("item-photos")
      .upload(filePath, file);

    if (error) {
      alert("Upload failed: " + error.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("item-photos")
      .getPublicUrl(filePath);

    // Analyze the photo
    setAnalyzing(true);
    try {
      const resp = await fetch("/api/analyze-outfit-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: urlData.publicUrl,
        }),
      });
      const data = await resp.json();
      setResult(data);

      // Load matched items
      if (data.matchingItemIds?.length > 0) {
        const { data: items } = await supabase
          .from("items")
          .select("id, name, category")
          .in("id", data.matchingItemIds);

        if (items) {
          const { data: photos } = await supabase
            .from("item_photos")
            .select("item_id, storage_path")
            .eq("is_primary", true)
            .in("item_id", data.matchingItemIds);

          const photoMap: Record<string, string> = {};
          if (photos) {
            for (const p of photos) {
              const { data: urlData } = supabase.storage
                .from("item-photos")
                .getPublicUrl(p.storage_path);
              photoMap[p.item_id] = urlData.publicUrl;
            }
          }

          setMatchedItems(
            items.map((i) => ({
              ...i,
              photo: photoMap[i.id] || null,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    }
    setAnalyzing(false);
  }, [supabase]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  async function saveOutfit() {
    if (!result) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Create skeleton items for unmatched items
    const createdItemIds: string[] = [...(result.matchingItemIds || [])];

    for (const unmatched of result.unmatchedItems || []) {
      // Create or find brand
      let brandId: string | null = null;
      if (unmatched.brandGuess) {
        let { data: brand } = await supabase
          .from("brands")
          .select("id")
          .ilike("name", unmatched.brandGuess)
          .single();

        if (!brand) {
          const { data: newBrand } = await supabase
            .from("brands")
            .insert({ name: unmatched.brandGuess })
            .select("id")
            .single();
          brand = newBrand;
        }
        brandId = brand?.id || null;
      }

      // Find or create category
      let categoryId: string | null = null;
      if (unmatched.category) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", unmatched.category)
          .single();
        categoryId = cat?.id || null;
      }

      // Create item
      const { data: newItem } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          name: unmatched.name || null,
          category: unmatched.category || null,
          color: unmatched.color || null,
          material: unmatched.material || null,
          size: unmatched.sizeGuess || null,
        })
        .select("id")
        .single();

      if (newItem) {
        createdItemIds.push(newItem.id);

        // Link brand
        if (brandId) {
          await supabase.from("item_brands").insert({
            item_id: newItem.id,
            brand_id: brandId,
          });
        }
      }
    }

    // Save outfit
    const { data: outfit } = await supabase
      .from("outfits")
      .insert({
        user_id: user.id,
        name: result.outfitName || "Photo outfit",
        occasion: null,
        mood: result.vibe,
        palette: result.palette,
        notes: result.emotion ? `Emotion: ${result.emotion}` : null,
      })
      .select()
      .single();

    if (outfit && createdItemIds.length > 0) {
      const outfitItems = createdItemIds.map((itemId, idx) => ({
        outfit_id: outfit.id,
        item_id: itemId,
        position: idx,
      }));
      await supabase.from("outfit_items").insert(outfitItems);
    }

    setSaving(false);
    setSaved(true);
  }

  const emotionEmoji: Record<string, string> = {
    confidence: "🔥",
    rebellion: "⚡",
    serenity: "🕊️",
    power: "👑",
    melancholy: "🌧️",
    playfulness: "🎨",
    mystery: "🌑",
    elegance: "✨",
    nostalgia: "📸",
    urgency: "🚨",
    calm: "🌊",
    boldness: "💥",
    warmth: "☀️",
    edge: "🔪",
    grace: "🦢",
  };

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      {!photoUrl && (
        <div
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith("image/")) handleFile(file);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-800 rounded-xl p-8 text-center hover:border-neutral-600 transition-colors cursor-pointer"
        >
          <div className="flex justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-neutral-900 transition-colors"
            >
              <Camera size={28} className="text-neutral-400" />
              <span className="text-sm text-neutral-400">Camera</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-neutral-900 transition-colors"
            >
              <Upload size={28} className="text-neutral-400" />
              <span className="text-sm text-neutral-400">Upload</span>
            </button>
          </div>
          <p className="text-sm text-neutral-500">
            Upload a photo of a full outfit — we'll analyze the look
          </p>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Photo + analysis */}
      {photoUrl && (
        <div className="space-y-4">
          {/* Photo preview */}
          <div className="relative">
            <img
              src={photoUrl}
              alt="Outfit"
              className="w-full max-h-80 object-contain rounded-lg bg-neutral-800"
            />
            {!analyzing && !result && (
              <button
                onClick={() => {
                  setPhotoUrl(null);
                  setResult(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Analyzing spinner */}
          {analyzing && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 size={20} className="animate-spin text-neutral-400" />
              <span className="text-sm text-neutral-400">Analyzing outfit...</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-5">
              {/* Emotion badge */}
              {result.emotion && (
                <div className="text-center py-3 bg-neutral-900 rounded-xl border border-neutral-800">
                  <span className="text-2xl mr-2">
                    {emotionEmoji[result.emotion.toLowerCase()] || "💫"}
                  </span>
                  <span className="text-lg font-semibold capitalize">
                    {result.emotion}
                  </span>
                </div>
              )}

              {/* Outfit name + vibe */}
              {result.outfitName && (
                <div>
                  <h3 className="text-lg font-semibold">{result.outfitName}</h3>
                  {result.vibe && (
                    <p className="text-sm text-neutral-300 leading-relaxed mt-1">
                      {result.vibe}
                    </p>
                  )}
                </div>
              )}

              {/* Color palette */}
              {result.palette.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 font-medium">
                    Color palette
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {result.palette.map((hex, i) => (
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

              {/* Matched items from library */}
              {matchedItems.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 font-medium">
                    Items in your library ({matchedItems.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {matchedItems.map((item) => (
                      <div key={item.id} className="bg-neutral-800 rounded-lg p-2 flex items-center gap-2">
                        {item.photo ? (
                          <img src={item.photo} alt="" className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-neutral-700 rounded flex items-center justify-center">
                            <Shirt size={14} className="text-neutral-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{item.name || "Unnamed"}</div>
                          <div className="text-[10px] text-neutral-500">{item.category}</div>
                        </div>
                        <Check size={12} className="text-green-400 ml-auto shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched items (will be created as skeletons) */}
              {result.unmatchedItems?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 font-medium">
                    New items to add ({result.unmatchedItems.length})
                  </p>
                  <div className="space-y-1.5">
                    {result.unmatchedItems.map((item, i) => (
                      <div key={i} className="bg-neutral-800 rounded-lg px-3 py-2 flex items-center gap-3 text-xs">
                        <Shirt size={14} className="text-neutral-500 shrink-0" />
                        <span className="font-medium">{item.name}</span>
                        <span className="text-neutral-500">
                          {[item.category, item.color, item.material].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collage preview */}
              <CollageExport
                items={[
                  ...(result.matchingItemIds || []).map((id) => {
                    const item = matchedItems.find((m) => m.id === id);
                    return {
                      id,
                      name: item?.name || null,
                      photo: item?.photo || "",
                      category: item?.category || null,
                      color: null,
                    };
                  }),
                ]}
                palette={result.palette}
                outfitName={result.outfitName}
                mood={result.vibe}
              />

              {/* Save */}
              <button
                onClick={saveOutfit}
                disabled={saving || saved}
                className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors"
              >
                {saved ? "✓ Saved" : saving ? "Saving..." : "Save outfit to library"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}