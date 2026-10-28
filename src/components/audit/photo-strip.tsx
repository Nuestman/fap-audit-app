"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

export type AttachmentRef = { id: number; fileName: string };

type Target = { itemResponseId: number } | { extraFindingId: number };

const MAX_EDGE = 1600;

async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Resize failed"))), "image/jpeg", 0.8),
  );
}

export function PhotoStrip({
  auditPostId,
  initial,
  ensureTarget,
}: {
  auditPostId: number;
  initial: AttachmentRef[];
  /** Returns the record the photo belongs to, saving it first if needed. */
  ensureTarget: () => Promise<Target>;
}) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const target = await ensureTarget();
      for (const file of Array.from(files)) {
        const blob = await resizeImage(file);
        const form = new FormData();
        form.set("auditPostId", String(auditPostId));
        if ("itemResponseId" in target) form.set("itemResponseId", String(target.itemResponseId));
        else form.set("extraFindingId", String(target.extraFindingId));
        form.set("file", blob, file.name.replace(/\.\w+$/, "") + ".jpg");
        const res = await fetch("/api/attachments", { method: "POST", body: form });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Upload failed");
        const row: AttachmentRef = await res.json();
        setPhotos((p) => [...p, row]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this photo?")) return;
    const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    if (res.ok) setPhotos((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((p) => (
          <div key={p.id} className="group relative">
            <a href={`/api/attachments/${p.id}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/attachments/${p.id}`}
                alt={p.fileName}
                className="size-16 rounded-lg object-cover ring-1 ring-slate-200"
              />
            </a>
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-slate-600 shadow ring-1 ring-slate-300 hover:text-red-700"
              aria-label="Delete photo"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex size-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-slate-500 hover:text-slate-700"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Photo
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
