import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FounderResearch, ResearchHit } from "../intelligence/types";
import { firecrawlImageSearch } from "./firecrawl";
import { dirs } from "./paths";
import { assertInsideDeal } from "./sandbox";

export function founderSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "founder";
}

export function founderPhotoPath(dealId: string, name: string) {
  return `/api/deals/${dealId}/founder-photo?who=${encodeURIComponent(founderSlug(name))}`;
}

export async function resolveFounderPhotoFile(dealId: string, who: string): Promise<string | undefined> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(who)) return undefined;
  const folder = path.join(dirs().data, dealId, "founders");
  try {
    const names = await readdir(folder);
    const match = names.find((name) => path.parse(name).name === who);
    if (!match) return undefined;
    return assertInsideDeal(dealId, path.join(folder, match));
  } catch {
    return undefined;
  }
}

export function pickLinkedInPhoto(hits: ResearchHit[]): string | undefined {
  const pool = hits.flatMap((hit) => [
    ...(hit.images ?? []),
    hit.ogImage,
    ...urlsIn(hit.description),
  ]);
  return choosePhoto(pool);
}

export async function attachFounderPhotos(
  dealId: string,
  company: string,
  people: FounderResearch[],
): Promise<FounderResearch[]> {
  const out: FounderResearch[] = [];
  for (const person of people) {
    if (person.photoUrl) {
      out.push(person);
      continue;
    }
    if (await resolveFounderPhotoFile(dealId, founderSlug(person.name))) {
      out.push({ ...person, photoUrl: founderPhotoPath(dealId, person.name) });
      continue;
    }
    const photoUrl = await findFounderPhoto(dealId, person.name, company, person.hits);
    out.push(photoUrl ? { ...person, photoUrl } : person);
  }
  return out;
}

async function findFounderPhoto(
  dealId: string,
  name: string,
  company: string,
  hits: ResearchHit[],
): Promise<string | undefined> {
  let remote = pickLinkedInPhoto(hits);
  if (!remote) {
    const queries = [`"${name}" ${company} LinkedIn`, `"${name}" LinkedIn profile`];
    for (const query of queries) {
      try {
        remote = choosePhoto(await firecrawlImageSearch(query, 8));
        if (remote) break;
      } catch {
        /* try the next query */
      }
    }
  }
  if (!remote) return undefined;
  return (await persistFounderPhoto(dealId, name, remote)) ?? remote;
}

async function persistFounderPhoto(dealId: string, name: string, remoteUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(remoteUrl, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 Night Desk founder photo" },
    });
    if (!res.ok) return undefined;
    const type = res.headers.get("content-type") ?? "";
    const ext = extensionFor(type, remoteUrl);
    if (!ext) return undefined;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 800 || bytes.length > 2_500_000) return undefined;
    const folder = path.join(dirs().data, dealId, "founders");
    await mkdir(folder, { recursive: true });
    const file = assertInsideDeal(dealId, path.join(folder, `${founderSlug(name)}${ext}`));
    await writeFile(file, bytes);
    return founderPhotoPath(dealId, name);
  } catch {
    return undefined;
  }
}

function choosePhoto(urls: (string | undefined)[]): string | undefined {
  const scored = urls
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ url, score: photoScore(url) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.url;
}

function photoScore(url: string): number {
  const clean = url.split("?")[0] ?? url;
  if (/static\.licdn\.com|company-logo|hashtag|sprite|favicon|default-share/i.test(clean)) return 0;
  if (/profile-displaybackground|cover-photo/i.test(clean)) return 0;
  if (/feedshare|company-logo|hashtag/i.test(clean)) return 0;
  if (/media\.licdn\.com\/dms\/image/i.test(clean) && /profile-displayphoto|profile-framedphoto/i.test(clean)) {
    return /800|400/.test(clean) ? 7 : 6;
  }
  if (/licdn\.com/i.test(clean) && /\.(jpe?g|png|webp)$/i.test(clean)) return 3;
  return 0;
}

function urlsIn(text: string): string[] {
  return text.match(/https?:\/\/[^\s)"'\]]+/g) ?? [];
}

function extensionFor(type: string, url: string): string | undefined {
  if (/image\/png/i.test(type)) return ".png";
  if (/image\/webp/i.test(type)) return ".webp";
  if (/image\/gif/i.test(type)) return ".gif";
  if (/image\/(jpeg|jpg)/i.test(type)) return ".jpg";
  const fromUrl = /\.(jpe?g|png|webp|gif)(?:$|\?)/i.exec(url)?.[1];
  if (fromUrl) return `.${fromUrl.toLowerCase().replace("jpeg", "jpg")}`;
  if (/^image\//i.test(type)) return ".jpg";
  return undefined;
}
