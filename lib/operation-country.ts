// Operation country — which country's legal framework the user operates
// rentals under (profiles.operation_country). Not the postal address country.

export type OperationCountry = "FR" | "US";

export const OPERATION_COUNTRIES: readonly OperationCountry[] = ["FR", "US"];

export function isOperationCountry(value: unknown): value is OperationCountry {
  return (
    typeof value === "string" &&
    (OPERATION_COUNTRIES as readonly string[]).includes(value)
  );
}

export const FR_LEASE_TYPES = [
  "bail_vide",
  "bail_meuble",
  "bail_mobilite",
  "bail_etudiant",
  "bail_civil",
  "bail_commercial",
] as const;

export const US_LEASE_TYPES = [
  "us_fixed_term",
  "us_month_to_month",
  "us_sublease",
  "us_commercial",
] as const;

export type FrLeaseType = (typeof FR_LEASE_TYPES)[number];
export type UsLeaseType = (typeof US_LEASE_TYPES)[number];
export type LeaseTypeValue = FrLeaseType | UsLeaseType;

export function leaseTypesFor(
  country: OperationCountry,
): readonly LeaseTypeValue[] {
  return country === "US" ? US_LEASE_TYPES : FR_LEASE_TYPES;
}

// Lease types with a printable contract template (bail_mobilite and
// bail_etudiant don't have one yet). Single source for the contract page,
// the PDF action and the "Generate contract" button.
export const CONTRACT_TEMPLATE_TYPES = [
  "bail_vide",
  "bail_meuble",
  "bail_civil",
  "bail_commercial",
  ...US_LEASE_TYPES,
] as const;

export function hasContractTemplate(type: string | null | undefined): boolean {
  return (
    typeof type === "string" &&
    (CONTRACT_TEMPLATE_TYPES as readonly string[]).includes(type)
  );
}

/** Which contract template family a lease type renders with. */
export type ContractVariant = "us" | "civil" | "commercial" | "alur";

export function contractVariant(
  type: string | null | undefined,
): ContractVariant {
  if (typeof type === "string" && type.startsWith("us_")) return "us";
  if (type === "bail_civil") return "civil";
  if (type === "bail_commercial") return "commercial";
  return "alur";
}
