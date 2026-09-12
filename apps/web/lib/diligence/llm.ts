import { settings } from "./paths";

function headers() {
  const { llmApiKey } = settings();
  return {
    Authorization: `Bearer ${llmApiKey}`,
    "Content-Type": "application/json",
  };
}

function ollamaHost() {
  return settings().llmBaseUrl.replace(/\/v1\/?$/, "");
}

export async function pingModel(): Promise<{ ok: boolean; models: string[] }> {
  try {
    const res = await fetch(`${settings().llmBaseUrl.replace(/\/$/, "")}/models`, {
      headers: headers(),
    });
    if (!res.ok) return { ok: false, models: [] };
    const data = (await res.json()) as { data?: { id: string }[] };
    return { ok: true, models: (data.data ?? []).map((m) => m.id) };
  } catch {
    return { ok: false, models: [] };
  }
}

export async function chat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts?: { maxTokens?: number },
): Promise<string> {
  try {
    const res = await fetch(`${settings().llmBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model: settings().llmModel,
        messages,
        temperature: 0.2,
        max_tokens: opts?.maxTokens ?? 500,
      }),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function embed(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  const host = ollamaHost();
  const model = settings().embeddingModel;
  for (const text of texts) {
    const openai = await fetch(`${settings().llmBaseUrl.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ model, input: text }),
    });
    if (openai.ok) {
      const data = (await openai.json()) as { data?: { embedding: number[] }[] };
      if (data.data?.[0]?.embedding) {
        vectors.push(data.data[0].embedding);
        continue;
      }
    }
    const native = await fetch(`${host}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!native.ok) throw new Error(`embed failed: ${native.status}`);
    const data = (await native.json()) as {
      embedding?: number[];
      embeddings?: number[][];
    };
    const vec = data.embedding ?? data.embeddings?.[0];
    if (!vec) throw new Error("embed payload missing vector");
    vectors.push(vec);
  }
  return vectors;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
