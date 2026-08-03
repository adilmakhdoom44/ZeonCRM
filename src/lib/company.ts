/**
 * Whose name appears on proposals and (from day 4) invoices.
 * Day 10 moves this into editable settings — for now it comes from the
 * environment so nobody's real details end up in the repository.
 */
export const company = {
  name: process.env.COMPANY_NAME ?? "Zeon Studio",
  email: process.env.COMPANY_EMAIL ?? "hello@example.com",
  phone: process.env.COMPANY_PHONE ?? "",
  address: process.env.COMPANY_ADDRESS ?? "",
};
