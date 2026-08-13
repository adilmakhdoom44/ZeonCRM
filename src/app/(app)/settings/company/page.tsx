import { requireAdmin } from "@/lib/authz";
import { getCompany } from "@/lib/company";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { PageHeader } from "@/components/ui";

export default async function CompanySettingsPage() {
  await requireAdmin();
  const company = await getCompany();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Your business details, as your customers see them."
      />
      <CompanySettingsForm company={company} />
    </div>
  );
}
