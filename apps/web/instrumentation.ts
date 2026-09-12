export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startInboxWatch } = await import("./lib/diligence/inbox");
  startInboxWatch();
}
