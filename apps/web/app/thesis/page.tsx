import type { Metadata } from "next";
import { AppChrome } from "@/components/AppChrome";
import { PageFrame } from "@/components/PageFrame";
import { ThesisForm } from "@/components/thesis/ThesisForm";
import { settings } from "@/lib/diligence/paths";
import { loadThesis } from "@/lib/intelligence/thesis";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thesis",
};

export default async function ThesisPage() {
  const thesis = await loadThesis();
  return (
    <div className="min-h-screen">
      <PageFrame>
        <header className="pb-6 pt-10">
          <AppChrome model={settings().llmModel} />
          <h1 className="mt-9 font-serif text-[2.75rem] font-medium leading-none tracking-tight">
            Thesis
          </h1>
        </header>
        <main className="pb-20">
          <ThesisForm thesis={thesis} />
        </main>
      </PageFrame>
    </div>
  );
}
