"use client";

import { useEffect, useId, useRef, useState } from "react";

// Base Adresse Nationale (French government) — free, no API key, GDPR-friendly.
// https://adresse.data.gouv.fr/api-doc/adresse
const BAN_ENDPOINT = "https://api-adresse.data.gouv.fr/search/";

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
  };
};

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
 * Address input with a Base Adresse Nationale (BAN) autocomplete dropdown.
 * Picking a suggestion fills the address, city, and postal-code fields.
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

  // When true, the next value change came from picking a suggestion, so we
  // skip the fetch that would otherwise reopen the dropdown.
  const skipNextFetch = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Debounced BAN lookup on the address query.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
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
        const url = `${BAN_ENDPOINT}?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`BAN ${res.status}`);
        const data = (await res.json()) as { features?: BanFeature[] };
        const next: Suggestion[] = (data.features ?? []).map((f, i) => {
          const p = f.properties ?? {};
          return {
            key: `${p.label ?? ""}-${i}`,
            address: p.name ?? p.label ?? "",
            city: p.city ?? "",
            postcode: p.postcode ?? "",
            label: p.label ?? p.name ?? "",
          };
        });
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
    skipNextFetch.current = true;
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
