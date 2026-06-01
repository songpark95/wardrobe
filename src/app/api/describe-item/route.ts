import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { photoUrl, brand, category, color, material, size, condition } = await req.json();

  if (!photoUrl) {
    return NextResponse.json({ error: "photoUrl required" }, { status: 400 });
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const systemPrompt = `You are a fashion expert and vintage reseller. Analyze clothing items from photos and output two things:

1. A short description of the item (2-3 sentences covering garment type, color, material, style, estimated era if relevant)
2. A draft selling listing formatted for Depop/Grailed/Poshmark

Be specific about details you can see — cut, fabric texture, hardware, labels, stitching. Note any visible brand labels or tags. Estimate condition honestly.

Output as JSON with "description" and "listing" keys.`;

  const userPrompt = `Analyze this clothing item${
    brand ? ` (Brand: ${brand}` : ""
  }${category ? `, Category: ${category}` : ""}${
    color ? `, Color: ${color}` : ""
  }${material ? `, Material: ${material}` : ""}${
    size ? `, Size: ${size}` : ""
  }${condition ? `, Condition: ${condition}` : ""}${brand ? ")" : ""}.`;

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
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                {
                  type: "image_url",
                  image_url: { url: photoUrl },
                },
              ],
            },
          ],
          max_tokens: 1024,
        }),
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      console.error("OpenRouter error:", data);
      return NextResponse.json(
        { error: "Vision API failed" },
        { status: 502 }
      );
    }

    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse as JSON, fallback to plain text
    let description = "";
    let listing = "";
    try {
      const parsed = JSON.parse(content);
      description = parsed.description || content;
      listing = parsed.listing || "";
    } catch {
      // Not JSON — split on listing heading
      const parts = content.split(/(?:listing|draft listing|sell listing)/i);
      description = parts[0].trim();
      listing = parts[1]?.trim() || "";
    }

    return NextResponse.json({ description, listing });
  } catch (err) {
    console.error("Vision API error:", err);
    return NextResponse.json({ error: "API call failed" }, { status: 502 });
  }
}