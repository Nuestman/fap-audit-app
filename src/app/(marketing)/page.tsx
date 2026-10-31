import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { getSessionUser } from "@/lib/auth/session";
import { APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: { absolute: "FAP Audit" },
  description:
    "First Aid Post and ambulance audits — checklists, findings, actions, and reports in one place.",
};

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getSessionUser();
  const primaryHref = user ? "/audits" : "/auth/sign-in";
  const primaryLabel = user ? "Open audits" : "Sign in";

  return (
    <div className="flex min-h-screen flex-col font-sans">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link
            href="/"
            className="flex shrink-0 items-center rounded-md px-2.5 py-1.5 hover:bg-slate-100"
          >
            <BrandLogo />
          </Link>
          <div className="ml-auto">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-6xl lg:grid-cols-2">
          <div className="flex flex-col justify-center gap-6 px-4 py-12 sm:px-6 lg:py-16">
            <h1 className="landing-fade-in text-3xl font-semibold tracking-tight text-balance text-brand sm:text-4xl lg:text-5xl">
              Audit every first aid post with clarity
            </h1>
            <p className="landing-fade-in landing-delay-1 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
              Run structured FAP and ambulance audits, track findings and corrective actions, and
              export the report your team already uses.
            </p>
            <div className="landing-fade-in landing-delay-2 flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {primaryLabel}
              </Link>
              {!user ? (
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  Create account
                </Link>
              ) : null}
            </div>
          </div>

          <div className="landing-fade-in landing-delay-2 relative min-h-[40vh] overflow-hidden border-t border-slate-200 lg:min-h-0 lg:border-t-0 lg:border-l">
            {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed product screenshot */}
            <img
              src="/landing/hero-dashboard.png"
              alt="FAP Audit dashboard showing compliance by first aid post"
              className="absolute inset-0 size-full object-cover object-left-top"
            />
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-brand sm:text-3xl">
              Built for the audit visit
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Capture what you see at the post, classify findings once, and keep corrective actions
              moving — without losing the workbook workflow your team already trusts.
            </p>
            <ul className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
              {[
                {
                  title: "Protocol checklist",
                  body: "Sections A–I with autosave, evidence notes, and photo capture at the post.",
                },
                {
                  title: "Actions that stick",
                  body: "Owners, due dates, and close-out evidence across every first aid post.",
                },
                {
                  title: "Export ready",
                  body: "Excel workbook and Word report drafts generated from the live audit data.",
                },
              ].map((item) => (
                <li key={item.title} className="grid gap-1 py-5 sm:grid-cols-[12rem_1fr] sm:gap-8">
                  <p className="text-sm font-semibold text-brand-accent">{item.title}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
          <span>FAP Audit v{APP_VERSION}</span>
          <Link href={primaryHref} className="hover:text-slate-800 hover:underline">
            {primaryLabel}
          </Link>
        </div>
      </footer>
    </div>
  );
}
