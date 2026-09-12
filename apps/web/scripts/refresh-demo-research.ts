import { researchFounders, researchMarket } from "../lib/diligence/research";
import { loadDeal, saveDeal } from "../lib/diligence/store";
import { SEED_IDS } from "../lib/intelligence/seed";

const FOUNDERS: Record<string, string[]> = {
  "harbor-mail": ["Benny Rubin", "Vinoop Thayatt"],
  "lumen-health": ["Kristen Valdes", "Jenny Gackic"],
  "northstar-robotics": ["Simon Kalouche", "Erik Nieves"],
  "aether-grid": ["James McGinniss", "William Burke"],
  "helio-freight": ["Bob King", "Austin McCombs", "Charley Dehoney"],
};

const RENAME: [string, string][] = [
  ["Priya Shah", "Benny Rubin"],
  ["Eli Vargas", "Vinoop Thayatt"],
  ["Dr. Amira Cole", "Kristen Valdes"],
  ["Amira Cole", "Kristen Valdes"],
  ["Jonah Park", "Jenny Gackic"],
  ["Maya Chen", "Simon Kalouche"],
  ["Owen Blake", "Erik Nieves"],
  ["Samira Okon", "James McGinniss"],
  ["Luca Moretti", "William Burke"],
  ["Nora Voss", "Bob King"],
  ["Kenji Abe", "Austin McCombs"],
  ["Idris Kane", "Charley Dehoney"],
];

function rewrite(value: unknown): unknown {
  if (typeof value === "string") {
    return RENAME.reduce((text, [from, to]) => text.split(from).join(to), value);
  }
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item)]));
  }
  return value;
}

async function main() {
  for (const id of SEED_IDS) {
    const deal = await loadDeal(id);
    if (!deal?.intelligence) {
      console.log(id, "missing");
      continue;
    }
    deal.intelligence = rewrite(deal.intelligence) as typeof deal.intelligence;
    deal.intelligence.profile.founders = FOUNDERS[id] ?? deal.intelligence.profile.founders;
    console.log(id, "founders", deal.intelligence.profile.founders.join(", "));
    if (deal.intelligence.research?.founders?.length && deal.intelligence.research.market && !process.env.FORCE) {
      await saveDeal(deal);
      console.log(id, "names saved, research already present");
      continue;
    }
    const founders = await researchFounders(deal);
    const market = await researchMarket(deal);
    deal.intelligence.research = { founders, market };
    deal.updatedAt = new Date().toISOString();
    await saveDeal(deal);
    console.log(
      id,
      "research",
      founders.map((person) => `${person.name}:${person.hits.length}`).join(" "),
      `tam:${market.tam.length}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
