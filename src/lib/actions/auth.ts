"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return token;
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.isActive) {
    const token = await createResetToken(user.id);
    const base = process.env.AUTH_URL ?? "http://localhost:3000";
    // No SMTP is configured, so the reset link is logged to the server console.
    // An admin can also generate a link from Settings → Users.
    console.log(`[Zeon CRM] Password reset link for ${email}: ${base}/reset-password/${token}`);
  }

  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(token: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) redirect(`/reset-password/${token}?error=short`);
  if (password !== confirm) redirect(`/reset-password/${token}?error=mismatch`);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    redirect(`/reset-password/${token}?error=invalid`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/login?reset=1");
}
