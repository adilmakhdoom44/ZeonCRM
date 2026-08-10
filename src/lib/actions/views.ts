"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const saveSchema = z.object({
  name: z.string().trim().min(1).max(40),
  query: z.string().max(500),
});

/**
 * Views belong to the person who saved them — one person's "my leads" is not
 * everyone's. Saving the same name twice overwrites rather than erroring, so
 * refining a view is the same gesture as making one.
 */
export async function saveViewAction(formData: FormData) {
  const user = await requireUser();

  const parsed = saveSchema.safeParse({
    name: formData.get("name"),
    query: formData.get("query") ?? "",
  });
  if (!parsed.success) return;

  await prisma.savedView.upsert({
    where: { userId_name: { userId: user.id, name: parsed.data.name } },
    update: { query: parsed.data.query },
    create: { userId: user.id, name: parsed.data.name, query: parsed.data.query },
  });

  revalidatePath("/customers");
}

export async function deleteViewAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  // Scoped to the owner so an id from elsewhere cannot delete someone else's view.
  await prisma.savedView.deleteMany({ where: { id, userId: user.id } });

  revalidatePath("/customers");
}
