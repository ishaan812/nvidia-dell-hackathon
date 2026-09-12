import { METRIC_LABELS } from "./evidence";
import { citationLabel } from "./paths";
import { formatMetric, pick } from "./metrics";
import type { Deal, FileLink, Flag, KnowledgeGraph, Metric, ReconcileRow, ReconcileStatus } from "./types";

const LABELS = METRIC_LABELS;

const ROW_ORDER: ReconcileStatus[] = [
  "contradiction",
  "unsupported",
  "gap",
  "deck-only",
  "room-only",
  "match",
];

const METRIC_ORDER = Object.keys(LABELS);

export function buildReconcile(metrics: Metric[], flags: Flag[]): ReconcileRow[] {
  const names = new Set<string>();
  for (const metric of metrics) names.add(metric.name);
  for (const flag of flags) {
    if (flag.metric) names.add(flag.metric);
  }

  const flagByMetric = new Map<string, Flag>();
  for (const flag of flags) {
    if (flag.metric && !flagByMetric.has(flag.metric)) flagByMetric.set(flag.metric, flag);
  }

  const rows: ReconcileRow[] = [];
  for (const name of names) {
    const deck = pick(metrics, name, "deck");
    const room = metrics.find((m) => m.name === name && m.sourceKind !== "deck");
    const flag = flagByMetric.get(name);
    let status: ReconcileStatus;
    if (flag?.severity === "contradiction") status = "contradiction";
    else if (flag?.severity === "unsupported") status = "unsupported";
    else if (deck && room) status = "match";
    else if (deck) status = "deck-only";
    else status = "room-only";

    rows.push({
      metric: name,
      label: LABELS[name] ?? name.replaceAll("_", " "),
      deck: deck ? formatMetric(deck) : undefined,
      room: room ? formatMetric(room) : undefined,
      roomSource: room ? citationLabel(room.citation) : undefined,
      status,
      comment: flag?.comment,
      flagId: flag?.id,
      page: deck?.citation.page ?? flag?.page ?? null,
    });
  }

  for (const flag of flags) {
    if (flag.metric) continue;
    rows.push({
      metric: flag.id,
      label: "Missing from the room",
      status: "gap",
      comment: flag.comment,
      flagId: flag.id,
      page: flag.page,
    });
  }

  return rows.sort((a, b) => {
    const byStatus = ROW_ORDER.indexOf(a.status) - ROW_ORDER.indexOf(b.status);
    if (byStatus !== 0) return byStatus;
    return METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric);
  });
}

export function buildFileLinks(deal: Pick<Deal, "metrics" | "flags" | "deckFilename">): FileLink[] {
  const rows = buildReconcile(deal.metrics, deal.flags);
  return rows
    .filter((row) => row.status !== "gap")
    .map((row) => {
      const deck = pick(deal.metrics, row.metric, "deck");
      const room = deal.metrics.find((metric) => metric.name === row.metric && metric.sourceKind !== "deck");
      return {
        metric: row.metric,
        label: row.label,
        deckFile: deck?.citation.filename ?? deal.deckFilename,
        roomFile: room?.citation.filename,
        roomSheet: room?.citation.sheet,
        deckValue: row.deck,
        roomValue: row.room,
        status: row.status,
        flagId: row.flagId,
      };
    });
}

function fileId(filename: string) {
  return `file:${filename}`;
}

function metricId(name: string) {
  return `metric:${name}`;
}

export function buildGraph(
  company: string,
  metrics: Metric[],
  flags: Flag[],
  docs: { filename: string; kind?: string; role?: string }[] = [],
): KnowledgeGraph {
  const rows = buildReconcile(metrics, flags);
  const flagByMetric = new Map(flags.filter((flag) => flag.metric).map((flag) => [flag.metric!, flag]));
  const nodes: KnowledgeGraph["nodes"] = [
    { id: "company", type: "Company", label: company || "Company" },
  ];
  const edges: KnowledgeGraph["edges"] = [];
  const seen = new Set<string>(["company"]);

  for (const doc of docs) {
    const id = fileId(doc.filename);
    if (seen.has(id)) continue;
    seen.add(id);
    nodes.push({
      id,
      type: doc.role === "deck" || doc.kind === "deck" ? "Deck" : "File",
      label: doc.filename,
      source: doc.filename,
    });
    edges.push({
      source: "company",
      target: id,
      rel: doc.role === "deck" || doc.kind === "deck" ? "deck" : "in room",
    });
  }

  for (const metric of metrics) {
    if (!metric.citation.filename) continue;
    const mid = metricId(metric.name);
    const fid = fileId(metric.citation.filename);
    if (!seen.has(fid)) {
      seen.add(fid);
      nodes.push({
        id: fid,
        type: metric.sourceKind === "deck" ? "Deck" : "File",
        label: metric.citation.filename,
        source: metric.citation.filename,
      });
      edges.push({ source: "company", target: fid, rel: metric.sourceKind === "deck" ? "deck" : "in room" });
    }
    if (!seen.has(mid)) {
      seen.add(mid);
      const flag = flagByMetric.get(metric.name);
      nodes.push({
        id: mid,
        type: "Metric",
        label: LABELS[metric.name] ?? metric.name.replaceAll("_", " "),
        value: formatMetric(metric),
        severity: flag?.severity,
      });
    }
    edges.push({
      source: fid,
      target: mid,
      rel: formatMetric(metric),
      severity: flagByMetric.get(metric.name)?.severity,
    });
  }

  return { nodes, edges, rows };
}
