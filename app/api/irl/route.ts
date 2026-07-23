import { NextResponse } from "next/server";

// Indice de référence des loyers (IRL) — INSEE series idbank. Published
// quarterly. Fetched from INSEE's public SDMX web service (no API key).
const IRL_IDBANK = "001515333";
const INSEE_URL = `https://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM/${IRL_IDBANK}`;

// IRL changes at most four times a year, so a daily cache is plenty and keeps
// us well within INSEE's fair-use limits.
const REVALIDATE_SECONDS = 86_400;
export const revalidate = 86_400;

export type IrlQuarter = { period: string; value: number };

// The SDMX response is flat XML with one self-closing <Obs .../> per quarter,
// e.g. <Obs TIME_PERIOD="2025-Q1" OBS_VALUE="145.47" .../>. We only need the
// period and value, so a small regex pass avoids pulling in an XML parser.
function parseObservations(xml: string): IrlQuarter[] {
  const quarters: IrlQuarter[] = [];
  for (const tag of xml.match(/<Obs\b[^>]*\/>/g) ?? []) {
    const period = /TIME_PERIOD="([^"]+)"/.exec(tag)?.[1];
    const rawValue = /OBS_VALUE="([^"]+)"/.exec(tag)?.[1];
    if (!period || !rawValue || !/^\d{4}-Q[1-4]$/.test(period)) continue;
    const value = Number.parseFloat(rawValue);
    if (Number.isFinite(value)) quarters.push({ period, value });
  }
  // Most recent quarter first.
  quarters.sort((a, b) => (a.period < b.period ? 1 : -1));
  return quarters;
}

export async function GET() {
  try {
    const res = await fetch(INSEE_URL, {
      headers: { Accept: "application/xml" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "insee_unavailable" }, { status: 502 });
    }
    const quarters = parseObservations(await res.text());
    if (quarters.length === 0) {
      return NextResponse.json({ error: "insee_unavailable" }, { status: 502 });
    }
    return NextResponse.json({ quarters });
  } catch {
    return NextResponse.json({ error: "insee_unavailable" }, { status: 502 });
  }
}
