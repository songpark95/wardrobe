"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Search, X } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import ItemGrid from "@/components/ItemGrid";
import ItemDetail from "@/components/ItemDetail";
import type { Item } from "@/components/ItemGrid";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
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

  const handleUploadComplete = useCallback(
    async (filePath: string, publicUrl: string) => {
      // Create item record
      const { data: item, error } = await supabase
        .from("items")
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) {
        alert("Failed to create item: " + error.message);
        return;
      }

      // Create photo record
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
      <header className="flex items-center justify-between mb-8">
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
      </div>

      {/* Upload zone (collapsible) */}
      {showUpload && (
        <div className="mb-8">
          <UploadZone onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {/* Main content */}
      <div className={selectedItem ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : ""}>
        <div className={selectedItem ? "lg:col-span-2" : ""}>
          <ItemGrid refreshTrigger={refreshTrigger} onItemClick={setSelectedItem} />
        </div>

        {/* Detail panel */}
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
    </div>
  );
}
