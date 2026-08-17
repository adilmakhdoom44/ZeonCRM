"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import { callerIp, checkRateLimit, clearRateLimit, recordAttempt } from "@/lib/rate-limit";

/**
 * Two buckets, because they stop different things. The per-address one keeps a
 * single account from being ground through a password list; the per-caller one
 * keeps somebody from spraying one password across many accounts. Both have to
 * allow the attempt for it to proceed.
 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const ip = await callerIp();

  const [byAccount, byCaller] = await Promise.all([
    checkRateLimit({ scope: "login:email", identifier: email, limit: 5, windowMs: LOGIN_WINDOW_MS }),
    checkRateLimit({ scope: "login:ip", identifier: ip, limit: 20, windowMs: LOGIN_WINDOW_MS }),
  ]);

  if (!byAccount.allowed || !byCaller.allowed) {
    redirect(
      `/login?throttled=${Math.max(byAccount.retryAfterSeconds, byCaller.retryAfterSeconds)}`,
    );
  }

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // A correct sign-in leaves through here too — signIn throws its redirect — so
    // only an AuthError counts against the budget.
    if (error instanceof AuthError) {
      await Promise.all([
        recordAttempt("login:email", email),
        recordAttempt("login:ip", ip),
      ]);
      redirect("/login?error=1");
    }
    // A successful sign-in wipes the slate for that address.
    await clearRateLimit("login:email", email);
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

  // Throttled per caller rather than per address: the response is deliberately
  // identical whether or not the account exists, and per-address limiting would
  // leak which is which by behaving differently.
  const ip = await callerIp();
  const allowance = await checkRateLimit({
    scope: "reset:ip",
    identifier: ip,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowance.allowed) redirect("/forgot-password?sent=1");
  await recordAttempt("reset:ip", ip);

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.isActive) {
    const token = await createResetToken(user.id);
    const base = process.env.AUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${base}/reset-password/${token}`;

    const { subject, html } = await passwordResetEmail({ name: user.name, resetUrl });
    const result = await sendEmail({ to: email, subject, html });

    // Without an API key sendEmail logs instead of delivering, so print the link
    // too — otherwise a local reset would be unreachable. An admin can also
    // generate one from Settings → Users.
    if (!result.ok || !result.delivered) {
      console.log(`[Zeon CRM] Password reset link for ${email}: ${resetUrl}`);
    }
    if (!result.ok) {
      console.error(`[Zeon CRM] Reset email failed: ${result.error}`);
    }
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
