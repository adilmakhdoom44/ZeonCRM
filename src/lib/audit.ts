import { prisma } from "@/lib/prisma";

type Actor = { id?: string; name?: string | null } | null | undefined;

/**
 * Records a change. Deliberately fire-and-forget from the caller's point of
 * view: an audit write that fails must never roll back the thing it describes,
 * because losing the work to save the paperwork is the wrong trade. Failures go
 * to the server log instead.
 */
export async function recordAudit({
  actor,
  action,
  entity,
  entityId,
  summary,
}: {
  actor: Actor;
  action: "created" | "updated" | "deleted" | "sent" | "paid" | "assigned";
  entity: "Customer" | "Project" | "Proposal" | "Invoice" | "Payment" | "User";
  entityId: string;
  summary: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: actor?.id ?? null,
        actorName: actor?.name ?? "Unknown",
        action,
        entity,
        entityId,
        summary,
      },
    });
  } catch (error) {
    console.error("[Zeon CRM] Audit write failed:", error);
  }
}
