import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { loadProposalDocument } from "@/lib/proposal-loader";
import { ProposalDocument } from "@/components/proposal-document";
import { PrintButton } from "@/components/print-button";
import { Card } from "@/components/ui";

export default async function ProposalPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const proposal = await loadProposalDocument({ id });
  if (!proposal) notFound();

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/proposals/${id}`}
          className="text-sm text-slate-500 transition-colors hover:text-brand-600"
        >
          ← Back to editor
        </Link>
        <PrintButton />
      </div>

      <Card className="overflow-hidden print:border-0 print:shadow-none">
        <ProposalDocument proposal={proposal} />
      </Card>
    </div>
  );
}
