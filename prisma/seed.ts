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

  const northwind = await prisma.customer.create({
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

  const beacon = await prisma.customer.create({
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

  const atlas = await prisma.customer.create({
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

  await prisma.proposal.create({
    data: {
      number: "PRO-0001",
      customerId: beacon.id,
      title: "Patient portal discovery & build",
      summary: "A two-phase engagement: discovery sprint followed by a pilot portal build.",
      status: "SENT",
      taxRate: 8.5,
      validUntil: new Date("2026-09-15"),
      terms: "50% due on acceptance, balance on delivery. Quote valid for 30 days.",
      items: {
        create: [
          { description: "Discovery workshop & stakeholder interviews", quantity: 1, unitPrice: 4200, position: 0 },
          { description: "Portal UI design (per screen)", quantity: 8, unitPrice: 650, position: 1 },
          { description: "Pilot build & integration", quantity: 1, unitPrice: 18500, position: 2 },
        ],
      },
    },
  });

  await prisma.proposal.create({
    data: {
      number: "PRO-0002",
      customerId: atlas.id,
      title: "Site logistics tracker — phase 1",
      summary: "Mobile-first tracker for deliveries and plant hire across active sites.",
      taxRate: 20,
      validUntil: new Date("2026-09-30"),
      items: {
        create: [
          { description: "Requirements workshop", quantity: 1, unitPrice: 1500, position: 0 },
          { description: "Tracker build (developer days)", quantity: 14, unitPrice: 500, position: 1 },
        ],
      },
    },
  });

  // Tags — colours match src/lib/tags.ts so seeded tags look like created ones.
  const tagColor = (name: string) => {
    const palette = ["slate", "brand", "emerald", "amber", "violet", "sky", "red"];
    let hash = 0;
    for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) % 100_000;
    return palette[hash % palette.length];
  };

  for (const [name, customerIds] of [
    ["enterprise", [northwind.id, atlas.id]],
    ["healthcare", [beacon.id]],
    ["construction", [atlas.id]],
  ] as const) {
    await prisma.tag.create({
      data: {
        name,
        color: tagColor(name),
        customers: { connect: customerIds.map((id) => ({ id })) },
      },
    });
  }

  const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);

  // An invoice part paid and past due, so the dashboard has something to warn about.
  const overdueInvoice = await prisma.invoice.create({
    data: {
      number: "INV-0001",
      customerId: beacon.id,
      title: "Care pathway portal — milestone 1",
      status: "PARTIALLY_PAID",
      taxRate: 8.5,
      dueDate: daysFromNow(-6),
      terms: "Payable within 30 days by bank transfer.",
      items: {
        create: [{ description: "Milestone 1 — discovery & design", quantity: 1, unitPrice: 4000, position: 0 }],
      },
      payments: {
        create: [{ amount: 1500, method: "BANK_TRANSFER", reference: "TRF-4471", receivedAt: daysFromNow(-12) }],
      },
    },
  });

  // One settled in full, so "paid" is represented too.
  await prisma.invoice.create({
    data: {
      number: "INV-0002",
      customerId: northwind.id,
      title: "Inventory portal revamp — deposit",
      status: "PAID",
      paidAt: daysFromNow(-3),
      dueDate: daysFromNow(-1),
      items: { create: [{ description: "50% deposit", quantity: 1, unitPrice: 3200, position: 0 }] },
      payments: { create: [{ amount: 3200, method: "CARD", receivedAt: daysFromNow(-3) }] },
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        customerId: northwind.id,
        userId: admin.id,
        type: "CALL",
        subject: "Quarterly review — renewal intent",
        body: "Happy with delivery. Wants a proposal for phase 2 before the budget round.",
        occurredAt: daysFromNow(-4),
      },
      {
        customerId: beacon.id,
        userId: admin.id,
        type: "EMAIL",
        subject: "Chased milestone 1 invoice",
        body: `Reminder sent about ${overdueInvoice.number}.`,
        occurredAt: daysFromNow(-5),
        followUpAt: daysFromNow(-1),
      },
      {
        customerId: atlas.id,
        userId: admin.id,
        type: "MEETING",
        subject: "Site walkthrough",
        body: "Toured two active sites. Tracker needs to work offline in the basement levels.",
        occurredAt: daysFromNow(-2),
        followUpAt: daysFromNow(3),
      },
    ],
  });

  console.log("Seeded 3 customers, 2 proposals, 3 tags, 2 invoices with payments, and 3 activities.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
