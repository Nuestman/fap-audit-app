"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Debounced, serialised saving. `schedule(value)` queues the latest value; saves run
 * one at a time in order, and any pending value is flushed on unmount.
 */
export function useAutosave<T>(save: (value: T) => Promise<unknown>, delay = 800) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveRef = useRef(save);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queued = useRef<{ value: T } | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const next = queued.current;
    if (!next) return chain.current;
    queued.current = null;
    setStatus("saving");
    chain.current = chain.current
      .then(() => saveRef.current(next.value))
      .then(
        () => {
          if (!queued.current) setStatus("saved");
        },
        (err) => {
          console.error(err);
          setStatus("error");
        },
      );
    return chain.current;
  }, []);

  const schedule = useCallback(
    (value: T, immediate = false) => {
      queued.current = { value };
      clearTimeout(timer.current);
      if (immediate) {
        void flush();
      } else {
        setStatus("pending");
        timer.current = setTimeout(() => void flush(), delay);
      }
    },
    [delay, flush],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (queued.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      void flush();
    };
  }, [flush]);

  return { status, schedule, flush };
}
