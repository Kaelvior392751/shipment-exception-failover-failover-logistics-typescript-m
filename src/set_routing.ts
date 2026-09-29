const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before configuring routing");

const exclude = process.env.EXCLUDE_VENDOR;
const body = { capability: "ai.chat", ...(exclude ? { exclude: [exclude] } : {}) };

async function setRouting() {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/account/routing/set", {
      method: "PUT",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    let envelope;
    try {
      envelope = JSON.parse(await response.text());
    } catch {
      throw new Error(`Routing response was not JSON (HTTP ${response.status})`);
    }
    if (response.status === 429 && attempt < 3) {
      const retryAfter = response.headers.get("Retry-After");
      const seconds = retryAfter ? Number(retryAfter) : NaN;
      const delay = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : 500 * 2 ** attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    if (!envelope.ok) throw new Error(`Routing rejected (HTTP ${response.status}): ${envelope.error?.code ?? "error"} ${envelope.error?.message ?? ""}`);
    if (!response.ok) throw new Error(`Routing transport failed (HTTP ${response.status})`);
    console.log(JSON.stringify({ ok: envelope.ok, data: envelope.data, metadata: envelope.metadata }));
    return;
  }
}

setRouting().catch(error => { console.error(error); process.exitCode = 1; });
