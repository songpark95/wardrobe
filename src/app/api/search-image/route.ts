import { NextRequest, NextResponse } from "next/server";

async function searchDuckDuckGoImages(
  query: string,
  maxResults: number = 12
): Promise<string[]> {
  try {
    // Step 1: Get vqd token from main search page
    const mainRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    const html = await mainRes.text();
    const vqdMatch = html.match(/vqd=([\d-]+)&/);

    if (!vqdMatch) {
      // Try alternative patterns
      const altMatch = html.match(/vqd['"]?\s*[:=]\s*['"]([\d-]+)['"]/);
      const vqd = vqdMatch?.[1] || altMatch?.[1];
      if (!vqd) {
        console.warn("Could not extract vqd token from DuckDuckGo");
        return [];
      }
    }

    const vqd = vqdMatch![1];

    // Step 2: Fetch image results JSON
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&o=json&p=1`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Referer: `https://duckduckgo.com/`,
          Accept: "application/json, text/plain, */*",
        },
      }
    );

    if (!imgRes.ok) {
      console.warn(`DuckDuckGo image API returned ${imgRes.status}`);
      return [];
    }

    const data = await imgRes.json();
    const results = data?.results || [];

    return results
      .slice(0, maxResults)
      .map((r: any) => r.image)
      .filter(Boolean) as string[];
  } catch (err) {
    console.error("DuckDuckGo image search failed:", err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  const { name, brand, category, color } = await req.json();

  if (!name && !brand) {
    return NextResponse.json(
      { error: "Item name or brand required" },
      { status: 400 }
    );
  }

  // Build search queries — try multiple to maximize results
  const queries: string[] = [];

  if (brand) {
    queries.push(`${brand} ${name || ""} ${category || ""} product`.trim());
    queries.push(`${brand} ${name || ""} clothing`.trim());
  }
  queries.push(`${name || ""} ${brand || ""} ${category || ""} ${color || ""}`.trim());
  if (category) {
    queries.push(`${category} ${brand || ""} ${name || ""} fashion`.trim());
  }

  const seen = new Set<string>();
  const results: { url: string; thumbnail: string | null }[] = [];

  for (const query of queries) {
    if (results.length >= 12) break;
    const images = await searchDuckDuckGoImages(query);
    for (const url of images) {
      if (!seen.has(url) && results.length < 12) {
        seen.add(url);
        results.push({ url, thumbnail: null });
      }
    }
  }

  return NextResponse.json({ images: results });
}