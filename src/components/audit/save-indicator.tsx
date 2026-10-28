import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { SaveStatus } from "@/lib/hooks/use-autosave";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  switch (status) {
    case "idle":
      return null;
    case "pending":
    case "saving":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <Loader2 className="size-3 animate-spin" /> Saving
        </span>
      );
    case "saved":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
          <Check className="size-3" /> Saved
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
          <AlertCircle className="size-3" /> Not saved – check connection
        </span>
      );
    default: {
      const unreachable: never = status;
      throw new Error(`Unknown status: ${unreachable}`);
    }
  }
}
