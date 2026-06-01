"use client";

import { forwardRef } from "react";

interface CollageCardProps {
  items: {
    id: string;
    name: string | null;
    photo: string;
    category: string | null;
    color: string | null;
  }[];
  palette: string[];
  outfitName: string;
}

// Arrange items based on category for a natural flat-lay layout
function arrangeItems(items: CollageCardProps["items"]) {
  const sorted = [...items].sort((a, b) => {
    const order: Record<string, number> = {
      outerwear: 0, jackets: 0, coats: 0, tailoring: 0, suits: 0,
      tops: 1, shirting: 1, sweaters: 1,
      bottoms: 2, denim: 2,
      footwear: 3,
      accessories: 4, bags: 4, jewelry: 4, headwear: 4,
    };
    const aOrder = order[(a.category || "").toLowerCase()] ?? 5;
    const bOrder = order[(b.category || "").toLowerCase()] ?? 5;
    return aOrder - bOrder;
  });

  // Grid positions for 1-9 items
  const positions = [
    // 1 item
    [{ x: 50, y: 50, w: 50, h: 60 }],
    // 2 items
    [{ x: 25, y: 50, w: 45, h: 60 }, { x: 70, y: 50, w: 45, h: 60 }],
    // 3 items
    [{ x: 20, y: 45, w: 40, h: 55 }, { x: 60, y: 50, w: 40, h: 55 }, { x: 40, y: 85, w: 35, h: 40 }],
    // 4 items
    [{ x: 20, y: 30, w: 35, h: 45 }, { x: 55, y: 25, w: 35, h: 45 }, { x: 15, y: 70, w: 35, h: 45 }, { x: 60, y: 70, w: 35, h: 45 }],
    // 5+ items
    [{ x: 15, y: 25, w: 35, h: 40 }, { x: 50, y: 20, w: 35, h: 40 }, { x: 25, y: 55, w: 30, h: 35 }, { x: 55, y: 60, w: 30, h: 35 }, { x: 70, y: 40, w: 25, h: 30 }],
  ];

  const posIndex = Math.min(sorted.length - 1, positions.length - 1);
  const layout = positions[Math.max(0, posIndex)];

  return sorted.map((item, i) => ({
    ...item,
    pos: layout[i] || layout[layout.length - 1],
  }));
}

const CollageCard = forwardRef<HTMLDivElement, CollageCardProps>(
  ({ items, palette, outfitName }, ref) => {
    const arranged = arrangeItems(items);
    const primaryPalette = palette.slice(0, 3);
    const secondaryPalette = palette.slice(3, 5);

    return (
      <div
        ref={ref}
        className="w-full h-full flex flex-col"
        style={{
          backgroundColor: "#F5F1EB",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        {/* Top section — outfit name */}
        <div className="w-full h-12 flex items-end px-6 pb-2">
          <div
            className="text-xs tracking-[0.3em] uppercase text-black/40"
            style={{ fontWeight: 700 }}
          >
            {outfitName || "OUTFIT"}
          </div>
        </div>

        {/* Main collage area */}
        <div className="flex-1 relative mx-4">
          {arranged.map((item, i) => (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: `${item.pos.x - item.pos.w / 2}%`,
                top: `${item.pos.y - item.pos.h / 2}%`,
                width: `${item.pos.w}%`,
                height: `${item.pos.h}%`,
              }}
            >
              <img
                src={item.photo}
                alt={item.name || ""}
                className="w-full h-full object-contain"
                style={{
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.08))",
                }}
              />
            </div>
          ))}
        </div>

        {/* Bottom section — palette + name */}
        <div className="w-full px-6 py-4 flex items-end justify-between">
          {/* Left — color palette */}
          <div className="flex gap-4 items-end">
            {/* Primary colors */}
            {primaryPalette.length > 0 && (
              <div className="space-y-1">
                <div className="text-[7px] tracking-[0.2em] uppercase text-black/30" style={{ fontWeight: 600 }}>
                  Primary
                </div>
                <div className="flex gap-1.5">
                  {primaryPalette.map((hex, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="text-[6px] font-mono text-black/50">{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary colors */}
            {secondaryPalette.length > 0 && (
              <div className="space-y-1">
                <div className="text-[7px] tracking-[0.2em] uppercase text-black/30" style={{ fontWeight: 600 }}>
                  Secondary
                </div>
                <div className="flex gap-1.5">
                  {secondaryPalette.map((hex, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="text-[6px] font-mono text-black/50">{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — outfit name */}
          <div className="text-right">
            <div
              className="text-sm text-black/60"
              style={{ fontWeight: 300, letterSpacing: "0.05em" }}
            >
              {outfitName}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CollageCard.displayName = "CollageCard";
export default CollageCard;