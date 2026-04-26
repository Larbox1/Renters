"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { SignedPhoto } from "@/lib/properties/photos";

const MAX_PHOTOS = 6;
const MAX_SIZE_MB = 15;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export type PhotoManagerHandle = {
  /** Read by the parent form before submit to inject state into FormData. */
  getKeptPaths(): string[];
  getNewFiles(): File[];
};

export function PhotoManager({
  dict,
  existing = [],
  registerHandle,
}: {
  dict: Dictionary["properties"]["photos"];
  existing?: SignedPhoto[];
  registerHandle: (handle: PhotoManagerHandle) => void;
}) {
  const [removedPaths, setRemovedPaths] = useState<Set<string>>(new Set());
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Lazy preview URLs for newly picked files. Revoke on unmount / change.
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newFiles]);

  const visibleExisting = existing.filter((p) => !removedPaths.has(p.path));
  const totalCount = visibleExisting.length + newFiles.length;
  const totalBytes =
    visibleExisting.reduce((s, p) => s + p.size, 0) +
    newFiles.reduce((s, f) => s + f.size, 0);

  // Expose state to the parent form via the registerHandle callback.
  useEffect(() => {
    registerHandle({
      getKeptPaths: () => visibleExisting.map((p) => p.path),
      getNewFiles: () => newFiles,
    });
  });

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.size > 0);
    if (picked.length === 0) return;

    const projected = [...newFiles, ...picked];
    const projectedCount = visibleExisting.length + projected.length;
    const projectedBytes =
      visibleExisting.reduce((s, p) => s + p.size, 0) +
      projected.reduce((s, f) => s + f.size, 0);

    if (projectedCount > MAX_PHOTOS) {
      setError(dict.tooMany);
    } else if (projectedBytes > MAX_SIZE_BYTES) {
      setError(dict.tooLarge);
    } else {
      setError(null);
      setNewFiles(projected);
    }
    // Reset input so the same file can be re-picked after removing it.
    e.target.value = "";
  }

  function removeExisting(path: string) {
    setRemovedPaths((prev) => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });
    setError(null);
  }

  function removeNew(idx: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setError(null);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="block text-sm font-medium text-slate-700">
          {dict.label}
        </label>
        <p className="text-xs text-slate-500">
          {dict.countLabel.replace("{n}", String(totalCount))} ·{" "}
          {dict.sizeLabel.replace(
            "{used}",
            (totalBytes / 1024 / 1024).toFixed(1),
          )}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{dict.hint}</p>

      {(visibleExisting.length > 0 || newFiles.length > 0) && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {visibleExisting.map((p) => (
            <div
              key={p.path}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              {p.signedUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.signedUrl}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  📷
                </div>
              )}
              <button
                type="button"
                onClick={() => removeExisting(p.path)}
                aria-label={dict.removeButton}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
          {newFiles.map((f, i) => (
            <div
              key={`new-${i}-${f.name}`}
              className="group relative aspect-square overflow-hidden rounded-lg border-2 border-brand-400 bg-slate-100"
            >
              {previews[i] && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previews[i]}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => removeNew(i)}
                aria-label={dict.removeButton}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={pickFiles}
        className="hidden"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={totalCount >= MAX_PHOTOS}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          📷 {dict.addButton}
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
