import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { isAwaitingResponse } from "@/lib/proposals";
import { loadProposalDocument } from "@/lib/proposal-loader";
import { ProposalDocument } from "@/components/proposal-document";
import { ProposalResponse } from "@/components/proposal-response";
import { PrintButton } from "@/components/print-button";

// Shared quotes must never be indexed — the token is the only thing protecting them.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function LinkNotValid({ companyName }: { companyName: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="text-lg font-semibold tracking-tight text-slate-900">
          This link is no longer valid
        </p>
        <p className="mt-2 text-sm text-slate-500">
          The proposal may have been withdrawn or replaced with an updated version. Please contact{" "}
          {companyName} for a current copy.
        </p>
      </div>
    </main>
  );
}

export default async function SharedProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [proposal, record, company] = await Promise.all([
    loadProposalDocument({ shareToken: token }),
    prisma.proposal.findUnique({
      where: { shareToken: token },
      select: { status: true, validUntil: true },
    }),
    getCompany(),
  ]);

  if (!proposal || !record) return <LinkNotValid companyName={company.name} />;

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="no-print flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Proposal from <span className="font-medium text-slate-700">{company.name}</span>
          </p>
          <PrintButton label="Download PDF" />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] print:border-0 print:shadow-none">
          <ProposalDocument proposal={proposal} company={company} />
        </div>

        {isAwaitingResponse(record) && (
          <div className="no-print">
            <ProposalResponse token={token} />
          </div>
        )}

        <p className="no-print pb-6 text-center text-xs text-slate-400">
          Questions about this quote? Reply to the email this link came from.
        </p>
      </div>
    </main>
  );
}
