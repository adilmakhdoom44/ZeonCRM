"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { createResetToken } from "@/lib/actions/auth";

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) redirect("/settings/users?error=invalid");

  const { name, email, password, role } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/settings/users?error=exists");

  await prisma.user.create({
    data: { name, email, role, passwordHash: await bcrypt.hash(password, 12) },
  });

  revalidatePath("/settings/users");
  redirect("/settings/users?created=1");
}

export async function toggleUserActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));

  if (id === admin.id) redirect("/settings/users?error=self");

  const user = await prisma.user.findUnique({ where: { id } });
  if (user) {
    await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }
  revalidatePath("/settings/users");
}

export async function generateResetLinkAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/settings/users");

  const token = await createResetToken(user.id);
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const link = `${base}/reset-password/${token}`;

  redirect(`/settings/users?link=${encodeURIComponent(link)}&for=${encodeURIComponent(user.email)}`);
}
