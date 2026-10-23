import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { getDictionary } from "@/i18n/server";
import { getCurrentUser, safeNext } from "@/lib/auth";

type Props = { searchParams: Promise<{ siguiente?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const { auth } = await getDictionary();
  return { title: auth.registerMeta, robots: { index: false } };
}

export default async function RegisterPage({ searchParams }: Props) {
  const { siguiente } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(siguiente));

  return (
    <AuthShell>
      <AuthForm mode="register" next={siguiente ? safeNext(siguiente) : undefined} />
    </AuthShell>
  );
}
