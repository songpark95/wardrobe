"use client";

let bgRemovalModule: any = null;

// Convert any image format to PNG via canvas (handles AVIF, WebP, etc.)
async function toSupportedBlob(imageUrl: string): Promise<Blob> {
  const resp = await fetch(imageUrl);
  const blob = await resp.blob();

  // If already PNG/JPEG, skip conversion
  if (blob.type === "image/png" || blob.type === "image/jpeg") {
    return blob;
  }

  // Convert via canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Canvas conversion failed"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Failed to load image for conversion"));
    img.src = URL.createObjectURL(blob);
  });
}

export async function removeBackground(
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Dynamically import to avoid SSR issues
  if (!bgRemovalModule) {
    bgRemovalModule = await import("@imgly/background-removal");
  }

  // Convert to supported format first (handles AVIF, WebP, etc.)
  const supportedBlob = await toSupportedBlob(imageUrl);

  const result = await bgRemovalModule.removeBackground(supportedBlob, {
    progress: (key: string, current: number, total: number) => {
      if (onProgress) {
        onProgress(Math.round((current / total) * 100));
      }
    },
  });

  return result;
}

export function blobToUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}