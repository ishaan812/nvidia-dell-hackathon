import { runDeal } from "./pipeline";
import { buildNorthstar } from "./sample";
import { dirs } from "./paths";

async function main() {
  const [, , cmd, arg] = process.argv;
  if (cmd === "sample") {
    const folder = await buildNorthstar();
    console.log(folder);
    return;
  }
  if (cmd === "run") {
    const folder = arg ?? dirs().sample;
    const deal = await runDeal(folder);
    console.log(JSON.stringify({ id: deal.id, risk: deal.riskScore, flags: deal.flags.map((f) => f.id) }, null, 2));
    return;
  }
  console.log("usage: tsx lib/diligence/cli.ts sample|run [folder]");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
