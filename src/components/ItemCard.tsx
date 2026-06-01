"use client";

import { Tag, MapPin, Ruler } from "lucide-react";
import type { Item } from "./ItemGrid";

interface ItemCardProps {
  item: Item;
  primaryPhoto: string | null;
}

export default function ItemCard({ item, primaryPhoto }: ItemCardProps) {
  return (
    <div className="group bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-all">
      {/* Photo */}
      <div className="aspect-[3/4] bg-neutral-800 overflow-hidden">
        {primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt={item.name || "Clothing item"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            <span className="text-sm">No photo</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {item.name && (
          <h3 className="font-medium text-sm truncate">{item.name}</h3>
        )}

        <div className="flex flex-wrap gap-1.5">
          {item.category && (
            <span className="inline-flex items-center gap-1 text-xs bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-300">
              <Tag size={10} />
              {item.category}
            </span>
          )}
          {item.brand && (
            <span className="text-xs text-neutral-400">{item.brand}</span>
          )}
        </div>

        {item.location && (
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <MapPin size={10} />
            {item.location}
          </div>
        )}

        {item.size && (
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <Ruler size={10} />
            {item.size}
          </div>
        )}
      </div>
    </div>
  );
}
