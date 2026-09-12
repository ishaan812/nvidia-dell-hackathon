export type SearchHit = {
  title: string;
  url: string;
  description: string;
};

export type ScrapePage = {
  markdown: string;
  images: string[];
  ogImage?: string;
};

function apiKey() {
  return process.env.FIRECRAWL_API_KEY?.trim() || "";
}

export function firecrawlReady() {
  return Boolean(apiKey());
}

async function firecrawlPost(path: string, body: unknown): Promise<unknown> {
  if (!apiKey()) {
    throw new Error("Add FIRECRAWL_API_KEY to search the open web.");
  }
  let res: Response | undefined;
  let text = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(`https://api.firecrawl.dev/v2${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) break;
    text = await res.text();
    const wait = /retry after (\d+)/i.exec(text)?.[1];
    if (res.status !== 429 || attempt === 3) {
      throw new Error(text.slice(0, 200) || `Firecrawl ${path} failed (${res.status})`);
    }
    await new Promise((resolve) => setTimeout(resolve, (Number(wait) || 20) * 1000));
  }
  if (!res?.ok) {
    throw new Error(text.slice(0, 200) || `Firecrawl ${path} failed`);
  }
  return res.json();
}

export async function firecrawlSearch(query: string, limit = 5): Promise<SearchHit[]> {
  const data = (await firecrawlPost("/search", { query, limit })) as {
    data?:
      | { title?: string; url?: string; description?: string; snippet?: string }[]
      | {
          web?: { title?: string; url?: string; description?: string; snippet?: string }[];
        };
    web?: { title?: string; url?: string; description?: string; snippet?: string }[];
  };
  const rows = Array.isArray(data.data)
    ? data.data
    : (data.data && "web" in data.data ? data.data.web : undefined) ?? data.web ?? [];
  return rows
    .map((row) => ({
      title: row.title || row.url || "Result",
      url: row.url || "",
      description: row.description || row.snippet || "",
    }))
    .filter((row) => row.url);
}

export async function firecrawlImageSearch(query: string, limit = 6): Promise<string[]> {
  const data = (await firecrawlPost("/search", {
    query,
    limit,
    sources: ["images"],
  })) as {
    data?:
      | { url?: string; imageUrl?: string; thumbnailUrl?: string }[]
      | {
          images?: { url?: string; imageUrl?: string; thumbnailUrl?: string }[];
        };
    images?: { url?: string; imageUrl?: string; thumbnailUrl?: string }[];
  };
  const rows = Array.isArray(data.data)
    ? data.data
    : (data.data && "images" in data.data ? data.data.images : undefined) ?? data.images ?? [];
  return rows
    .flatMap((row) => [row.imageUrl, row.url, row.thumbnailUrl])
    .filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)));
}

export async function firecrawlScrape(url: string): Promise<string> {
  return (await firecrawlScrapePage(url)).markdown;
}

export async function firecrawlScrapePage(
  url: string,
  opts: { images?: boolean; fullPage?: boolean } = {},
): Promise<ScrapePage> {
  const linkedin = /linkedin\.com/i.test(url);
  const data = (await firecrawlPost("/scrape", {
    url,
    formats: opts.images ? ["markdown", "images"] : ["markdown"],
    onlyMainContent: opts.fullPage ? false : true,
    waitFor: linkedin ? 2000 : undefined,
    proxy: linkedin ? "auto" : undefined,
  })) as {
    data?: {
      markdown?: string;
      content?: string;
      images?: unknown;
      metadata?: Record<string, unknown>;
    };
    markdown?: string;
    images?: unknown;
    metadata?: Record<string, unknown>;
  };
  const page = data.data ?? data;
  const metadata = page.metadata ?? {};
  const ogImage = firstString(
    metadata.ogImage,
    metadata["og:image"],
    metadata["og:image:secure_url"],
    metadata.og_image,
  );
  return {
    markdown: (page.markdown || page.content || "").trim(),
    images: collectImages(page.images),
    ogImage,
  };
}

function collectImages(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === "string") return /^https?:\/\//i.test(raw) ? [raw] : [];
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((item) => {
      if (typeof item === "string") return [item];
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      return [row.url, row.src, row.imageUrl].filter((value): value is string => typeof value === "string");
    })
    .filter((url) => /^https?:\/\//i.test(url));
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  }
  return undefined;
}
