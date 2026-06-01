import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { itemIds } = await req.json();

  if (!itemIds?.length || itemIds.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 items" },
      { status: 400 }
    );
  }

  // Load items + photos from Supabase (server-side, bypasses RLS since it reads directly)
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, color, material, category, purchase_price")
    .in("id", itemIds);

  if (error || !items?.length) {
    return NextResponse.json(
      { error: "Failed to load items" },
      { status: 500 }
    );
  }

  // Load primary photos for each item
  const { data: photos } = await supabase
    .from("item_photos")
    .select("item_id, storage_path")
    .in("item_id", itemIds)
    .eq("is_primary", true);

  const photoMap: Record<string, string> = {};
  if (photos) {
    for (const p of photos) {
      if (!photoMap[p.item_id]) {
        const { data: urlData } = supabase.storage
          .from("item-photos")
          .getPublicUrl(p.storage_path);
        photoMap[p.item_id] = urlData.publicUrl;
      }
    }
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  // Build item descriptions
  const itemDescriptions = items.map((item) => {
    const parts: string[] = [];
    if (item.name) parts.push(item.name);
    if (item.category) parts.push(`Category: ${item.category}`);
    if (item.color) parts.push(`Color: ${item.color}`);
    if (item.material) parts.push(`Material: ${item.material}`);
    if (item.purchase_price) parts.push(`Price: $${item.purchase_price}`);
    return parts.join(", ");
  });

  // Build content array with photos + text
  const content: any[] = [
    {
      type: "text",
      text: `Analyze this outfit made of these ${items.length} items:\n\n${itemDescriptions.map((d, i) => `Item ${i + 1}: ${d}`).join("\n\n")}\n\nOutput three things as JSON:\n1. "mood": A 1-2 sentence description of the overall outfit mood/vibe\n2. "palette": Array of 3-5 hex color codes extracted from the outfit\n3. "name": A short creative name for this outfit combination (3-6 words)`,
    },
  ];

  // Add photo URLs
  for (const [itemId, photoUrl] of Object.entries(photoMap)) {
    content.push({
      type: "image_url",
      image_url: { url: photoUrl },
    });
  }

  try {
    const resp = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/songpark95/wardrobe",
          "X-Title": "Wardrobe App",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "user",
              content,
            },
          ],
          max_tokens: 512,
        }),
      }
    );

    const data = await resp.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";

    // Parse JSON from response
    let result: any = {};
    try {
      result = JSON.parse(rawContent);
    } catch {
      // Try to extract JSON from markdown
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {
          result = { mood: rawContent, palette: [], name: "" };
        }
      } else {
        result = { mood: rawContent, palette: [], name: "" };
      }
    }

    return NextResponse.json({
      mood: result.mood || "",
      palette: result.palette || [],
      name: result.name || "",
    });
  } catch (err) {
    console.error("Outfit analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 502 }
    );
  }
}