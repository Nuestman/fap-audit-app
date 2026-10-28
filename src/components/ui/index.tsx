import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400",
  secondary:
    "bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "bg-white text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(BUTTON_BASE, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(BUTTON_BASE, VARIANTS[variant], className)} {...props} />;
}

const FIELD =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 disabled:bg-slate-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(FIELD, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(FIELD, "min-h-[4.5rem]", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(FIELD, "pr-8", className)} {...props} />;
}

export function Label({
  className,
  children,
  hint,
  ...props
}: ComponentProps<"label"> & { hint?: ReactNode }) {
  return (
    <label className={cn("block text-xs font-medium text-slate-600", className)} {...props}>
      {children}
      {hint ? <span className="ml-1 font-normal text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl bg-white shadow-sm ring-1 ring-slate-200", className)}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-200 bg-slate-50 text-slate-700",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="mb-6 space-y-2">
      {breadcrumb ? <div className="text-sm text-slate-500">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-200", className)}>
      <div
        className="h-full rounded-full bg-slate-900 transition-all"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
