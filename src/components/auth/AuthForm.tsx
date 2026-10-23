"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register, type AuthState } from "@/app/(auth)/actions";
import { useI18n } from "@/i18n/client";

type Props = { mode: "login" | "register"; next?: string };

const inputClass =
  "mt-1.5 w-full rounded-lg border border-[#c9a35f]/50 bg-white/70 px-4 py-3 text-[#4a2a2e] outline-none transition placeholder:text-[#a8837a]/70 focus:border-[#6b1d29] focus:ring-2 focus:ring-[#6b1d29]/15";

export function AuthForm({ mode, next }: Props) {
  const { auth } = useI18n().t;
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, {});
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === "login";
  // Conserva a dónde quería ir la persona al cambiar entre "Entrar" y "Crear cuenta"
  const suffix = next ? `?siguiente=${encodeURIComponent(next)}` : "";

  return (
    <>
      <h1 className="text-center font-script text-5xl leading-tight text-[#7a1f2c]">{isLogin ? auth.loginTitle : auth.registerTitle}</h1>
      <div className="mx-auto my-4 h-px w-14 bg-[#c9a35f]" aria-hidden />
      <p className="text-center font-serif text-lg text-[#6b4a4a]">{isLogin ? auth.loginSubtitle : auth.registerSubtitle}</p>

      <form action={action} className="mt-8 space-y-5" noValidate>
        {next && <input type="hidden" name="siguiente" value={next} />}

        {!isLogin && (
          <label className="block text-sm font-medium">
            {auth.name}
            <input
              name="name"
              autoComplete="name"
              required
              defaultValue={state.fields?.name}
              placeholder={auth.namePlaceholder}
              className={inputClass}
            />
          </label>
        )}

        <label className="block text-sm font-medium">
          {auth.email}
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.fields?.email}
            placeholder={auth.emailPlaceholder}
            className={inputClass}
          />
        </label>

        <div>
          <label className="block text-sm font-medium" htmlFor="password">
            {auth.password}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={isLogin ? undefined : 8}
              aria-describedby={isLogin ? undefined : "password-hint"}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? auth.hidePassword : auth.showPassword}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 mt-[3px] -translate-y-1/2 rounded-md p-2 text-[#a8837a] transition hover:text-[#6b1d29]"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
                <circle cx="12" cy="12" r="2.8" />
                {showPassword && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </div>
          {!isLogin && (
            <p id="password-hint" className="mt-1.5 text-xs text-[#a8837a]">
              {auth.passwordHint}
            </p>
          )}
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg bg-[#6b1d29]/8 px-4 py-3 text-sm text-[#7a1f2c]">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[#6b1d29] px-6 py-3.5 font-medium text-[#f6efe2] shadow-[0_10px_24px_-12px_rgba(107,29,41,0.8)] transition hover:bg-[#7d2533] disabled:opacity-60"
        >
          {isLogin ? (pending ? auth.loggingIn : auth.login) : pending ? auth.registering : auth.register}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[#6b4a4a]">
        {isLogin ? auth.noAccount : auth.haveAccount}{" "}
        <Link href={`${isLogin ? "/registro" : "/entrar"}${suffix}`} className="font-medium text-[#6b1d29] underline-offset-4 hover:underline">
          {isLogin ? auth.createAccount : auth.goLogin}
        </Link>
      </p>
    </>
  );
}
