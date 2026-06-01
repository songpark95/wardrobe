"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UploadZoneProps {
  onUploadComplete: (path: string, url: string) => void;
}

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const supabase = createClient();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;
      setUploading(true);
      setPreview(URL.createObjectURL(file));

      const ext = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("item-photos")
        .upload(filePath, file);

      if (error) {
        alert(`Upload failed: ${error.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("item-photos")
        .getPublicUrl(filePath);

      onUploadComplete(filePath, urlData.publicUrl);
      setUploading(false);
      setPreview(null);
    },
    [supabase.storage, onUploadComplete]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-neutral-800 rounded-xl p-8 text-center hover:border-neutral-600 transition-colors cursor-pointer"
      onClick={() => fileInputRef.current?.click()}
    >
      {preview ? (
        <div className="space-y-3">
          <img
            src={preview}
            alt="Preview"
            className="max-h-64 mx-auto rounded-lg object-contain"
          />
          {uploading && (
            <p className="text-sm text-neutral-400">Uploading...</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-neutral-900 transition-colors"
            >
              <Camera size={28} className="text-neutral-400" />
              <span className="text-sm text-neutral-400">Camera</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-neutral-900 transition-colors"
            >
              <Upload size={28} className="text-neutral-400" />
              <span className="text-sm text-neutral-400">Upload</span>
            </button>
          </div>
          <p className="text-sm text-neutral-500">
            Drag a photo here, or click to upload
          </p>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
