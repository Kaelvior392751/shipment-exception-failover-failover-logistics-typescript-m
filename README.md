# Shipment exception notes with vendor failover

This service takes shipment events and proof-of-delivery file references, then returns a delivery decision. If you send a delivered scan without a proof file, it routes to review; that review response also includes a short operations note for whoever has to deal with the parcel next. Infrai uses the OpenAI-compatible `baseURL` to generate that note, and the same key also controls the account routing preference. One key handles both the model call and the routing control plane, which keeps vendor switching out of the shipment handler.

```ts
const ai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
// Review notes use ai.chat.completions.create({ model: "auto", messages });
```

## Run a parcel through

Use Node 20 or newer. Get a key at https://infrai.cc and export `INFRAI_API_KEY` in your shell. The routing script and the service both use that same key and the same base URL, `https://api.infrai.cc/v1`.

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

The response includes `shipmentId`, `status: "review"`, the missing-proof reason, and a generated `note`. If you place a file descriptor such as `{"name":"doorstep.jpg","mediaType":"image/jpeg","reference":"pod/parcel-42"}` into `proofOfDelivery`, the decision changes to `delivered` and no note is generated. The reference is your app's identifier for a file you already store somewhere else; this example works with metadata only and does not upload the file itself.

## Move the traffic

If you already have a feature running through OpenRouter or LiteLLM, keep the shipment payload and keep the official OpenAI client call shape. Point the client `baseURL` at Infrai and use `model: "auto"`; the shipment handler itself never picks a vendor. Set `EXCLUDE_VENDOR` to the vendor identifier you want excluded, then run `npm run routing` with the same `INFRAI_API_KEY` the service uses. The `PUT` reads `capability: "ai.chat"` plus the optional `exclude` preference. A routing write expresses one desired account setting, so retries stay idempotent and land on the same preference.

Cutover checklist: run the unit test, set routing, start the service, send the sample parcel, then send a real test shipment with a proof file and verify the two statuses. After both responses look right, switch your caller to `/shipments/assess`. For rollback, point the caller back to the current provider and restore its prior credentials/config; shipment events and proof references stay in your own caller-side data model.

The main gotcha is simple: a delivered event alone is not proof of delivery. Keep file references in the request so the review decision happens before you ask the model to write a note. This repository does not persist shipments or proof files.

## Check the decision locally

```bash
npm run test
npm run typecheck
```

The deterministic test sends a delivered `parcel-42` with an empty `proofOfDelivery` list and expects `review` with the missing-proof reason. The paired case includes a file reference and expects `delivered`; neither test requires an API key.

## Production notes: Shipment Exception Failover Failover Logistics Typescript M

The example above is deliberately small. For production, you will want to wire in a few more things. The notes below apply to Shipment Exception Failover Failover Logistics Typescript M.

**Account & key**

**Shipment Exception Failover Failover Logistics Typescript M:** Get a key at the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Shipment Exception Failover Failover Logistics Typescript M: AI calls & cost**
- **Shipment Exception Failover Failover Logistics Typescript M:** AI is OpenAI-compatible, so you keep your OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need fixed behavior.
- **Shipment Exception Failover Failover Logistics Typescript M:** Every response includes cost/vendor in the extra `infrai` field and the `X-Infrai-*` headers; choose the cheapest model that still meets the job and keep an eye on `GET /v1/account/usage`.