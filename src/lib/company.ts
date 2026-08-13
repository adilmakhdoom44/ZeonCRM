import { prisma } from "@/lib/prisma";

export type Company = {
  name: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
};

/**
 * Environment variables are the fallback, not the source of truth: they seed a
 * fresh install and keep the app working before anyone opens Settings. Once a
 * row exists it wins, so changing your details never means a redeploy.
 */
const fromEnv = (): Company => ({
  name: process.env.COMPANY_NAME ?? "Zeon Studio",
  email: process.env.COMPANY_EMAIL ?? "hello@example.com",
  phone: process.env.COMPANY_PHONE ?? "",
  address: process.env.COMPANY_ADDRESS ?? "",
  currency: process.env.COMPANY_CURRENCY ?? "USD",
  taxRate: 0,
});

export async function getCompany(): Promise<Company> {
  const env = fromEnv();

  try {
    const saved = await prisma.companySettings.findUnique({ where: { id: "default" } });
    if (!saved) return env;

    return {
      name: saved.name || env.name,
      email: saved.email ?? env.email,
      phone: saved.phone ?? env.phone,
      address: saved.address ?? env.address,
      currency: saved.currency || env.currency,
      taxRate: Number(saved.taxRate),
    };
  } catch {
    // A settings lookup must never be the reason an invoice fails to render.
    return env;
  }
}
