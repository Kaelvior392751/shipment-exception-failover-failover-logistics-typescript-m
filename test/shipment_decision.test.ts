import assert from "node:assert/strict";
import test from "node:test";
import { decideShipment, shipmentSchema } from "../src/shipment_decision.js";

test("a delivered shipment without a proof file goes to review", () => {
  const shipment = shipmentSchema.parse({
    shipmentId: "parcel-42",
    events: [{ type: "delivered", occurredAt: "2026-09-20T09:00:00Z", detail: "Driver marked delivered" }],
    proofOfDelivery: []
  });
  assert.deepEqual(decideShipment(shipment), {
    status: "review", reason: "Delivery recorded without proof-of-delivery files"
  });
});

test("a delivery with a proof file needs no model note", () => {
  const shipment = shipmentSchema.parse({
    shipmentId: "parcel-43",
    events: [{ type: "delivered", occurredAt: "2026-09-20T09:00:00Z", detail: "Driver marked delivered" }],
    proofOfDelivery: [{ name: "doorstep.jpg", mediaType: "image/jpeg", reference: "pod/parcel-43" }]
  });
  assert.equal(decideShipment(shipment).status, "delivered");
});
