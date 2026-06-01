"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Sparkles, ExternalLink, Plus, Image, Search } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import BrandSelect from "./BrandSelect";
import type { Item } from "./ItemGrid";

interface ItemDetailProps {
  item: Item;
  onUpdate: () => void;
  onClose: () => void;
}

export default function ItemDetail({ item, onUpdate, onClose }: ItemDetailProps) {
  const [name, setName] = useState(item.name || "");
  const [categoryId, setCategoryId] = useState<string | null>(item.category_id || null);
  const [brandIds, setBrandIds] = useState<string[]>(item.brands?.map((b) => b.id) || []);
  const [color, setColor] = useState(item.color || "");
  const [material, setMaterial] = useState(item.material || "");
  const [size, setSize] = useState(item.size || "");
  const [location, setLocation] = useState(item.location || "");
  const [condition, setCondition] = useState(item.condition || "");
  const [purchasePrice, setPurchasePrice] = useState(item.purchase_price?.toString() || "");
  const [priceModifier, setPriceModifier] = useState(item.price_modifier || "");

  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState("");
  const [listingDraft, setListingDraft] = useState("");
  const [generating, setGenerating] = useState(false);

  // Image search
  const [searchResults, setSearchResults] = useState<{ url: string; thumbnail: string | null }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Reference data
  const [categories, setCategories] = useState<{ id: string; name: string; is_default?: boolean }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    loadPhotos();
    loadAnalysis();
    loadReferenceData();
  }, [item.id]);

  async function loadReferenceData() {
    // Load categories
    const { data: catData } = await supabase
      .from("categories")
      .select("id, name, is_default")
      .order("is_default", { ascending: false })
      .order("name");
    if (catData) setCategories(catData);

    // Load brands
    const { data: brandData } = await supabase
      .from("brands")
      .select("id, name")
      .order("name");
    if (brandData) setBrands(brandData);
  }

  async function loadPhotos() {
    const { data } = await supabase
      .from("item_photos")
      .select("id, storage_path")
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

  async function addPhoto(file: File) {
    const ext = file.name.split(".").pop();
    const filePath = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("item-photos")
      .upload(filePath, file);

    if (error) {
      alert("Upload failed: " + error.message);
      return;
    }

    await supabase.from("item_photos").insert({
      item_id: item.id,
      storage_path: filePath,
      sort_order: photos.length,
    });

    loadPhotos();
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

    // Update item fields
    await supabase
      .from("items")
      .update({
        name,
        color,
        material,
        size,
        location,
        condition,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        price_modifier: priceModifier || null,
      })
      .eq("id", item.id);

    // Update brands: delete existing, insert new
    await supabase.from("item_brands").delete().eq("item_id", item.id);
    if (brandIds.length > 0) {
      const brandInserts = brandIds.map((brandId) => ({
        item_id: item.id,
        brand_id: brandId,
      }));
      await supabase.from("item_brands").insert(brandInserts);
    }

    // Update category
    if (categoryId) {
      const { data: cat } = await supabase
        .from("categories")
        .select("name")
        .eq("id", categoryId)
        .single();
      if (cat) {
        await supabase
          .from("items")
          .update({ category: cat.name })
          .eq("id", item.id);
      }
    } else {
      await supabase
        .from("items")
        .update({ category: null })
        .eq("id", item.id);
    }

    setSaving(false);
    onUpdate();
  }

  const handleAddCategory = useCallback(
    async (name: string) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name, is_default: false, user_id: (await supabase.auth.getUser()).data.user?.id })
        .select("id, name, is_default")
        .single();

      if (!error && data) {
        setCategories((prev) => [...prev, data]);
        setCategoryId(data.id);
      }
    },
    [supabase]
  );

  const handleAddBrand = useCallback(
    async (name: string) => {
      const { data, error } = await supabase
        .from("brands")
        .insert({ name })
        .select("id, name")
        .single();

      if (!error && data) {
        setBrands((prev) => [...prev, data]);
        setBrandIds((prev) => [...prev, data.id]);
      }
    },
    [supabase]
  );

  async function searchOnline() {
    setSearching(true);
    setSearchResults(null);
    try {
      const brandNames = brands.filter((b) => brandIds.includes(b.id)).map((b) => b.name).join(", ");
      const catName = categories.find((c) => c.id === categoryId)?.name || "";

      const resp = await fetch("/api/search-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          brand: brandNames,
          category: catName,
          color,
        }),
      });
      const data = await resp.json();
      setSearchResults(data.images || []);
    } catch (err) {
      console.error("Search failed:", err);
    }
    setSearching(false);
  }

  async function importImage(imageUrl: string) {
    setDownloading(imageUrl);
    try {
      // Download the image
      const blobResp = await fetch(imageUrl);
      const blob = await blobResp.blob();
      const ext = blob.type?.split("/")[1] || "jpg";
      const filePath = `${crypto.randomUUID()}.${ext}`;
      const file = new File([blob], filePath, { type: blob.type });

      // Upload to Supabase
      const { error } = await supabase.storage
        .from("item-photos")
        .upload(filePath, file);

      if (error) {
        alert("Import failed: " + error.message);
        return;
      }

      // Create photo record
      await supabase.from("item_photos").insert({
        item_id: item.id,
        storage_path: filePath,
        sort_order: photos.length,
      });

      setSearchResults((prev) =>
        prev?.filter((r) => r.url !== imageUrl) || null
      );
      loadPhotos();
    } catch (err) {
      alert("Failed to download image. The URL may not be accessible.");
    }
    setDownloading(null);
  }

  async function generateSellDescription() {
    setGenerating(true);
    try {
      const photoUrl = photos[0];
      const brandNames = brands.filter((b) => brandIds.includes(b.id)).map((b) => b.name).join(", ");
      const catName = categories.find((c) => c.id === categoryId)?.name || "";

      const resp = await fetch("/api/describe-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl,
          brand: brandNames,
          category: catName,
          color,
          material,
          size,
          condition,
        }),
      });
      const data = await resp.json();

      setAiDescription(data.description || "");
      setListingDraft(data.listing || "");

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
    <>
      {/* Expanded photo overlay */}
      {expandedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
        >
          <img
            src={expandedPhoto}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setExpandedPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
      )}

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
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                onClick={() => setExpandedPhoto(url)}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-neutral-800 cursor-pointer hover:opacity-80 transition-opacity"
              />
            ))}
            {/* Add photo button */}
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-neutral-700 flex items-center justify-center cursor-pointer hover:border-neutral-500 transition-colors flex-shrink-0">
              <Plus size={18} className="text-neutral-500" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addPhoto(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {/* Search online button */}
          <button
            type="button"
            onClick={searchOnline}
            disabled={searching}
            className="w-full py-2 bg-neutral-800 border border-neutral-700 text-xs rounded-lg hover:bg-neutral-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Search size={12} />
            {searching ? "Searching..." : "Search online for product images"}
          </button>

          {/* Search results */}
          {searchResults && searchResults.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 font-medium">
                Select an image to import
              </p>
              <div className="grid grid-cols-3 gap-2">
                {searchResults.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => importImage(img.url)}
                    disabled={downloading === img.url}
                    className="aspect-square bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700 hover:border-neutral-500 transition-colors disabled:opacity-50"
                  >
                    {downloading === img.url ? (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                        Saving...
                      </div>
                    ) : (
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23555'><rect width='24' height='24'/></svg>";
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchResults && searchResults.length === 0 && !searching && (
            <p className="text-xs text-neutral-500 mt-1">
              No images found. Try adding more details (name, brand, category).
            </p>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />

          {/* Brand multi-select */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
              Brands
            </label>
            <BrandSelect
              brands={brands}
              selectedIds={brandIds}
              onChange={setBrandIds}
              onAddNew={handleAddBrand}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
              Category
            </label>
            <SearchableSelect
              options={categories}
              value={categoryId}
              onChange={setCategoryId}
              onAddNew={handleAddCategory}
              placeholder="Select category..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Color
              </label>
              <input
                type="text"
                placeholder="e.g., Black"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Material
              </label>
              <input
                type="text"
                placeholder="e.g., Cotton"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Size
              </label>
              <input
                type="text"
                placeholder="e.g., M, 32, 9.5"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Condition
              </label>
              <input
                type="text"
                placeholder="e.g., Like new"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          <input
            type="text"
            placeholder="Location (e.g., North closet, top shelf)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />

          {/* Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Modifier
              </label>
              <input
                type="text"
                placeholder="e.g., Sold for, Estimated"
                value={priceModifier}
                onChange={(e) => setPriceModifier(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
            </div>
          </div>
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
    </>
  );
}