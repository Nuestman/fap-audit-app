"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { saveProfile, type ProfileFormState } from "./actions";

const MAX_EDGE = 512;

async function resizeAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Resize failed"))), "image/jpeg", 0.85),
  );
}

type Props = {
  name: string;
  email: string;
  jobTitle: string | null;
  organisation: string | null;
  phone: string | null;
  hasAvatar: boolean;
};

export function ProfileForm({ name, email, jobTitle, organisation, phone, hasAvatar }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    hasAvatar ? "/api/profile/avatar" : null,
  );
  const [state, action, pending] = useActionState<ProfileFormState | null, FormData>(
    saveProfile,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  async function onPick(files: FileList | null) {
    if (!files?.[0]) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const blob = await resizeAvatar(files[0]);
      const form = new FormData();
      form.set("file", blob, "avatar.jpg");
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => null))?.error ?? "Upload failed");
      }
      setPreviewUrl(`/api/profile/avatar?t=${Date.now()}`);
      router.refresh();
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setAvatarBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    if (!confirm("Remove your profile picture?")) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove picture");
      setPreviewUrl(null);
      router.refresh();
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Could not remove picture");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="size-24 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">
              {(name.trim() || email).slice(0, 2).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={avatarBusy}
            className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-white text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Upload profile picture"
          >
            {avatarBusy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files)}
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900">Profile picture</p>
          <p className="text-xs text-slate-500">JPG or PNG, resized automatically.</p>
          {previewUrl ? (
            <button
              type="button"
              onClick={removeAvatar}
              disabled={avatarBusy}
              className="inline-flex items-center gap-1 text-xs text-red-700 hover:underline disabled:opacity-60"
            >
              <Trash2 className="size-3" />
              Remove
            </button>
          ) : null}
          {avatarError ? <p className="text-xs text-red-700">{avatarError}</p> : null}
        </div>
      </div>

      <form action={action} className="grid max-w-xl gap-4 sm:grid-cols-2">
        <Field label="Display name" className="sm:col-span-2">
          <Input name="name" defaultValue={name} required maxLength={120} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input value={email} disabled readOnly />
        </Field>
        <Field label="Job title">
          <Input name="jobTitle" defaultValue={jobTitle ?? ""} maxLength={120} />
        </Field>
        <Field label="Organisation">
          <Input name="organisation" defaultValue={organisation ?? ""} maxLength={160} />
        </Field>
        <Field label="Phone" className="sm:col-span-2">
          <Input name="phone" defaultValue={phone ?? ""} maxLength={40} />
        </Field>
        {state && !state.ok ? (
          <p className="sm:col-span-2 text-sm text-red-700">{state.error}</p>
        ) : null}
        {state?.ok ? (
          <p className="sm:col-span-2 text-sm text-emerald-700">Profile saved.</p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
