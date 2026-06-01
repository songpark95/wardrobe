"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart } from "lucide-react";

interface HeartButtonProps {
  itemId: string;
  isFavorite: boolean;
  onToggle: (itemId: string, isFavorite: boolean) => void;
  size?: number;
}

export default function HeartButton({
  itemId,
  isFavorite,
  onToggle,
  size = 14,
}: HeartButtonProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation(); // Don't trigger parent click
      if (loading) return;
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      if (isFavorite) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", itemId);
        onToggle(itemId, false);
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: user.id, item_id: itemId });
        onToggle(itemId, true);
      }
      setLoading(false);
    },
    [itemId, isFavorite, onToggle, supabase, loading]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`p-1.5 rounded-full transition-colors ${
        isFavorite
          ? "text-red-500 hover:text-red-400"
          : "text-neutral-600 hover:text-red-400"
      }`}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        size={size}
        fill={isFavorite ? "currentColor" : "none"}
        strokeWidth={isFavorite ? 0 : 1.5}
      />
    </button>
  );
}