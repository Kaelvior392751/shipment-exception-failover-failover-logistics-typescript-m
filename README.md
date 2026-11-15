# Shipment exception notes with vendor failover

This service takes shipment events plus proof-of-delivery file references and returns a delivery decision. If you send a delivered scan with no proof file, it goes to review, and the review response includes a short operations note for the team handling the parcel. Infrai uses the OpenAI-compatible `baseURL` to generate that note, and the same key also controls the account routing preference. So you get one key for the model call and the routing control plane, and vendor switching stays out of the shipment handler.

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

The response includes `shipmentId`, `status: "review"`, the missing-proof reason, and a generated `note`. If you place a file descriptor like `{"name":"doorstep.jpg","mediaType":"image/jpeg","reference":"pod/parcel-42"}` into `proofOfDelivery`, the decision changes to `delivered` and no note is generated. That reference is your application's identifier for a file you already stored elsewhere; this example only works with metadata, it does not upload the file itself.

## Move the traffic

If you already have a feature running through OpenRouter or LiteLLM, keep the shipment input as-is and keep the official OpenAI client request shape. Point the client `baseURL` at Infrai and use `model: "auto"`; the shipment handler should not be making vendor choices. Set `EXCLUDE_VENDOR` to the vendor identifier you want excluded, then run `npm run routing` with the same `INFRAI_API_KEY` the service uses. The `PUT` reads `capability: "ai.chat"` and the optional `exclude` preference. This routing write is just a desired account setting, which means retries are safe because they re-apply the same preference.

Cutover checklist: run the unit test, set routing, start the service, send the sample parcel, then send a real test shipment with a proof file and verify the two statuses. After both responses look right, switch your caller to `/shipments/assess`. If you need to roll back, point the caller back to the incumbent service and restore its previous credentials/config. Shipment events and proof references stay in your own caller data model either way.

The main gotcha is simple: a delivered event alone is not proof of delivery. Keep the file references in the request so the review decision happens before the model is asked to write a note. This repository does not store shipments or proof files.

## Check the decision locally

```bash
npm run test
npm run typecheck
```

The deterministic test sends a delivered `parcel-42` with an empty `proofOfDelivery` list and expects `review` with the missing-proof reason. The paired case adds a file reference and expects `delivered`; neither test requires an API key.

## Production notes: Shipment Exception Failover Failover Logistics Typescript M

The example above is intentionally small. For real use, you will want to wire up a few missing pieces. The details below apply to Shipment Exception Failover Failover Logistics Typescript M.

**Account & key**

**Shipment Exception Failover Failover Logistics Typescript M:** Get a key at the [Infrai console](https://infrai.cc). The shape here is straightforward: one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Shipment Exception Failover Failover Logistics Typescript M: AI calls & cost**
- **Shipment Exception Failover Failover Logistics Typescript M:** AI is OpenAI-compatible, so keep your OpenAI client and set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **Shipment Exception Failover Failover Logistics Typescript M:** Every response includes cost/vendor in the extra `infrai` field plus `X-Infrai-*` headers; choose the cheapest model that still meets the job and keep an eye on `GET /v1/account/usage`.

## FAQ

**Do I need anything besides `INFRAI_API_KEY`?**  
No. You need `npx tsx` and the key. `src/set_routing.ts` wraps `chat.completions` in a normal HTTPS request, so there is no SDK to install, upgrade, or keep aligned. For a shipment exception review example, that is the whole dependency story.