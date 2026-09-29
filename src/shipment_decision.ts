import { z } from "zod";

export const shipmentSchema = z.object({
  shipmentId: z.string().min(1),
  events: z.array(z.object({
    type: z.enum(["picked_up", "in_transit", "delivered", "exception"]),
    occurredAt: z.string().datetime(),
    detail: z.string().min(1)
  })).min(1),
  proofOfDelivery: z.array(z.object({
    name: z.string().min(1),
    mediaType: z.string().min(1),
    reference: z.string().min(1)
  }))
});

export type Shipment = z.infer<typeof shipmentSchema>;

export function decideShipment(shipment: Shipment): { status: "delivered" | "review"; reason: string } {
  const latest = [...shipment.events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  if (latest.type === "exception") return { status: "review", reason: latest.detail };
  if (latest.type === "delivered" && shipment.proofOfDelivery.length === 0) {
    return { status: "review", reason: "Delivery recorded without proof-of-delivery files" };
  }
  if (latest.type === "delivered") return { status: "delivered", reason: "Proof of delivery attached" };
  return { status: "review", reason: "Shipment has not reached delivery" };
}
