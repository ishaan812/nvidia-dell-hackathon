export type SearchHit = {
  title: string;
  url: string;
  description: string;
};

function apiKey() {
  return process.env.FIRECRAWL_API_KEY?.trim() || "";
}

export function firecrawlReady() {
  return Boolean(apiKey());
}

export async function firecrawlSearch(query: string, limit = 5): Promise<SearchHit[]> {
  if (!apiKey()) {
    throw new Error("Add FIRECRAWL_API_KEY to search the open web.");
  }
  let res: Response | undefined;
  let text = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit }),
    });
    if (res.ok) break;
    text = await res.text();
    const wait = /retry after (\d+)/i.exec(text)?.[1];
    if (res.status !== 429 || attempt === 3) {
      throw new Error(text.slice(0, 200) || `Firecrawl search failed (${res.status})`);
    }
    await new Promise((resolve) => setTimeout(resolve, (Number(wait) || 20) * 1000));
  }
  if (!res?.ok) {
    throw new Error(text.slice(0, 200) || "Firecrawl search failed");
  }
  const data = (await res.json()) as {
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
