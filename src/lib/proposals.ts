export const PROPOSAL_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

function endOfDay(value: Date | string) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * A proposal expires by the calendar, not by a background job: anything still
 * awaiting a reply after its valid-until date reads as expired everywhere.
 */
export function effectiveStatus(
  proposal: { status: string; validUntil: Date | string | null },
  now: Date = new Date(),
): ProposalStatus {
  if (
    proposal.status === "SENT" &&
    proposal.validUntil &&
    endOfDay(proposal.validUntil) < now
  ) {
    return "EXPIRED";
  }
  return proposal.status as ProposalStatus;
}

/** Only drafts are editable — a quote a client can already see must not change under them. */
export function isEditable(proposal: { status: string }) {
  return proposal.status === "DRAFT";
}

/** A client may still accept or decline while the proposal is out and unanswered. */
export function isAwaitingResponse(
  proposal: { status: string; validUntil: Date | string | null },
  now: Date = new Date(),
) {
  return effectiveStatus(proposal, now) === "SENT";
}
