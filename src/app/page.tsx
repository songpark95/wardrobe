"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Search, Shirt } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import ItemGrid from "@/components/ItemGrid";
import ItemDetail from "@/components/ItemDetail";
import OutfitBuilder from "@/components/OutfitBuilder";
import OutfitCard from "@/components/OutfitCard";
import PhotoOutfitAnalyzer from "@/components/PhotoOutfitAnalyzer";
import type { Item } from "@/components/ItemGrid";

type Tab = "library" | "outfits" | "analyze";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("library");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Outfits
  const [outfits, setOutfits] = useState<any[]>([]);
  const [outfitsLoading, setOutfitsLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setLoading(false);
    });
  }, [router, supabase.auth]);

  useEffect(() => {
    if (tab === "outfits" && user) {
      loadOutfits();
    }
  }, [tab, refreshTrigger, user]);

  const handleUploadComplete = useCallback(
    async (filePath: string, publicUrl: string) => {
      const { data: item, error } = await supabase
        .from("items")
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) {
        alert("Failed to create item: " + error.message);
        return;
      }

      await supabase.from("item_photos").insert({
        item_id: item.id,
        storage_path: filePath,
        is_primary: true,
      });

      setShowUpload(false);
      setRefreshTrigger((n) => n + 1);
      setSelectedItem(item);
    },
    [user, supabase]
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  async function loadOutfits() {
    setOutfitsLoading(true);
    const { data, error } = await supabase
      .from("outfits")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) { setOutfitsLoading(false); return; }

    // Load outfit items + photos for each outfit
    const outfitsWithItems = await Promise.all(
      data.map(async (outfit) => {
        const { data: items } = await supabase
          .from("outfit_items")
          .select("item_id, items(id, name), position")
          .eq("outfit_id", outfit.id)
          .order("position");

        const itemsList =
          items?.map((oi: any) => ({
            id: oi.item_id,
            name: oi.items?.name || null,
            photo: null as string | null,
          })) || [];

        // Load primary photos
        if (itemsList.length > 0) {
          const itemIds = itemsList.map((i) => i.id);
          const { data: photos } = await supabase
            .from("item_photos")
            .select("item_id, storage_path")
            .in("item_id", itemIds)
            .eq("is_primary", true);

          if (photos) {
            for (const p of photos) {
              const { data: urlData } = supabase.storage
                .from("item-photos")
                .getPublicUrl(p.storage_path);
              const found = itemsList.find((i: any) => i.id === p.item_id);
              if (found) found.photo = urlData.publicUrl;
            }
          }
        }

        return { ...outfit, items: itemsList };
      })
    );

    setOutfits(outfitsWithItems);
    setOutfitsLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Wardrobe</h1>
          <p className="text-sm text-neutral-500">
            {user.email?.split("@")[0]}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 text-neutral-500 hover:text-white transition-colors"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-900 rounded-lg p-1 mb-6 w-fit border border-neutral-800">
        <button
          onClick={() => setTab("library")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "library"
              ? "bg-neutral-800 text-white"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Library
        </button>
        <button
          onClick={() => setTab("outfits")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "outfits"
              ? "bg-neutral-800 text-white"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Outfits
        </button>
        <button
          onClick={() => setTab("analyze")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "analyze"
              ? "bg-neutral-800 text-white"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Analyze photo
        </button>
      </div>

      {/* Library tab */}
      {tab === "library" && (
        <>
          {/* Search + Add */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="text"
                placeholder="Search by name, brand, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
            </div>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                showUpload
                  ? "bg-white text-black"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-600"
              }`}
            >
              {showUpload ? "Cancel" : "+ Add item"}
            </button>
            {/* Quick build outfit button */}
            <button
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors flex items-center gap-2"
            >
              <Shirt size={14} />
              Build outfit
            </button>
          </div>

          {/* Upload zone (collapsible) */}
          {showUpload && (
            <div className="mb-8">
              <UploadZone onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {/* Main grid */}
          <div className={selectedItem ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : ""}>
            <div className={selectedItem ? "lg:col-span-2" : ""}>
              <ItemGrid
                refreshTrigger={refreshTrigger}
                onItemClick={setSelectedItem}
              />
            </div>

            {selectedItem && (
              <div className="lg:col-span-1">
                <ItemDetail
                  item={selectedItem}
                  onUpdate={() => setRefreshTrigger((n) => n + 1)}
                  onClose={() => setSelectedItem(null)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Outfits tab */}
      {tab === "outfits" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-neutral-500">
              {outfits.length} outfit{outfits.length !== 1 ? "s" : ""} saved
            </p>
            <button
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors flex items-center gap-2"
            >
              <Shirt size={14} />
              Build outfit
            </button>
          </div>

          {outfitsLoading ? (
            <div className="text-center py-12 text-neutral-500 text-sm">
              Loading...
            </div>
          ) : outfits.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <Shirt size={24} className="text-neutral-600" />
              </div>
              <p className="text-neutral-500 text-sm">
                No outfits yet. Build your first one.
              </p>
              <button
                onClick={() => setShowBuilder(true)}
                className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors inline-flex items-center gap-2"
              >
                <Shirt size={14} />
                Build outfit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {outfits.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Analyze photo tab */}
      {tab === "analyze" && (
        <div className="max-w-lg mx-auto">
          <p className="text-sm text-neutral-400 mb-4">
            Upload a photo of a full outfit — we'll analyze the look, extract colors, identify items, and match them to your library.
          </p>
          <PhotoOutfitAnalyzer />
        </div>
      )}

      {/* Outfit builder modal */}
      {showBuilder && (
        <OutfitBuilder
          onClose={() => setShowBuilder(false)}
          onSaved={() => {
            setRefreshTrigger((n) => n + 1);
            setTab("outfits");
          }}
        />
      )}
    </div>
  );
}