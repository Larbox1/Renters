// Shared types + pure helpers for condition reports (états des lieux).
// Imported by the server actions, the editor page/components and the lease
// detail page — no server or client dependencies here.

import type { Dictionary } from "@/i18n/dictionaries/en";

export const REPORT_TYPES = ["move_in", "move_out"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// Standard EDL condition scale: neuf / bon état / état d'usage / mauvais état.
export const CONDITIONS = ["new", "good", "used", "poor"] as const;
export type Condition = (typeof CONDITIONS)[number];

export type ElementPhoto = {
  path: string;
  size: number;
};

export type ReportElement = {
  name: string;
  condition: Condition | null;
  comment: string;
  // Photos taken during the walkthrough, stored under the report's dedicated
  // storage prefix (<ownerId>/edl/<reportId>/).
  photos?: ElementPhoto[];
  // Move-out reports carry the state recorded at move-in for the side-by-side
  // comparison; absent on move-in reports.
  entry_condition?: Condition | null;
  entry_comment?: string;
};

export type ReportRoom = {
  name: string;
  elements: ReportElement[];
};

export type ReportMeters = {
  electricity: string;
  gas: string;
  cold_water: string;
  hot_water: string;
};

export type ReportKey = {
  type: string;
  count: number;
  comment: string;
};

// The editable payload of a report — what the editor round-trips and what the
// draft-save/finalize actions persist.
export type ReportData = {
  report_date: string;
  meters: ReportMeters;
  keys: ReportKey[];
  rooms: ReportRoom[];
  notes: string;
};

export type ConditionReportRow = {
  id: string;
  lease_id: string;
  owner_id: string;
  document_id: string | null;
  type: ReportType;
  status: "draft" | "completed";
  report_date: string;
  meters: unknown;
  keys: unknown;
  rooms: unknown;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
};

type DefaultsDict = Dictionary["leases"]["conditionReports"]["defaults"];

// Payload size guards — generous for real reports, tight enough that a bad
// client can't store megabytes of JSON.
const MAX_ROOMS = 40;
const MAX_ELEMENTS = 30;
const MAX_KEYS = 20;
const MAX_NAME = 120;
const MAX_COMMENT = 500;
const MAX_METER = 40;
const MAX_NOTES = 5000;
const MAX_PATH = 300;

// Photo caps: per element and across the whole report (the report cap also
// bounds the finalized PDF's size, since photos are embedded in the annex).
export const MAX_PHOTOS_PER_ELEMENT = 3;
export const MAX_PHOTOS_PER_REPORT = 40;

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const condition = (v: unknown): Condition | null =>
  (CONDITIONS as readonly string[]).includes(v as string)
    ? (v as Condition)
    : null;

export function coerceMeters(raw: unknown): ReportMeters {
  const m = (raw ?? {}) as Record<string, unknown>;
  return {
    electricity: str(m.electricity, MAX_METER),
    gas: str(m.gas, MAX_METER),
    cold_water: str(m.cold_water, MAX_METER),
    hot_water: str(m.hot_water, MAX_METER),
  };
}

export function coerceKeys(raw: unknown): ReportKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_KEYS).map((k) => {
    const key = (k ?? {}) as Record<string, unknown>;
    const count =
      typeof key.count === "number" && isFinite(key.count)
        ? Math.max(0, Math.min(99, Math.round(key.count)))
        : 0;
    return {
      type: str(key.type, MAX_NAME),
      count,
      comment: str(key.comment, MAX_COMMENT),
    };
  });
}

/**
 * `photoPrefix` is the report's storage folder ("<ownerId>/edl/<reportId>/").
 * Photos survive coercion only when they live under it — the payload
 * round-trips through the client, so a forged path could otherwise get an
 * arbitrary storage object signed or embedded into the PDF. Callers with no
 * business keeping photos simply omit it.
 */
export function coerceRooms(
  raw: unknown,
  type: ReportType,
  photoPrefix?: string,
): ReportRoom[] {
  if (!Array.isArray(raw)) return [];
  let totalPhotos = 0;
  return raw.slice(0, MAX_ROOMS).map((r) => {
    const room = (r ?? {}) as Record<string, unknown>;
    const elements = Array.isArray(room.elements) ? room.elements : [];
    return {
      name: str(room.name, MAX_NAME),
      elements: elements.slice(0, MAX_ELEMENTS).map((e) => {
        const el = (e ?? {}) as Record<string, unknown>;
        const base: ReportElement = {
          name: str(el.name, MAX_NAME),
          condition: condition(el.condition),
          comment: str(el.comment, MAX_COMMENT),
        };
        if (photoPrefix && Array.isArray(el.photos)) {
          const budget = Math.min(
            MAX_PHOTOS_PER_ELEMENT,
            MAX_PHOTOS_PER_REPORT - totalPhotos,
          );
          const photos: ElementPhoto[] = [];
          for (const p of el.photos) {
            if (photos.length >= budget) break;
            const photo = (p ?? {}) as Record<string, unknown>;
            const photoPath = str(photo.path, MAX_PATH);
            if (!photoPath.startsWith(photoPrefix)) continue;
            photos.push({
              path: photoPath,
              size:
                typeof photo.size === "number" && isFinite(photo.size)
                  ? Math.max(0, Math.round(photo.size))
                  : 0,
            });
          }
          if (photos.length > 0) {
            base.photos = photos;
            totalPhotos += photos.length;
          }
        }
        if (type === "move_out") {
          base.entry_condition = condition(el.entry_condition);
          base.entry_comment = str(el.entry_comment, MAX_COMMENT);
        }
        return base;
      }),
    };
  });
}

// Coerces an untrusted editable payload (client JSON or DB jsonb) into a
// well-formed ReportData. `fallbackDate` fills in when the date is malformed.
export function coerceReportData(
  raw: unknown,
  type: ReportType,
  fallbackDate: string,
  photoPrefix?: string,
): ReportData {
  const data = (raw ?? {}) as Record<string, unknown>;
  const date = str(data.report_date, 10);
  return {
    report_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : fallbackDate,
    meters: coerceMeters(data.meters),
    keys: coerceKeys(data.keys),
    rooms: coerceRooms(data.rooms, type, photoPrefix),
    notes: str(data.notes, MAX_NOTES),
  };
}

/** Every photo path referenced anywhere in the report's rooms. */
export function collectPhotoPaths(rooms: ReportRoom[]): string[] {
  return rooms.flatMap((room) =>
    room.elements.flatMap((element) =>
      (element.photos ?? []).map((photo) => photo.path),
    ),
  );
}

export function emptyMeters(): ReportMeters {
  return { electricity: "", gas: "", cold_water: "", hot_water: "" };
}

const el = (name: string): ReportElement => ({
  name,
  condition: null,
  comment: "",
});

/**
 * Seeds the room list for a fresh move-in report from the property's
 * structure (room counts) with the standard elements checked during an EDL.
 * Names are plain strings in the creator's locale — free text from then on.
 * Furnished leases (bail meublé) get an extra "Furniture" section — displayed
 * like a room — pre-filled with the mandatory furniture inventory of
 * décret n° 2015-981.
 */
export function buildDefaultRooms(
  property: { bedrooms?: number | null; bathrooms?: number | null } | null,
  labels: DefaultsDict,
  furnished = false,
): ReportRoom[] {
  const bedroomCount = Math.max(
    1,
    Math.min(10, property?.bedrooms ?? 1),
  );
  const bathroomCount = Math.max(
    1,
    Math.min(5, property?.bathrooms ?? 1),
  );

  const base = () => [
    el(labels.elements.floors),
    el(labels.elements.walls),
    el(labels.elements.ceiling),
    el(labels.elements.doors),
    el(labels.elements.windows),
    el(labels.elements.electrical),
    el(labels.elements.heating),
  ];

  const rooms: ReportRoom[] = [
    { name: labels.rooms.entrance, elements: [...base(), el(labels.elements.storage)] },
    { name: labels.rooms.livingRoom, elements: [...base(), el(labels.elements.storage)] },
    {
      name: labels.rooms.kitchen,
      elements: [
        ...base(),
        el(labels.elements.plumbing),
        el(labels.elements.appliances),
        el(labels.elements.storage),
      ],
    },
  ];

  for (let i = 1; i <= bedroomCount; i++) {
    rooms.push({
      name:
        bedroomCount > 1 ? `${labels.rooms.bedroom} ${i}` : labels.rooms.bedroom,
      elements: [...base(), el(labels.elements.storage)],
    });
  }
  for (let i = 1; i <= bathroomCount; i++) {
    rooms.push({
      name:
        bathroomCount > 1
          ? `${labels.rooms.bathroom} ${i}`
          : labels.rooms.bathroom,
      elements: [...base(), el(labels.elements.plumbing)],
    });
  }
  rooms.push({
    name: labels.rooms.wc,
    elements: [
      el(labels.elements.floors),
      el(labels.elements.walls),
      el(labels.elements.ceiling),
      el(labels.elements.doors),
      el(labels.elements.electrical),
      el(labels.elements.plumbing),
    ],
  });

  if (furnished) {
    const f = labels.furnitureElements;
    rooms.push({
      name: labels.rooms.furniture,
      elements: [
        el(f.bedding),
        el(f.shutters),
        el(f.hobs),
        el(f.oven),
        el(f.fridge),
        el(f.dishes),
        el(f.utensils),
        el(f.tableSeats),
        el(f.shelves),
        el(f.lights),
        el(f.cleaning),
      ],
    });
  }

  return rooms;
}

export function defaultKeys(labels: DefaultsDict): ReportKey[] {
  return [{ type: labels.keys.entrance, count: 1, comment: "" }];
}

/**
 * Derives a move-out room list from a move-in report: same rooms/elements,
 * with the recorded state carried over as entry_condition/entry_comment and
 * the current condition left blank for the exit walkthrough.
 */
export function buildMoveOutRooms(entryRooms: ReportRoom[]): ReportRoom[] {
  return entryRooms.map((room) => ({
    name: room.name,
    elements: room.elements.map((element) => ({
      name: element.name,
      condition: null,
      comment: "",
      entry_condition: element.condition,
      entry_comment: element.comment,
    })),
  }));
}
