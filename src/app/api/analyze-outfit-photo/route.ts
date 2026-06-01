import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { photoUrl, itemIds } = await req.json();

  if (!photoUrl) {
    return NextResponse.json({ error: "photoUrl required" }, { status: 400 });
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  // Load existing items for matching
  const supabase = await createClient();
  const { data: existingItems } = await supabase
    .from("items")
    .select("id, name, category, color, material, size, brands: item_brands(brands(id, name))");

  const itemsContext = existingItems
    ? existingItems.map((i: any) => {
        const brands = i.brands?.map((b: any) => b.brands?.name).filter(Boolean) || [];
        return `ID: ${i.id} | Name: ${i.name || "unnamed"} | Category: ${i.category || "none"} | Color: ${i.color || "none"} | Brands: ${brands.join(", ") || "none"}`;
      }).join("\n")
    : "No items in library.";

  const systemPrompt = `You are a fashion analyst and stylist. Analyze an outfit photo and extract detailed insights.

Output JSON with these keys:
1. "items": Array of objects describing each distinct clothing item visible in the photo. Each item has:
   - "name": Descriptive name (e.g., "Oversized wool blazer")
   - "category": One of: Tops, Bottoms, Outerwear, Footwear, Accessories, Headwear, Bags, Jewelry, Tailoring, Denim, Loungewear, Sweaters, Shirting, Jackets, Coats, Suits
   - "color": Primary color
   - "material": Apparent material/fabric
   - "brandGuess": Best guess at brand if identifiable, or empty string
   - "sizeGuess": Estimated size if determinable, or empty string
2. "palette": Array of 3-5 hex color codes extracted from the outfit
3. "vibe": A 2-3 sentence detailed description of the outfit's vibe, aesthetic, and styling choices
4. "emotion": A single word describing the emotion the outfit portrays (e.g., "confidence", "rebellion", "serenity", "power", "melancholy", "playfulness", "mystery"). Base this on the overall aesthetic, not the person's facial expression.
5. "outfitName": A short creative name for this outfit (3-6 words)
6. "matchingItemIds": Array of item IDs from the library that match items in this photo (fuzzy match by name, category, color, brand)
7. "unmatchedItems": Array of item objects that don't match anything in the library (these should be created as skeletons)

Be specific about textures, silhouettes, layering, and styling choices. The emotion should reflect what the clothing communicates — the language of what's worn.`;

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
            content: [
              {
                type: "text",
                text: `Analyze this outfit photo.\n\nExisting items in library for matching:\n${itemsContext}\n\nReturn JSON with: items, palette, vibe, emotion, outfitName, matchingItemIds, unmatchedItems`,
              },
              {
                type: "image_url",
                image_url: { url: photoUrl },
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    const data = await resp.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";

    let result: any = {};
    try {
      result = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { result = JSON.parse(jsonMatch[0]); } catch {}
      }
    }

    return NextResponse.json({
      items: result.items || [],
      palette: result.palette || [],
      vibe: result.vibe || "",
      emotion: result.emotion || "",
      outfitName: result.outfitName || "",
      matchingItemIds: result.matchingItemIds || [],
      unmatchedItems: result.unmatchedItems || [],
    });
  } catch (err) {
    console.error("Outfit photo analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 502 });
  }
}