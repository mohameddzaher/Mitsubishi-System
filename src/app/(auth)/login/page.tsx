import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { getTranslations } from "next-intl/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { error, callbackUrl } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {t("welcome")}
        </h1>
        <p className="text-xs text-[var(--color-text-muted)]">{t("welcomeSubtitle")}</p>
      </div>

      {error && (
        <div className="rounded-md border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {error === "CredentialsSignin" ? t("invalidCredentials") : error}
        </div>
      )}

      <LoginForm callbackUrl={callbackUrl} />

      <div className="flex items-center justify-between text-xs">
        <Link href="/forgot-password" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          {t("forgotPassword")}
        </Link>
        <div className="text-[var(--color-text-muted)]">
          Need help? <span className="text-[var(--color-text-secondary)]">8001282828</span>
        </div>
      </div>
    </div>
  );
}
