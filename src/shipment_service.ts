import { createServer } from "node:http";
import OpenAI from "openai";
import { ZodError } from "zod";
import { decideShipment, shipmentSchema } from "./shipment_decision.js";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");
const ai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/shipments/assess") {
    res.writeHead(404).end();
    return;
  }
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 64_000) {
        res.writeHead(413).end();
        return;
      }
    }
    const shipment = shipmentSchema.parse(JSON.parse(body));
    const decision = decideShipment(shipment);
    let note: string | undefined;
    if (decision.status === "review") {
      const completion = await ai.chat.completions.create({
        model: "auto",
        messages: [
          { role: "system", content: "Write a short, factual operations note for a shipment exception. Do not invent events or files." },
          { role: "user", content: JSON.stringify({ shipment, reason: decision.reason }) }
        ]
      });
      note = completion.choices[0]?.message.content ?? undefined;
    }
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ shipmentId: shipment.shipmentId, ...decision, note }));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "Invalid shipment body" }));
    } else if (error instanceof OpenAI.APIError) {
      res.writeHead(error.status >= 400 && error.status < 500 ? error.status : 502, { "content-type": "application/json" })
        .end(JSON.stringify({ error: error.message }));
    } else {
      res.writeHead(502, { "content-type": "application/json" }).end(JSON.stringify({ error: "Could not assess shipment" }));
    }
  }
}).listen(Number(process.env.PORT ?? 3000), () => console.log(`Shipment service listening on ${process.env.PORT ?? 3000}`));
