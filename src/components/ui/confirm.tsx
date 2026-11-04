"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive action styling (delete / remove). */
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

type Pending = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending((prev) => {
        prev?.resolve(false);
        return { ...options, resolve };
      });
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    setPending((prev) => {
      prev?.resolve(value);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={pending !== null}
        onClose={() => finish(false)}
        title={pending?.title ?? ""}
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => finish(false)}>
              {pending?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              type="button"
              variant={pending?.danger ? "danger" : "primary"}
              onClick={() => finish(true)}
              autoFocus
            >
              {pending?.confirmLabel ?? (pending?.danger ? "Delete" : "Confirm")}
            </Button>
          </>
        }
      >
        {pending?.description ? (
          <p className="text-sm text-slate-600">{pending.description}</p>
        ) : null}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return fn;
}
