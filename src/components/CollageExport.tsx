"use client";

import { useRef, useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import CollageCard from "./CollageCard";

interface CollageExportProps {
  items: {
    id: string;
    name: string | null;
    photo: string;
    category: string | null;
    color: string | null;
  }[];
  palette: string[];
  outfitName: string;
  mood: string;
}

export default function CollageExport({
  items,
  palette,
  outfitName,
  mood,
}: CollageExportProps) {
  const collageRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!collageRef.current) return;
    setDownloading(true);

    try {
      const canvas = await html2canvas(collageRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        width: 1080,
        height: 1080,
      });

      const link = document.createElement("a");
      link.download = `outfit-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
    setDownloading(false);
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 font-medium">
        Preview
      </p>

      {/* Collage */}
      <div className="relative w-full aspect-square bg-neutral-100 rounded-lg overflow-hidden">
        <CollageCard
          ref={collageRef}
          items={items}
          palette={palette}
          outfitName={outfitName}
        />
      </div>

      {/* Download button */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <Download size={14} />
        {downloading ? "Preparing..." : "Download outfit image"}
      </button>

      {/* Share hint */}
      <p className="text-[10px] text-neutral-500 text-center">
        1080×1080 — optimized for Instagram, TikTok, Pinterest
      </p>
    </div>
  );
}