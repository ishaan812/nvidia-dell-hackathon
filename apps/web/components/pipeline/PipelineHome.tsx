import type { DealSummary } from "@/lib/diligence/types";
import { AppChrome } from "../AppChrome";
import { DealPicker } from "../DealPicker";
import { PageFrame } from "../PageFrame";
import { PipelineBoard } from "./PipelineBoard";

type Props = {
  deals: DealSummary[];
  model: { ok: boolean; models: string[] };
  using: string;
};

export function PipelineHome({ deals, model, using }: Props) {
  const book = deals.filter((deal) => deal.stage);
  const rooms = deals.filter((deal) => !deal.stage);

  return (
    <div className="min-h-screen">
      <a href="#pipeline-heading" className="skip-link">
        Skip to pipeline
      </a>
      <PageFrame>
        <header className="pb-8 pt-10">
          <AppChrome model={using} modelOk={model.ok} />
          <h1 className="mt-9 font-serif text-[2.75rem] font-medium leading-none tracking-tight">
            Pipeline
          </h1>
          <p className="mt-3 max-w-md text-[1.05rem] leading-7 text-mute">
            Open a deal. The rail shows where it is. Waiting on email means the desk stopped for you.
          </p>
        </header>
        <PipelineBoard deals={book.length ? book : deals} />
        <details className="mt-12 pb-20">
          <summary className="cursor-pointer text-[0.95rem] text-mute hover:text-paper">
            Add another room
          </summary>
          <div className="mt-8">
            <DealPicker deals={rooms} model={model} using={using} embedded />
          </div>
        </details>
      </PageFrame>
    </div>
  );
}
