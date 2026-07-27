// Shared data-derivation and verbatim clause text for the US lease agreement
// (us_fixed_term / us_month_to_month / us_sublease / us_commercial). Imported
// by both renderers (HTML live view and the @react-pdf snapshot) so they stay
// in sync. Pure data + plain strings only — no JSX, no React, no async.
//
// This is a GENERIC template: US landlord-tenant law varies by state (deposit
// caps, mandatory disclosures, late-fee limits). The rendered document carries
// a "review with local counsel" notice — see US_LEGAL_NOTICE.

import { type ContractData, BLANK } from "./contract-shared";

export const usBlank = (v: string | number | null | undefined): string =>
  v == null || v === "" ? BLANK : String(v);

export const fmtUsd = (cents: number | null | undefined) =>
  cents != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(cents / 100)
    : "_______________";

export const fmtDateUs = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
        new Date(iso),
      )
    : "____________";

const TITLE_BY_TYPE: Record<string, string> = {
  us_fixed_term: "Residential Lease Agreement",
  us_month_to_month: "Month-to-Month Rental Agreement",
  us_sublease: "Sublease Agreement",
  us_commercial: "Commercial Lease Agreement",
};

const PROPERTY_NATURE: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  studio: "Studio",
  commercial: "Commercial unit",
  land: "Land",
  other: "Other",
};

export function deriveUs(data: ContractData) {
  const { lease, property, tenant, ownerProfile } = data;
  const p = property as Record<string, unknown> | null;
  const t = tenant as Record<string, unknown> | null;
  const l = lease as Record<string, unknown>;

  const type = (l.type as string | null) ?? "us_fixed_term";
  const isMonthToMonth = type === "us_month_to_month";
  const isSublease = type === "us_sublease";
  const isCommercial = type === "us_commercial";

  // US-style one-liner: street, city, ST ZIP.
  const propertyAddress = [
    p?.address as string | null,
    p?.building ? `Bldg. ${p.building}` : null,
    p?.floor != null ? `Floor ${p.floor}` : null,
    [
      p?.city as string | null,
      [l.us_state as string | null, p?.postal_code as string | null]
        .filter(Boolean)
        .join(" "),
    ]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  const ownerName =
    ownerProfile?.first_name && ownerProfile?.last_name
      ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
      : (ownerProfile?.full_name ?? null);
  const ownerAddress =
    [
      ownerProfile?.address,
      [ownerProfile?.city, ownerProfile?.postal_code].filter(Boolean).join(" "),
      ownerProfile?.country,
    ]
      .filter((part) => part && (part as string).trim())
      .join(", ") || null;

  const tenantName = (t?.full_name as string | null) ?? null;

  const nature = p?.type
    ? (PROPERTY_NATURE[p.type as string] ?? null)
    : null;

  const constructionYear = (p?.construction_year as number | null) ?? null;
  // Federal lead-based paint disclosure applies to housing built before 1978.
  const requiresLeadDisclosure =
    !isCommercial && constructionYear != null && constructionYear < 1978;

  return {
    p,
    t,
    l,
    ownerProfile,
    type,
    title: TITLE_BY_TYPE[type] ?? TITLE_BY_TYPE.us_fixed_term,
    isMonthToMonth,
    isSublease,
    isCommercial,
    landlordLabel: isSublease ? "Sublandlord" : "Landlord",
    tenantLabel: isSublease ? "Subtenant" : "Tenant",
    propertyAddress,
    ownerName,
    ownerAddress,
    tenantName,
    nature,
    usState: (l.us_state as string | null) ?? null,
    startDate: (l.start_date as string | null) ?? null,
    endDate: (l.end_date as string | null) ?? null,
    monthlyRentCents: (l.monthly_rent_cents as number | null) ?? null,
    depositCents: (l.deposit_cents as number | null) ?? null,
    lateFeeCents: (l.late_fee_cents as number | null) ?? null,
    lateFeeGraceDays: (l.late_fee_grace_days as number | null) ?? null,
    noticePeriodDays: (l.notice_period_days as number | null) ?? null,
    paymentDay: (l.payment_day_of_month as number | null) ?? null,
    petsAllowed: (l.pets_allowed as boolean | null) ?? null,
    petDepositCents: (l.pet_deposit_cents as number | null) ?? null,
    utilitiesIncluded: (l.utilities_included as string | null) ?? null,
    requiresLeadDisclosure,
  };
}

// ── Verbatim clause text ────────────────────────────────────────────────────

export const US_LEGAL_NOTICE =
  "This is a general-purpose template. Landlord-tenant law varies by state and locality (security deposit limits, late-fee caps, required disclosures, notice periods). Review this agreement with a licensed attorney or your local housing authority before signing.";

export const US_ART_OCCUPANCY_TEXT =
  "The Premises shall be occupied and used only as a private residence by the Tenant and the occupants listed in this Agreement, and for no other purpose. Tenant shall not assign this Agreement or sublet any portion of the Premises without the prior written consent of the Landlord.";

export const US_ART_OCCUPANCY_COMMERCIAL_TEXT =
  "The Premises shall be occupied and used only for the commercial activity agreed between the parties, and for no other purpose. Tenant shall not assign this Agreement or sublet any portion of the Premises without the prior written consent of the Landlord.";

export const US_ART_MAINTENANCE_ITEMS = [
  "Tenant shall keep the Premises in a clean and sanitary condition and shall promptly notify Landlord of any damage or condition requiring repair.",
  "Tenant shall be responsible for any damage to the Premises caused by Tenant, members of Tenant's household, or Tenant's guests, beyond normal wear and tear.",
  "Landlord shall maintain the Premises in a habitable condition and make all repairs required by applicable law, other than repairs made necessary by Tenant's misuse or neglect.",
  "Tenant shall not make alterations or improvements to the Premises without the prior written consent of the Landlord.",
];

export const US_ART_ENTRY_TEXT =
  "Landlord may enter the Premises to inspect, make repairs, or show the Premises to prospective tenants or buyers, after giving Tenant reasonable advance notice (at least 24 hours unless applicable law requires more), except in case of emergency.";

export const US_ART_INSURANCE_TEXT =
  "Landlord's insurance does not cover Tenant's personal property. Tenant is encouraged (or required, where indicated by Landlord) to carry renter's insurance covering personal property and liability.";

export const US_ART_DEFAULT_TEXT =
  "If Tenant fails to pay rent when due, or breaches any other provision of this Agreement, Landlord may terminate this Agreement and pursue any remedy available under applicable law, after giving any notice and cure period required by the law of the state where the Premises are located.";

export const US_ART_LEAD_PAINT_TEXT =
  "Lead-based paint disclosure (federal law, 42 U.S.C. 4852d): the Premises were built before 1978. Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, and dust can pose health hazards if not managed properly. Before signing this Agreement, Landlord must disclose any known information on lead-based paint hazards and provide the tenant with the federally approved pamphlet \"Protect Your Family From Lead In Your Home\".";

export const US_ART_SEVERABILITY_TEXT =
  "If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. This Agreement constitutes the entire agreement between the parties and may be modified only in writing signed by both parties.";

export const US_SIGN_NOTE =
  "Executed in as many original counterparts as there are parties, each party acknowledging receipt of one.";
