"use client";

import { Shirt, Calendar, Tag } from "lucide-react";

interface Outfit {
  id: string;
  name: string;
  occasion: string | null;
  date: string | null;
  mood: string | null;
  palette: string[] | null;
  items: { id: string; name: string | null; photo: string | null }[];
}

interface OutfitCardProps {
  outfit: Outfit;
}

export default function OutfitCard({ outfit }: OutfitCardProps) {
  const items = outfit.items.slice(0, 4);
  const remaining = Math.max(0, outfit.items.length - 4);

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden hover:border-neutral-700 transition-colors">
      {/* Item thumbnails */}
      <div className="grid grid-cols-2 gap-0.5 bg-neutral-950">
        {items.map((item, i) => (
          <div key={item.id} className="aspect-square bg-neutral-800 overflow-hidden">
            {item.photo ? (
              <img
                src={item.photo}
                alt={item.name || ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Shirt size={16} className="text-neutral-600" />
              </div>
            )}
          </div>
        ))}
        {remaining > 0 && (
          <div className="aspect-square bg-neutral-800 flex items-center justify-center">
            <span className="text-sm text-neutral-500">+{remaining}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="font-medium text-sm truncate">{outfit.name}</h3>

        {outfit.mood && (
          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {outfit.mood}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {outfit.occasion && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-300">
              <Tag size={10} />
              {outfit.occasion}
            </span>
          )}
          {outfit.date && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-300">
              <Calendar size={10} />
              {new Date(outfit.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {/* Color swatches */}
        {outfit.palette && outfit.palette.length > 0 && (
          <div className="flex gap-1 mt-2">
            {outfit.palette.slice(0, 5).map((hex, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-neutral-700"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}