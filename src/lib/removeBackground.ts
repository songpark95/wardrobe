"use client";

let bgRemovalModule: any = null;

export async function removeBackground(
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Dynamically import to avoid SSR issues
  if (!bgRemovalModule) {
    bgRemovalModule = await import("@imgly/background-removal");
  }

  const result = await bgRemovalModule.removeBackground(imageUrl, {
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