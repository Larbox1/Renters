"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { DatePicker } from "@/components/ui/date-picker";
import {
  saveConditionReport,
  finalizeConditionReportAction,
  uploadConditionReportPhoto,
  removeConditionReportPhoto,
} from "./actions";
import { compressImage } from "./photo-compress";
import {
  CONDITIONS,
  MAX_PHOTOS_PER_ELEMENT,
  type Condition,
  type ReportData,
  type ReportElement,
  type ReportType,
} from "./report-shared";

type EditorDict = Dictionary["leases"]["conditionReports"]["editor"];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const smallButtonClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50";
const removeButtonClass =
  "rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50";

/**
 * Draft editor for a condition report: meters, keys and the room-by-room
 * walkthrough. Saving posts the whole payload; completing carries the same
 * payload in the finalize form so nothing edited is lost between the two.
 */
function patchElement(
  d: ReportData,
  roomIndex: number,
  elementIndex: number,
  patch: (element: ReportElement) => ReportElement,
): ReportData {
  return {
    ...d,
    rooms: d.rooms.map((room, ri) =>
      ri === roomIndex
        ? {
            ...room,
            elements: room.elements.map((element, ei) =>
              ei === elementIndex ? patch(element) : element,
            ),
          }
        : room,
    ),
  };
}

export function ReportEditor({
  locale,
  reportId,
  type,
  initial,
  photoUrls,
  dict,
}: {
  locale: Locale;
  reportId: string;
  type: ReportType;
  initial: ReportData;
  // Signed display URL per stored photo path (1h TTL, signed at page render).
  photoUrls: Record<string, string | null>;
  dict: EditorDict;
}) {
  const [data, setData] = useState<ReportData>(initial);
  const [urls, setUrls] = useState<Record<string, string | null>>(photoUrls);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [photoError, setPhotoError] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const isMoveOut = type === "move_out";

  // Latest data across awaited photo uploads — a plain closure would go stale
  // while an upload is in flight and clobber concurrent text edits.
  const dataRef = useRef(data);
  dataRef.current = data;

  const update = (patch: Partial<ReportData>) => {
    setSaveState("idle");
    setData((d) => ({ ...d, ...patch }));
  };

  const updateElement = (
    roomIndex: number,
    elementIndex: number,
    patch: Partial<ReportElement>,
  ) => {
    setSaveState("idle");
    setData((d) =>
      patchElement(d, roomIndex, elementIndex, (element) => ({
        ...element,
        ...patch,
      })),
    );
  };

  const save = () => {
    startSaving(async () => {
      const result = await saveConditionReport({ reportId, data });
      setSaveState(result.ok ? "saved" : "error");
    });
  };

  // Photo mutations persist immediately (silent draft save) — on a phone
  // walkthrough there is no guarantee the user hits Save before leaving.
  const commitPhotoChange = async (next: ReportData) => {
    dataRef.current = next;
    setData(next);
    await saveConditionReport({ reportId, data: next });
  };

  const addPhotos = async (
    roomIndex: number,
    elementIndex: number,
    files: File[],
  ) => {
    if (files.length === 0) return;
    setPhotoError(false);
    setUploadingKey(`${roomIndex}:${elementIndex}`);
    try {
      for (const file of files) {
        const element =
          dataRef.current.rooms[roomIndex]?.elements[elementIndex];
        if (!element) break;
        if ((element.photos?.length ?? 0) >= MAX_PHOTOS_PER_ELEMENT) break;

        const blob = await compressImage(file);
        const formData = new FormData();
        formData.set("report_id", reportId);
        formData.set(
          "file",
          new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }),
        );
        const result = await uploadConditionReportPhoto(formData);
        if (!result.ok) {
          setPhotoError(true);
          continue;
        }
        setUrls((u) => ({ ...u, [result.path]: result.url }));
        await commitPhotoChange(
          patchElement(dataRef.current, roomIndex, elementIndex, (el) => ({
            ...el,
            photos: [
              ...(el.photos ?? []),
              { path: result.path, size: result.size },
            ],
          })),
        );
      }
    } finally {
      setUploadingKey(null);
    }
  };

  const removePhoto = async (
    roomIndex: number,
    elementIndex: number,
    path: string,
  ) => {
    await removeConditionReportPhoto({ reportId, path });
    await commitPhotoChange(
      patchElement(dataRef.current, roomIndex, elementIndex, (el) => ({
        ...el,
        photos: (el.photos ?? []).filter((photo) => photo.path !== path),
      })),
    );
  };

  const conditionSelect = (
    value: Condition | null,
    onChange: (c: Condition | null) => void,
  ) => (
    <select
      value={value ?? ""}
      onChange={(e) => onChange((e.target.value || null) as Condition | null)}
      className={inputClass}
    >
      <option value="">{dict.conditionNone}</option>
      {CONDITIONS.map((c) => (
        <option key={c} value={c}>
          {dict.conditions[c]}
        </option>
      ))}
    </select>
  );

  const saveBar = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50 disabled:opacity-60"
      >
        {dict.save}
      </button>
      <form action={finalizeConditionReportAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="report_id" value={reportId} />
        <input type="hidden" name="payload" value={JSON.stringify(data)} />
        <ConfirmSubmit
          message={dict.confirmFinalize}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {dict.finalize}
        </ConfirmSubmit>
      </form>
      {saveState === "saved" && (
        <span className="text-sm font-medium text-emerald-700">
          {dict.saved}
        </span>
      )}
      {saveState === "error" && (
        <span className="text-sm font-medium text-red-600">
          {dict.saveError}
        </span>
      )}
      {photoError && (
        <span className="text-sm font-medium text-red-600">
          {dict.photoUploadError}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {saveBar}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.reportDate}
        </label>
        <DatePicker
          value={data.report_date}
          onChange={(v) => update({ report_date: v })}
          className="max-w-xs"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.metersTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["electricity", dict.electricity],
              ["gas", dict.gas],
              ["cold_water", dict.coldWater],
              ["hot_water", dict.hotWater],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500">
                {label}
              </label>
              <input
                type="text"
                value={data.meters[key]}
                onChange={(e) =>
                  update({ meters: { ...data.meters, [key]: e.target.value } })
                }
                className={`${inputClass} mt-1`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {dict.keysTitle}
          </h2>
          <button
            type="button"
            onClick={() =>
              update({
                keys: [...data.keys, { type: "", count: 1, comment: "" }],
              })
            }
            className={smallButtonClass}
          >
            {dict.addKey}
          </button>
        </div>
        <div className="space-y-2">
          {data.keys.map((key, keyIndex) => (
            <div
              key={keyIndex}
              className="grid grid-cols-[1fr_5rem_auto] gap-2 sm:grid-cols-[1fr_5rem_1fr_auto]"
            >
              <input
                type="text"
                value={key.type}
                placeholder={dict.keyType}
                aria-label={dict.keyType}
                onChange={(e) =>
                  update({
                    keys: data.keys.map((k, i) =>
                      i === keyIndex ? { ...k, type: e.target.value } : k,
                    ),
                  })
                }
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                max={99}
                value={key.count}
                aria-label={dict.keyCount}
                onChange={(e) =>
                  update({
                    keys: data.keys.map((k, i) =>
                      i === keyIndex
                        ? { ...k, count: parseInt(e.target.value, 10) || 0 }
                        : k,
                    ),
                  })
                }
                className={inputClass}
              />
              <input
                type="text"
                value={key.comment}
                placeholder={dict.keyComment}
                aria-label={dict.keyComment}
                onChange={(e) =>
                  update({
                    keys: data.keys.map((k, i) =>
                      i === keyIndex ? { ...k, comment: e.target.value } : k,
                    ),
                  })
                }
                className={`${inputClass} col-span-2 sm:col-span-1`}
              />
              <button
                type="button"
                onClick={() =>
                  update({ keys: data.keys.filter((_, i) => i !== keyIndex) })
                }
                className={removeButtonClass}
              >
                {dict.remove}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {dict.roomsTitle}
          </h2>
          <button
            type="button"
            onClick={() =>
              update({
                rooms: [...data.rooms, { name: "", elements: [] }],
              })
            }
            className={smallButtonClass}
          >
            {dict.addRoom}
          </button>
        </div>
        <div className="space-y-4">
          {data.rooms.map((room, roomIndex) => (
            <div
              key={roomIndex}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="text"
                  value={room.name}
                  placeholder={dict.roomName}
                  aria-label={dict.roomName}
                  onChange={(e) =>
                    update({
                      rooms: data.rooms.map((r, i) =>
                        i === roomIndex ? { ...r, name: e.target.value } : r,
                      ),
                    })
                  }
                  className={`${inputClass} max-w-sm font-semibold`}
                />
                <button
                  type="button"
                  onClick={() =>
                    update({
                      rooms: data.rooms.filter((_, i) => i !== roomIndex),
                    })
                  }
                  className={removeButtonClass}
                >
                  {dict.removeRoom}
                </button>
              </div>

              <div className="space-y-3">
                {room.elements.map((element, elementIndex) => (
                  <div
                    key={elementIndex}
                    className="rounded-lg border border-slate-100 bg-slate-50/60 p-3"
                  >
                    <div
                      className={`grid gap-2 ${
                        isMoveOut
                          ? "sm:grid-cols-[1fr_1fr_1fr_1.5fr_auto]"
                          : "sm:grid-cols-[1fr_1fr_1.5fr_auto]"
                      }`}
                    >
                      <input
                        type="text"
                        value={element.name}
                        placeholder={dict.element}
                        aria-label={dict.element}
                        onChange={(e) =>
                          updateElement(roomIndex, elementIndex, {
                            name: e.target.value,
                          })
                        }
                        className={inputClass}
                      />
                      {isMoveOut && (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {dict.entryCondition}
                          </span>
                          {element.entry_condition
                            ? dict.conditions[element.entry_condition]
                            : dict.conditionNone}
                          {element.entry_comment
                            ? ` — ${element.entry_comment}`
                            : ""}
                        </div>
                      )}
                      {conditionSelect(element.condition, (condition) =>
                        updateElement(roomIndex, elementIndex, { condition }),
                      )}
                      <input
                        type="text"
                        value={element.comment}
                        placeholder={dict.comment}
                        aria-label={dict.comment}
                        onChange={(e) =>
                          updateElement(roomIndex, elementIndex, {
                            comment: e.target.value,
                          })
                        }
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            rooms: data.rooms.map((r, i) =>
                              i === roomIndex
                                ? {
                                    ...r,
                                    elements: r.elements.filter(
                                      (_, ei) => ei !== elementIndex,
                                    ),
                                  }
                                : r,
                            ),
                          })
                        }
                        className={removeButtonClass}
                      >
                        {dict.remove}
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(element.photos ?? []).map((photo) => {
                        const url = urls[photo.path] ?? null;
                        return (
                          <div key={photo.path} className="relative">
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt=""
                                  className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                                />
                              </a>
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                                <Camera aria-hidden className="h-4 w-4" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                removePhoto(roomIndex, elementIndex, photo.path)
                              }
                              aria-label={dict.removePhoto}
                              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-500 shadow-sm hover:bg-red-50 hover:text-red-600"
                            >
                              <X aria-hidden className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                      {(element.photos?.length ?? 0) <
                        MAX_PHOTOS_PER_ELEMENT && (
                        <label
                          className={`${smallButtonClass} inline-flex cursor-pointer items-center gap-1.5 ${
                            uploadingKey === `${roomIndex}:${elementIndex}`
                              ? "animate-pulse opacity-60"
                              : ""
                          }`}
                        >
                          <Camera aria-hidden className="h-4 w-4" />
                          {dict.addPhoto}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingKey !== null}
                            onChange={(e) => {
                              const files = e.target.files
                                ? Array.from(e.target.files)
                                : [];
                              e.target.value = "";
                              void addPhotos(roomIndex, elementIndex, files);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  update({
                    rooms: data.rooms.map((r, i) =>
                      i === roomIndex
                        ? {
                            ...r,
                            elements: [
                              ...r.elements,
                              isMoveOut
                                ? {
                                    name: "",
                                    condition: null,
                                    comment: "",
                                    entry_condition: null,
                                    entry_comment: "",
                                  }
                                : { name: "", condition: null, comment: "" },
                            ],
                          }
                        : r,
                    ),
                  })
                }
                className={`${smallButtonClass} mt-3`}
              >
                {dict.addElement}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.notesTitle}
        </h2>
        <textarea
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder={dict.notesPlaceholder}
          rows={4}
          className={inputClass}
        />
      </section>

      {saveBar}
    </div>
  );
}
