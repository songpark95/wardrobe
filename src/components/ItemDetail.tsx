"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Sparkles, ExternalLink, Camera } from "lucide-react";
import type { Item } from "./ItemGrid";

interface ItemDetailProps {
  item: Item;
  onUpdate: () => void;
  onClose: () => void;
}

export default function ItemDetail({ item, onUpdate, onClose }: ItemDetailProps) {
  const [name, setName] = useState(item.name || "");
  const [category, setCategory] = useState(item.category || "");
  const [brand, setBrand] = useState(item.brand || "");
  const [color, setColor] = useState(item.color || "");
  const [material, setMaterial] = useState(item.material || "");
  const [size, setSize] = useState(item.size || "");
  const [location, setLocation] = useState(item.location || "");
  const [condition, setCondition] = useState(item.condition || "");
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [aiDescription, setAiDescription] = useState("");
  const [listingDraft, setListingDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadPhotos();
    loadAnalysis();
  }, [item.id]);

  async function loadPhotos() {
    const { data } = await supabase
      .from("item_photos")
      .select("storage_path")
      .eq("item_id", item.id)
      .order("sort_order");

    if (data) {
      const urls = data.map((p) => {
        const { data: urlData } = supabase.storage
          .from("item-photos")
          .getPublicUrl(p.storage_path);
        return urlData.publicUrl;
      });
      setPhotos(urls);
    }
  }

  async function loadAnalysis() {
    const { data } = await supabase
      .from("item_analyses")
      .select("analysis_json, selling_description, draft_listing")
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setAiDescription(data.selling_description || "");
      setListingDraft(data.draft_listing || "");
    }
  }

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("items")
      .update({ name, category, brand, color, material, size, location, condition })
      .eq("id", item.id);
    setSaving(false);
    onUpdate();
  }

  async function generateSellDescription() {
    setGenerating(true);
    try {
      // Use OpenRouter vision API via our own endpoint
      const photoUrl = photos[0];
      const resp = await fetch("/api/describe-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl,
          brand: brand || "",
          category: category || "",
          color: color || "",
          material: material || "",
          size: size || "",
          condition: condition || "",
        }),
      });
      const data = await resp.json();

      setAiDescription(data.description || "");
      setListingDraft(data.listing || "");

      // Save to DB
      await supabase.from("item_analyses").insert({
        item_id: item.id,
        selling_description: data.description || "",
        draft_listing: data.listing || "",
      });
    } catch (err) {
      alert("Failed to generate description. Check your API key.");
    }
    setGenerating(false);
  }

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 space-y-5 sticky top-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h2 className="font-semibold text-lg">
          {name || "New item"}
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-neutral-800"
            />
          ))}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
          <input
            type="text"
            placeholder="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
          <input
            type="text"
            placeholder="Material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
          <input
            type="text"
            placeholder="Size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
          <input
            type="text"
            placeholder="Condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <input
          type="text"
          placeholder="Location (e.g., North closet, top shelf)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving..." : "Save"}
      </button>

      {/* AI Sell */}
      <div className="border-t border-neutral-800 pt-4 space-y-3">
        <h3 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
          <Sparkles size={14} className="text-yellow-400" />
          Sell this item
        </h3>

        {photos.length === 0 ? (
          <p className="text-xs text-neutral-500">
            Upload a photo first to generate a selling description.
          </p>
        ) : (
          <button
            onClick={generateSellDescription}
            disabled={generating}
            className="w-full py-2 bg-neutral-800 border border-neutral-700 text-sm rounded-lg hover:bg-neutral-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            {generating ? "Analyzing..." : "Generate selling description"}
          </button>
        )}

        {aiDescription && (
          <>
            <div className="space-y-1">
              <p className="text-xs text-neutral-500">AI Description</p>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {aiDescription}
              </p>
            </div>

            {listingDraft && (
              <div className="space-y-1">
                <p className="text-xs text-neutral-500">Listing Draft</p>
                <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-sans bg-neutral-800 p-3 rounded-lg">
                  {listingDraft}
                </pre>
              </div>
            )}

            <button
              onClick={() => {
                navigator.clipboard?.writeText(listingDraft || aiDescription);
              }}
              className="w-full py-2 border border-neutral-700 text-sm rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={14} />
              Copy listing text
            </button>
          </>
        )}
      </div>
    </div>
  );
}