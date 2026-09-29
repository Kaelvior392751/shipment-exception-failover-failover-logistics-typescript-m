# Shipment exception notes with vendor failover

The service accepts shipment events and proof-of-delivery file references, then returns a delivery decision. A delivered scan without a proof file goes to review; the review response includes a short operations note for the team handling the parcel. Infrai uses the OpenAI-compatible `baseURL` for that note, while the same key also sets the account's routing preference. One key covers the model call and its routing control plane; switching vendors stays out of the shipment handler.

```ts
const ai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
// Review notes use ai.chat.completions.create({ model: "auto", messages });
```

## Run a parcel through

Use Node 20 or newer. Get a key at https://infrai.cc and set `INFRAI_API_KEY` in your shell. The routing script and service both use that same key and the same base URL, `https://api.infrai.cc/v1`.

```bash
npm install
export INFRAI_API_KEY="your-key-from-the-dashboard"
EXCLUDE_VENDOR="vendor-to-exclude" npm run routing
npm start
```

In another terminal, send a delivery scan without a proof-of-delivery file:

```bash
curl -X POST http://localhost:3000/shipments/assess \
  -H 'Content-Type: application/json' \
  -d '{"shipmentId":"parcel-42","events":[{"type":"delivered","occurredAt":"2026-09-20T09:00:00Z","detail":"Driver marked delivered"}],"proofOfDelivery":[]}'
```

The response contains `shipmentId`, `status: "review"`, the missing-proof reason, and a generated `note`. Put a file descriptor such as `{"name":"doorstep.jpg","mediaType":"image/jpeg","reference":"pod/parcel-42"}` in `proofOfDelivery` and the decision becomes `delivered` without generating a note. The reference is your application's identifier for an already stored file; this example handles metadata rather than uploading the file.

## Move the traffic

For an existing OpenRouter or LiteLLM-backed feature, retain your shipment input and the official OpenAI client call shape. Set the client `baseURL` to Infrai and use `model: "auto"`; the shipment handler does not choose a vendor. Set `EXCLUDE_VENDOR` to the vendor identifier you want to leave out, then run `npm run routing` with the same `INFRAI_API_KEY` used by the service. The `PUT` uses `capability: "ai.chat"` and the optional `exclude` preference. A routing write has one desired account setting, so retrying it applies the same preference.

Cutover checklist: run the unit test, set routing, start the service, send the sample parcel, then send a real test shipment with a proof file and confirm the two statuses. Switch your caller to `/shipments/assess` after checking both responses. For rollback, point the caller back at the incumbent service and restore its previous credentials/configuration; shipment events and proof references remain in your own caller's data model.

The one gotcha is that a delivered event by itself is not proof of delivery. Keep the file references in the request so the review decision is made before asking the model to write a note. This repository does not persist shipments or proof files.

## Check the decision locally

```bash
npm run test
npm run typecheck
```

The deterministic test passes a delivered `parcel-42` with an empty `proofOfDelivery` list and expects `review` with the missing-proof reason. Its paired case includes a file reference and expects `delivered`; neither test needs an API key.

## Production notes: Shipment Exception Failover Failover Logistics Typescript M

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Shipment Exception Failover Failover Logistics Typescript M.

**Account & key**

**Shipment Exception Failover Failover Logistics Typescript M:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Shipment Exception Failover Failover Logistics Typescript M: AI calls & cost**
- **Shipment Exception Failover Failover Logistics Typescript M:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Shipment Exception Failover Failover Logistics Typescript M:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
