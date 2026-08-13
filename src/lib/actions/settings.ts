"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().max(160),
  phone: z.string().trim().max(60),
  address: z.string().trim().max(300),
  // Three letters, upper-cased for us — nobody should have to remember the casing.
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  taxRate: z.number().min(0).max(100),
});

export async function saveCompanySettingsAction(formData: FormData) {
  const user = await requireAdmin();

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    currency: formData.get("currency") ?? "USD",
    taxRate: Number(String(formData.get("taxRate") ?? "0").replace(/[^0-9.]/g, "")),
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Check the company name and a three-letter currency code." };
  }

  const data = {
    name: parsed.data.name,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    address: parsed.data.address || null,
    currency: parsed.data.currency,
    taxRate: parsed.data.taxRate,
  };

  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  await recordAudit({
    actor: user,
    action: "updated",
    entity: "User",
    entityId: "company-settings",
    summary: `Updated company settings (${data.name}, ${data.currency})`,
  });

  // Every document carries these details, so nothing cached may keep the old ones.
  revalidatePath("/", "layout");

  return { ok: true as const };
}
