"use client";

import { Tag, MapPin, Ruler } from "lucide-react";
import HeartButton from "./HeartButton";
import type { Item } from "./ItemGrid";

interface ItemCardProps {
  item: Item;
  primaryPhoto: string | null;
  isFavorite: boolean;
  onFavoriteToggle: (itemId: string, isFavorite: boolean) => void;
}

export default function ItemCard({
  item,
  primaryPhoto,
  isFavorite,
  onFavoriteToggle,
}: ItemCardProps) {
  return (
    <div className="group bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-all relative">
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

      {/* Heart button — top right */}
      <div className="absolute top-2 right-2">
        <HeartButton
          itemId={item.id}
          isFavorite={isFavorite}
          onToggle={onFavoriteToggle}
        />
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
          {item.brands && item.brands.length > 0 && (
            <div className="flex flex-wrap gap-1 w-full mt-1">
              {item.brands.map((b) => (
                <span
                  key={b.id}
                  className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded"
                >
                  {b.name}
                </span>
              ))}
            </div>
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

        {/* Price */}
        {item.purchase_price && (
          <div className="text-xs text-neutral-500">
            ${Number(item.purchase_price).toFixed(2)}
            {item.price_modifier && (
              <span className="text-neutral-600"> — {item.price_modifier}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}