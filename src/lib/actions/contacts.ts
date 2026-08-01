"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const labelSchema = z.enum(["WORK", "MOBILE", "HOME", "OTHER"]);

export async function createContactAction(customerId: string, formData: FormData) {
  await requireUser();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName || !lastName) redirect(`/customers/${customerId}?error=contact`);

  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  await prisma.contact.create({
    data: {
      customerId,
      firstName,
      lastName,
      title: String(formData.get("title") ?? "").trim() || null,
      isPrimary: formData.get("isPrimary") === "on",
      phones: phone ? { create: [{ label: "WORK", number: phone }] } : undefined,
      emails: email ? { create: [{ label: "WORK", email }] } : undefined,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function updateContactAction(contactId: string, formData: FormData) {
  await requireUser();

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) redirect("/customers");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName || !lastName) redirect(`/contacts/${contactId}/edit?error=1`);

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      firstName,
      lastName,
      title: String(formData.get("title") ?? "").trim() || null,
      isPrimary: formData.get("isPrimary") === "on",
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath(`/customers/${contact.customerId}`);
  redirect(`/customers/${contact.customerId}`);
}

export async function deleteContactAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (contact) {
    await prisma.contact.delete({ where: { id } });
    revalidatePath(`/customers/${contact.customerId}`);
  }
}

export async function addPhoneAction(contactId: string, formData: FormData) {
  await requireUser();
  const number = String(formData.get("number") ?? "").trim();
  const label = labelSchema.safeParse(formData.get("label"));
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (contact && number) {
    await prisma.contactPhone.create({
      data: { contactId, number, label: label.success ? label.data : "WORK" },
    });
    revalidatePath(`/customers/${contact.customerId}`);
  }
}

export async function deletePhoneAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  const phone = await prisma.contactPhone.findUnique({
    where: { id },
    include: { contact: true },
  });
  if (phone) {
    await prisma.contactPhone.delete({ where: { id } });
    revalidatePath(`/customers/${phone.contact.customerId}`);
  }
}

export async function addEmailAction(contactId: string, formData: FormData) {
  await requireUser();
  const email = String(formData.get("email") ?? "").trim();
  const label = labelSchema.safeParse(formData.get("label"));
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (contact && email) {
    await prisma.contactEmail.create({
      data: { contactId, email, label: label.success ? label.data : "WORK" },
    });
    revalidatePath(`/customers/${contact.customerId}`);
  }
}

export async function deleteEmailAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  const record = await prisma.contactEmail.findUnique({
    where: { id },
    include: { contact: true },
  });
  if (record) {
    await prisma.contactEmail.delete({ where: { id } });
    revalidatePath(`/customers/${record.contact.customerId}`);
  }
}
