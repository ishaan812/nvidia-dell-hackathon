import { METRIC_LABELS, previewFile, withEvidence } from "./evidence";
import { buildFileLinks, buildGraph, buildReconcile } from "./graph";
import { deckDocs } from "./roles";
import type { Deal, DealFile, DealLobbyView, DealRoomView, DocKind, FileRole } from "./types";

function sheetsOf(markdown: string): string[] {
  return [...markdown.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1].replace(/<!--.*?-->/g, "").trim())
    .filter((name) => name && !name.startsWith("Slide") && !name.startsWith("source:"));
}

function toFile(dealId: string, filename: string, kind: DocKind, role: FileRole, metrics: string[], sheets: string[]): DealFile {
  return {
    filename,
    kind,
    role,
    sheets,
    metrics,
    href: `/api/deals/${dealId}/file?name=${encodeURIComponent(filename)}`,
  };
}

export function toRoomView(deal: Deal, activeDeck?: string): DealRoomView {
  const decks = deckDocs(deal.docs).map((doc) => ({ filename: doc.filename }));
  const current = decks.some((deck) => deck.filename === activeDeck)
    ? activeDeck
    : decks[0]?.filename;
  return {
    id: deal.id,
    name: deal.name,
    company: deal.company,
    status: deal.status,
    riskScore: deal.riskScore,
    sandbox: deal.sandbox,
    flags: deal.flags.map((flag) => {
      const view = withEvidence(deal, flag);
      return { ...view, page: view.page && view.page > 0 ? view.page : 1 };
    }),
    memo: deal.memo
      ? { verdict: deal.memo.verdict, bodyMarkdown: deal.memo.bodyMarkdown }
      : undefined,
    reconcile: deal.graph.rows?.length ? deal.graph.rows : buildReconcile(deal.metrics, deal.flags),
    files: deal.docs.map((doc) => ({
      filename: doc.filename,
      kind: doc.kind,
      role: doc.role ?? (doc.kind === "deck" ? "deck" : "room"),
    })),
    decks,
    activeDeck: current,
  };
}

export async function toLobbyView(deal: Deal): Promise<DealLobbyView> {
  const reconcile = deal.graph.rows?.length ? deal.graph.rows : buildReconcile(deal.metrics, deal.flags);
  const links = buildFileLinks(deal);
  const metricsByFile = new Map<string, string[]>();
  for (const metric of deal.metrics) {
    const list = metricsByFile.get(metric.citation.filename) ?? [];
    if (!list.includes(metric.name)) list.push(metric.name);
    metricsByFile.set(metric.citation.filename, list);
  }

  const files = deal.docs.map((doc) =>
    toFile(
      deal.id,
      doc.filename,
      doc.kind,
      doc.role ?? (doc.kind === "deck" ? "deck" : "room"),
      (metricsByFile.get(doc.filename) ?? []).map((name) => METRIC_LABELS[name] ?? name),
      sheetsOf(doc.markdown),
    ),
  );

  const previews: DealLobbyView["previews"] = {};
  await Promise.all(
    files
      .map(async (file) => {
        const preview = await previewFile(deal, file.filename);
        if (preview) previews[file.filename] = preview;
      }),
  );

  return {
    id: deal.id,
    name: deal.name,
    company: deal.company,
    status: deal.status,
    riskScore: deal.riskScore,
    decks: files.filter((file) => file.role === "deck"),
    room: files.filter((file) => file.role === "room"),
    links,
    reconcile,
    graph:
      deal.graph.nodes.length > 1
        ? deal.graph
        : buildGraph(deal.company, deal.metrics, deal.flags, deal.docs),
    previews,
  };
}
