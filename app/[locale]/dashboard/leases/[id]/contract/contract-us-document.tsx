// Pure presentational component: renders the US lease agreement (fixed-term,
// month-to-month, sublease, or commercial variant — the derived title and a
// few clauses adapt to the lease type). Used by the live contract page; the
// PDF snapshot lives in contract-us-pdf.tsx and mirrors this structure.
// No data fetching, no async — safe for renderToStaticMarkup.

import { type ContractData } from "./contract-shared";
import {
  deriveUs,
  usBlank,
  fmtUsd,
  fmtDateUs,
  US_LEGAL_NOTICE,
  US_ART_OCCUPANCY_TEXT,
  US_ART_OCCUPANCY_COMMERCIAL_TEXT,
  US_ART_MAINTENANCE_ITEMS,
  US_ART_ENTRY_TEXT,
  US_ART_INSURANCE_TEXT,
  US_ART_DEFAULT_TEXT,
  US_ART_LEAD_PAINT_TEXT,
  US_ART_SEVERABILITY_TEXT,
  US_SIGN_NOTE,
} from "./contract-us-shared";

export function ContractUsDocument({ data }: { data: ContractData }) {
  const d = deriveUs(data);
  const { p, t, ownerProfile } = d;

  return (
    <article className="contract-page mx-auto rounded-md border border-slate-200 bg-white p-10 text-[12px] leading-snug text-slate-900 shadow-sm">
      <header className="text-center">
        <h1 className="text-lg font-bold uppercase">{d.title}</h1>
      </header>

      <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-[10px] italic text-amber-900">
        {US_LEGAL_NOTICE}
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase">Parties</h2>
        <p className="mt-3 font-semibold">{d.landlordLabel}:</p>
        <dl className="mt-1 space-y-1">
          <div>
            <strong>Name:</strong> {usBlank(d.ownerName)}
          </div>
          <div>
            <strong>Address:</strong> {usBlank(d.ownerAddress)}
          </div>
          <div>
            <strong>Phone:</strong> {usBlank(ownerProfile?.phone ?? null)}
          </div>
        </dl>
        <p className="mt-1 italic">
          Hereinafter referred to as the &ldquo;{d.landlordLabel}&rdquo;
        </p>

        <p className="mt-4 font-semibold">{d.tenantLabel}:</p>
        <dl className="mt-1 space-y-1">
          <div>
            <strong>Name:</strong> {usBlank(d.tenantName)}
          </div>
          <div>
            <strong>Phone:</strong>{" "}
            {usBlank((t?.phone as string | null) ?? null)} —{" "}
            <strong>Email:</strong>{" "}
            {usBlank((t?.email as string | null) ?? null)}
          </div>
        </dl>
        <p className="mt-1 italic">
          Hereinafter referred to as the &ldquo;{d.tenantLabel}&rdquo;
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">1. Premises</h2>
        <p className="mt-1">
          {d.landlordLabel} leases to {d.tenantLabel}, and {d.tenantLabel}{" "}
          leases from {d.landlordLabel}, the premises located at:{" "}
          <strong>{usBlank(d.propertyAddress)}</strong> (the
          &ldquo;Premises&rdquo;).
        </p>
        <p className="mt-1">
          Type of property: <strong>{usBlank(d.nature)}</strong>
          {p?.surface_sqm != null && (
            <>
              {" — "}approximate area:{" "}
              <strong>{String(p.surface_sqm)}</strong> m²
            </>
          )}
        </p>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">2. Term</h2>
        {d.isMonthToMonth ? (
          <p className="mt-1">
            This Agreement begins on{" "}
            <strong>{fmtDateUs(d.startDate)}</strong> and continues on a
            month-to-month basis until terminated by either party with at least{" "}
            <strong>
              {d.noticePeriodDays != null ? d.noticePeriodDays : 30}
            </strong>{" "}
            days&rsquo; prior written notice, or any longer notice period
            required by applicable state law.
          </p>
        ) : (
          <p className="mt-1">
            This Agreement is for a fixed term beginning on{" "}
            <strong>{fmtDateUs(d.startDate)}</strong> and ending on{" "}
            <strong>{fmtDateUs(d.endDate)}</strong>. If Tenant remains in
            possession after the end of the term with Landlord&rsquo;s consent,
            the tenancy converts to month-to-month on the same terms, terminable
            by either party with{" "}
            <strong>
              {d.noticePeriodDays != null ? d.noticePeriodDays : 30}
            </strong>{" "}
            days&rsquo; written notice.
          </p>
        )}
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">3. Rent</h2>
        <p className="mt-1">
          Tenant shall pay rent of <strong>{fmtUsd(d.monthlyRentCents)}</strong>{" "}
          per month, payable in advance on the{" "}
          <strong>{d.paymentDay != null ? d.paymentDay : 1}</strong>
          {ordinalSuffix(d.paymentDay != null ? d.paymentDay : 1)} day of each
          month.
        </p>
        {d.lateFeeCents != null && (
          <p className="mt-1">
            If rent is not received within{" "}
            <strong>
              {d.lateFeeGraceDays != null ? d.lateFeeGraceDays : 5}
            </strong>{" "}
            days of the due date, Tenant shall pay a late fee of{" "}
            <strong>{fmtUsd(d.lateFeeCents)}</strong>, to the extent permitted
            by applicable state law.
          </p>
        )}
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">4. Security deposit</h2>
        <p className="mt-1">
          Upon execution of this Agreement, Tenant shall deposit with Landlord
          the sum of <strong>{fmtUsd(d.depositCents)}</strong> as a security
          deposit, to be held and returned in accordance with applicable state
          law after deduction of any lawful charges.
        </p>
        {d.petsAllowed && d.petDepositCents != null && (
          <p className="mt-1">
            In addition, Tenant shall deposit{" "}
            <strong>{fmtUsd(d.petDepositCents)}</strong> as a pet deposit,
            subject to the same conditions.
          </p>
        )}
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">5. Utilities</h2>
        <p className="mt-1">
          The following utilities and services are included in the rent:{" "}
          <strong>{usBlank(d.utilitiesIncluded) || "none"}</strong>. Tenant is
          responsible for arranging and paying for all other utilities and
          services supplied to the Premises.
        </p>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">6. Occupancy and use</h2>
        <p className="mt-1">
          {d.isCommercial
            ? US_ART_OCCUPANCY_COMMERCIAL_TEXT
            : US_ART_OCCUPANCY_TEXT}
        </p>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">7. Pets</h2>
        <p className="mt-1">
          {d.petsAllowed
            ? "Pets are permitted on the Premises with Landlord's prior written approval of each animal."
            : "No pets are permitted on the Premises without the prior written consent of the Landlord."}
        </p>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">8. Maintenance and repairs</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {US_ART_MAINTENANCE_ITEMS.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">9. Landlord&rsquo;s right of entry</h2>
        <p className="mt-1">{US_ART_ENTRY_TEXT}</p>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">10. Insurance</h2>
        <p className="mt-1">{US_ART_INSURANCE_TEXT}</p>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-bold">11. Default</h2>
        <p className="mt-1">{US_ART_DEFAULT_TEXT}</p>
      </section>

      {d.requiresLeadDisclosure && (
        <section className="mt-4">
          <h2 className="text-sm font-bold">12. Lead-based paint disclosure</h2>
          <p className="mt-1">{US_ART_LEAD_PAINT_TEXT}</p>
        </section>
      )}

      <section className="mt-4">
        <h2 className="text-sm font-bold">
          {d.requiresLeadDisclosure ? "13" : "12"}. Governing law;
          severability; entire agreement
        </h2>
        <p className="mt-1">
          This Agreement is governed by the laws of the State of{" "}
          <strong>{usBlank(d.usState)}</strong>.
        </p>
        <p className="mt-1">{US_ART_SEVERABILITY_TEXT}</p>
      </section>

      <section className="mt-8">
        <p className="italic">{US_SIGN_NOTE}</p>
        <div className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <p className="font-semibold">{d.landlordLabel}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              Date and signature
            </p>
            <div className="mt-10 border-b border-slate-400" />
          </div>
          <div>
            <p className="font-semibold">{d.tenantLabel}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              Date and signature
            </p>
            <div className="mt-10 border-b border-slate-400" />
          </div>
        </div>
      </section>
    </article>
  );
}

function ordinalSuffix(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return "st";
  if (rem10 === 2 && rem100 !== 12) return "nd";
  if (rem10 === 3 && rem100 !== 13) return "rd";
  return "th";
}
