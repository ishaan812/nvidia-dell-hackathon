"use client";

import type { GraphEdge, GraphNode, KnowledgeGraph } from "@/lib/diligence/types";

type Props = {
  graph: KnowledgeGraph;
  activeFile?: string | null;
  onOpenFile: (filename: string) => void;
};

type Placed = GraphNode & { x: number; y: number };

function place(nodes: GraphNode[]): Placed[] {
  const decks = nodes.filter((node) => node.type === "Deck");
  const files = nodes.filter((node) => node.type === "File");
  const metrics = nodes.filter((node) => node.type === "Metric");
  const company = nodes.find((node) => node.type === "Company");
  const col = (list: GraphNode[], x: number, top: number): Placed[] =>
    list.map((node, index) => ({
      ...node,
      x,
      y: top + index * 72 + 28,
    }));
  const placed: Placed[] = [
    ...col(decks, 88, 72),
    ...col(metrics, 300, 72),
    ...col(files, 512, 72),
  ];
  if (company) placed.unshift({ ...company, x: 300, y: 28 });
  return placed;
}

function edgeClass(edge: GraphEdge): string {
  if (edge.severity === "contradiction") return "is-flag";
  if (edge.severity === "unsupported") return "is-warn";
  return "";
}

export function RoomGraph({ graph, activeFile, onOpenFile }: Props) {
  const filesAndMetrics = graph.nodes.filter((node) => node.type !== "Company");
  if (filesAndMetrics.length === 0) {
    return (
      <div className="px-6 py-7">
        <p className="font-serif text-[22px] leading-8 text-ink/70">
          No links yet. Add a deck and a model, then the graph fills in.
        </p>
      </div>
    );
  }

  const links = graph.edges.filter((edge) => edge.source !== "company");
  const connected = new Set<string>();
  for (const edge of links) {
    connected.add(edge.source);
    connected.add(edge.target);
  }
  const placed = place(
    graph.nodes.filter(
      (node) =>
        node.type === "Company" ||
        node.type === "Metric" ||
        node.type === "Deck" ||
        node.type === "File" ||
        connected.has(node.id),
    ),
  );
  const byId = new Map(placed.map((node) => [node.id, node]));
  const visible = links.filter((edge) => byId.has(edge.source) && byId.has(edge.target));
  const height = Math.max(360, ...placed.map((node) => node.y + 48));

  return (
    <div className="room-graph">
      <p className="room-graph-lead">
        Files on the sides. Numbers in the middle. A red line is a contradiction.
      </p>
      <svg className="room-graph-svg" viewBox={`0 0 600 ${height}`} role="img" aria-label="How the files connect">
        {visible.map((edge) => {
          const from = byId.get(edge.source);
          const to = byId.get(edge.target);
          if (!from || !to) return null;
          return (
            <g key={`${edge.source}-${edge.target}-${edge.rel}`} className={edgeClass(edge)}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
            </g>
          );
        })}
        {placed.map((node) => {
          const file = node.source;
          const on = file && file === activeFile;
          if (file) {
            return (
              <g key={node.id} className={`kg-node is-file ${on ? "is-on" : ""}`}>
                <rect x={node.x - 70} y={node.y - 18} width="140" height="36" rx="2" />
                <text x={node.x} y={node.y + 4} textAnchor="middle">
                  {node.label.replace(/^northstar-/, "").slice(0, 22)}
                </text>
                <foreignObject x={node.x - 70} y={node.y - 18} width="140" height="36">
                  <button type="button" className="kg-hit" onClick={() => onOpenFile(file)}>
                    Open {node.label}
                  </button>
                </foreignObject>
              </g>
            );
          }
          return (
            <g key={node.id} className={`kg-node is-${node.type.toLowerCase()}`}>
              <rect x={node.x - 64} y={node.y - 16} width="128" height="32" rx="2" />
              <text x={node.x} y={node.y + 4} textAnchor="middle">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
