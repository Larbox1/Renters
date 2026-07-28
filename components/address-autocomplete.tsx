"use client";

import { useEffect, useId, useRef, useState } from "react";

// Base Adresse Nationale (French government) — free, no API key, GDPR-friendly.
// https://adresse.data.gouv.fr/api-doc/adresse
const BAN_ENDPOINT = "https://api-adresse.data.gouv.fr/search/";

// Photon (Komoot) — free OSM-based worldwide geocoder, no API key. Covers the
// addresses BAN can't (notably US). https://photon.komoot.io
const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";

type Suggestion = {
  key: string;
  /** Street-level address, e.g. "8 Boulevard du Port". */
  address: string;
  city: string;
  postcode: string;
  /** Full one-line label used for display in the dropdown. */
  label: string;
};

type BanFeature = {
  properties?: {
    label?: string;
    name?: string;
    city?: string;
    postcode?: string;
    score?: number;
  };
};

type PhotonFeature = {
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    district?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
  };
};

async function fetchBan(
  q: string,
  signal: AbortSignal,
): Promise<{ suggestions: Suggestion[]; topScore: number }> {
  const url = `${BAN_ENDPOINT}?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`BAN ${res.status}`);
  const data = (await res.json()) as { features?: BanFeature[] };
  const features = data.features ?? [];
  const suggestions = features.map((f, i) => {
    const p = f.properties ?? {};
    return {
      key: `ban-${p.label ?? ""}-${i}`,
      address: p.name ?? p.label ?? "",
      city: p.city ?? "",
      postcode: p.postcode ?? "",
      label: p.label ?? p.name ?? "",
    };
  });
  return { suggestions, topScore: features[0]?.properties?.score ?? 0 };
}

async function fetchPhoton(
  q: string,
  signal: AbortSignal,
): Promise<Suggestion[]> {
  const url = `${PHOTON_ENDPOINT}?q=${encodeURIComponent(q)}&limit=5`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).flatMap((f, i) => {
    const p = f.properties ?? {};
    const address =
      p.housenumber && p.street
        ? `${p.housenumber} ${p.street}`
        : (p.street ?? p.name ?? "");
    if (!address) return [];
    const city = p.city ?? p.town ?? p.village ?? p.district ?? "";
    const postcode = p.postcode ?? "";
    // "123 Main St, Springfield, Illinois 62704" for the US;
    // "8 Boulevard du Port, 34140 Mèze" style elsewhere.
    const locality =
      p.countrycode?.toUpperCase() === "US"
        ? [city, [p.state, postcode].filter(Boolean).join(" ")]
            .filter(Boolean)
            .join(", ")
        : [postcode, city].filter(Boolean).join(" ");
    return [
      {
        key: `photon-${address}-${postcode}-${i}`,
        address,
        city,
        postcode,
        label: [address, locality].filter(Boolean).join(", "),
      },
    ];
  });
}

/**
 * Query BAN and Photon in parallel and merge their suggestions. BAN wins the
 * top spots when it is confident (a French query); otherwise Photon leads
 * (e.g. a US query, where BAN can only return irrelevant French matches).
 * One provider failing never blocks the other's results.
 */
async function fetchSuggestions(
  q: string,
  signal: AbortSignal,
): Promise<Suggestion[]> {
  const [banResult, photonResult] = await Promise.allSettled([
    fetchBan(q, signal),
    fetchPhoton(q, signal),
  ]);
  if (signal.aborted) throw new DOMException("aborted", "AbortError");
  const ban =
    banResult.status === "fulfilled"
      ? banResult.value
      : { suggestions: [], topScore: 0 };
  const photon = photonResult.status === "fulfilled" ? photonResult.value : [];

  const ordered =
    ban.topScore >= 0.4
      ? [...ban.suggestions, ...photon]
      : [...photon, ...ban.suggestions];

  const seen = new Set<string>();
  return ordered
    .filter((s) => {
      const dedupeKey = `${s.address}|${s.postcode}`.toLowerCase();
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    })
    .slice(0, 8);
}

/** Configuration for one of the three rendered inputs. */
export type AddressFieldConfig = {
  /** `name` attribute submitted with the form. */
  name: string;
  label: string;
  placeholder?: string;
  /** Adds the HTML `required` attribute and a red asterisk on the label. */
  required?: boolean;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-slate-700";

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className={labelClass}>
      {text} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

/**
 * Address input with an autocomplete dropdown backed by BAN and Photon
 * queried together (French + worldwide coverage). Picking a suggestion fills
 * the address, city, and postal-code fields.
 *
 * Renders a fragment of three field wrappers so it can drop into any parent
 * grid; the address wrapper spans `addressColSpanClass`. Country (or any other
 * sibling) is rendered by the parent.
 */
export function AddressAutocomplete({
  searchingLabel,
  noResultsLabel,
  address,
  city,
  postalCode,
  defaults,
  addressColSpanClass = "sm:col-span-2 lg:col-span-3",
}: {
  searchingLabel: string;
  noResultsLabel: string;
  address: AddressFieldConfig;
  city: AddressFieldConfig;
  postalCode: AddressFieldConfig;
  defaults: { address: string; city: string; postalCode: string };
  addressColSpanClass?: string;
}) {
  const [addressValue, setAddressValue] = useState(defaults.address);
  const [cityValue, setCityValue] = useState(defaults.city);
  const [postalValue, setPostalValue] = useState(defaults.postalCode);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Last value set without typing (initial default or a picked suggestion).
  // The lookup effect skips it so the dropdown only opens on actual typing —
  // not on mount over a pre-filled address, and not after picking.
  const committed = useRef(defaults.address);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Debounced BAN + Photon lookup on the address query.
  useEffect(() => {
    if (addressValue === committed.current) return;
    const q = addressValue.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const next = await fetchSuggestions(q, controller.signal);
        setSuggestions(next);
        setOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [addressValue]);

  // Close the dropdown when clicking outside the field group.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (s: Suggestion) => {
    committed.current = s.address;
    setAddressValue(s.address);
    if (s.city) setCityValue(s.city);
    if (s.postcode) setPostalValue(s.postcode);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <>
      <div className={`relative ${addressColSpanClass}`} ref={containerRef}>
        <FieldLabel text={address.label} required={address.required} />
        <input
          name={address.name}
          type="text"
          required={address.required}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={addressValue}
          onChange={(e) => setAddressValue(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={address.placeholder}
          className={inputClass}
        />
        {open && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
          >
            {loading && suggestions.length === 0 ? (
              <li className="px-3 py-2 text-slate-400">{searchingLabel}</li>
            ) : suggestions.length === 0 ? (
              <li className="px-3 py-2 text-slate-400">{noResultsLabel}</li>
            ) : (
              suggestions.map((s, i) => (
                <li
                  key={s.key}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    // mousedown (not click) so we fire before the input blur.
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`cursor-pointer px-3 py-2 ${
                    i === activeIndex
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-700"
                  }`}
                >
                  {s.label}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <div>
        <FieldLabel text={city.label} required={city.required} />
        <input
          name={city.name}
          type="text"
          required={city.required}
          value={cityValue}
          onChange={(e) => setCityValue(e.target.value)}
          placeholder={city.placeholder}
          className={inputClass}
        />
      </div>
      <div>
        <FieldLabel text={postalCode.label} required={postalCode.required} />
        <input
          name={postalCode.name}
          type="text"
          required={postalCode.required}
          value={postalValue}
          onChange={(e) => setPostalValue(e.target.value)}
          placeholder={postalCode.placeholder}
          className={inputClass}
        />
      </div>
    </>
  );
}
