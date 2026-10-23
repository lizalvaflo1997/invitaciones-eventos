"use server";

import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { createSession, destroySession, safeNext } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export type AuthState = { error?: string; fields?: { name?: string; email?: string } };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const read = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { auth } = await getDictionary();
  const email = read(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await db.user.findUnique({ where: { email } });
  // Mismo mensaje si no existe el correo o si falla la contraseña, para no revelar qué cuentas existen
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: auth.errors.invalidCredentials, fields: { email } };
  }

  await createSession(user.id);
  redirect(safeNext(formData.get("siguiente")));
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { auth } = await getDictionary();
  const name = read(formData, "name");
  const email = read(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fields = { name, email };

  if (!name) return { error: auth.errors.nameRequired, fields };
  if (!EMAIL.test(email)) return { error: auth.errors.invalidEmail, fields };
  if (password.length < MIN_PASSWORD) return { error: auth.errors.shortPassword, fields };
  if (await db.user.findUnique({ where: { email } })) return { error: auth.errors.emailTaken, fields };

  const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  await createSession(user.id);
  redirect(safeNext(formData.get("siguiente")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
