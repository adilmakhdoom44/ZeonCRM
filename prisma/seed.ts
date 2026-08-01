import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@zeoncrm.local";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Zeon Admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin user ready: ${admin.email}`);

  const customerCount = await prisma.customer.count();
  if (customerCount > 0) {
    console.log("Customers already seeded, skipping.");
    return;
  }

  await prisma.customer.create({
    data: {
      name: "Northwind Traders",
      industry: "Wholesale & Distribution",
      website: "https://northwind.example.com",
      status: "ACTIVE",
      notes: "Long-standing account, quarterly review cadence.",
      contacts: {
        create: [
          {
            firstName: "Elena",
            lastName: "Vargas",
            title: "Procurement Manager",
            isPrimary: true,
            phones: {
              create: [
                { label: "WORK", number: "+1 (415) 555-0132" },
                { label: "MOBILE", number: "+1 (415) 555-0198" },
              ],
            },
            emails: {
              create: [{ label: "WORK", email: "elena.vargas@northwind.example.com" }],
            },
          },
          {
            firstName: "Marcus",
            lastName: "Reid",
            title: "Operations Lead",
            phones: { create: [{ label: "WORK", number: "+1 (415) 555-0177" }] },
            emails: {
              create: [{ label: "WORK", email: "marcus.reid@northwind.example.com" }],
            },
          },
        ],
      },
      addresses: {
        create: [
          {
            type: "OFFICE",
            line1: "2200 Harrison Street",
            line2: "Suite 400",
            city: "San Francisco",
            state: "CA",
            postalCode: "94110",
            country: "United States",
          },
          {
            type: "BILLING",
            line1: "PO Box 8841",
            city: "San Francisco",
            state: "CA",
            postalCode: "94128",
            country: "United States",
          },
        ],
      },
      projects: {
        create: [
          {
            name: "Inventory portal revamp",
            description: "Rebuild the internal inventory portal with live stock sync.",
            stage: "IN_PROGRESS",
            price: 24000,
            startDate: new Date("2026-06-01"),
            dueDate: new Date("2026-10-15"),
            tasks: {
              create: [
                { title: "Discovery workshop", isDone: true },
                { title: "Data model & API design", isDone: true },
                { title: "Build stock sync service", isDone: false },
                { title: "UAT with warehouse team", isDone: false },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.customer.create({
    data: {
      name: "Beacon Health Group",
      industry: "Healthcare",
      website: "https://beaconhealth.example.com",
      status: "LEAD",
      contacts: {
        create: [
          {
            firstName: "Priya",
            lastName: "Sharma",
            title: "Director of IT",
            isPrimary: true,
            phones: { create: [{ label: "MOBILE", number: "+1 (312) 555-0245" }] },
            emails: {
              create: [
                { label: "WORK", email: "p.sharma@beaconhealth.example.com" },
                { label: "OTHER", email: "priya.sharma@gmail.example.com" },
              ],
            },
          },
        ],
      },
      addresses: {
        create: [
          {
            type: "OFFICE",
            line1: "500 W Madison Street",
            city: "Chicago",
            state: "IL",
            postalCode: "60661",
            country: "United States",
          },
        ],
      },
    },
  });

  await prisma.customer.create({
    data: {
      name: "Atlas Construction Ltd",
      industry: "Construction",
      status: "ACTIVE",
      contacts: {
        create: [
          {
            firstName: "Tom",
            lastName: "Okafor",
            title: "Managing Director",
            isPrimary: true,
            phones: { create: [{ label: "WORK", number: "+44 20 7946 0857" }] },
            emails: { create: [{ label: "WORK", email: "tom@atlasconstruction.example.co.uk" }] },
          },
        ],
      },
      addresses: {
        create: [
          {
            type: "OFFICE",
            line1: "14 Riverside Business Park",
            city: "London",
            postalCode: "SE1 7TY",
            country: "United Kingdom",
          },
        ],
      },
      projects: {
        create: [
          {
            name: "Site logistics tracker",
            stage: "QUOTED",
            price: 8500,
            startDate: new Date("2026-09-01"),
            tasks: { create: [{ title: "Send proposal", isDone: true }] },
          },
        ],
      },
    },
  });

  console.log("Seeded 3 sample customers.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
