"use client";

import type { ReactNode } from "react";
import { ConfirmProvider } from "@/components/ui/confirm";

export function Providers({ children }: { children: ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
