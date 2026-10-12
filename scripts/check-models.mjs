// Usage: OPENROUTER_MODELS="provider/model,provider/fallback" npm run check:models
// Requires internet access; reports missing IDs with a non-zero exit code.
const ids = (process.env.OPENROUTER_MODELS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

if (!ids.length) {
  console.error("Set OPENROUTER_MODELS to a comma-separated list of model IDs first.");
  process.exit(1);
}

let response;
try {
  response = await fetch("https://openrouter.ai/api/v1/models", {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
} catch (error) {
  console.error("Could not reach OpenRouter:", error instanceof Error ? error.message : String(error));
  process.exit(2);
}

if (!response.ok) {
  console.error(`OpenRouter model list returned HTTP ${response.status}.`);
  process.exit(2);
}

let payload;
try {
  payload = await response.json();
} catch {
  console.error("OpenRouter returned invalid JSON.");
  process.exit(2);
}

if (!Array.isArray(payload?.data) || !payload.data.every((m) => typeof m?.id === "string")) {
  console.error("OpenRouter response did not contain the expected model list.");
  process.exit(2);
}

const available = new Set(payload.data.map((m) => m.id));
let missing = 0;
for (const id of ids) {
  const ok = available.has(id);
  console.log(`${ok ? "OK     " : "MISSING"} ${id}`);
  if (!ok) missing++;
}
if (missing) process.exit(1);
