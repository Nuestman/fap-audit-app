import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
};

/** MineAid mark + FAP Audit product name. */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <img src="/logos/fap-audit-logo-mark.png" alt="" className="h-4 w-auto" />
      <span className="text-sm font-semibold leading-none tracking-tight text-brand-accent">
        FAP Audit
      </span>
    </span>
  );
}
