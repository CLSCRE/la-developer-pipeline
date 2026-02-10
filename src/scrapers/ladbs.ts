import { config, computePipelineStage } from "../lib/config";
import { logger } from "../lib/logger";

// Field names from the pi9x-tg5x dataset (Building Permits Issued from 2020 to Present)
interface LADBSPermit {
  permit_nbr: string;
  permit_type: string;
  permit_sub_type?: string;
  permit_group?: string;
  primary_address?: string;
  zip_code?: string;
  cd?: string;
  pin_nbr?: string;
  apn?: string;
  zone?: string;
  apc?: string;
  cpa?: string;
  cnc?: string;
  ct?: string;
  use_code?: string;
  use_desc?: string;
  submitted_date?: string;
  issue_date?: string;
  status_desc?: string;
  status_date?: string;
  valuation?: string;
  work_desc?: string;
  ev?: string;
  solar?: string;
  business_unit?: string;
  lat?: string;
  lon?: string;
  geolocation?: { type: string; coordinates: number[] };
}

export interface ParsedPermit {
  permitNumber: string;
  permitType: string;
  status: string;
  pipelineStage: string;
  financingType: string;
  address: string;
  description: string | null;
  valuation: number | null;
  units: number | null;
  stories: number | null;
  sqft: number | null;
  zoneCode: string | null;
  apn: string | null;
  latitude: number | null;
  longitude: number | null;
  permitDate: Date | null;
  issueDate: Date | null;
  contractor: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  rawData: string;
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function parsePermit(raw: LADBSPermit): ParsedPermit {
  const { stage, financingType } = computePipelineStage(raw.status_desc || "");
  const valuation = raw.valuation ? parseFloat(raw.valuation) : null;
  const lat = raw.lat ? parseFloat(raw.lat) : null;
  const lon = raw.lon ? parseFloat(raw.lon) : null;

  const address = raw.primary_address
    ? `${raw.primary_address}, Los Angeles, CA${raw.zip_code ? " " + raw.zip_code : ""}`
    : "Unknown Address";

  return {
    permitNumber: raw.permit_nbr || "",
    permitType: raw.permit_type || "Unknown",
    status: raw.status_desc || "Unknown",
    pipelineStage: stage,
    financingType: financingType,
    address,
    description: raw.work_desc || null,
    valuation,
    units: null, // not in this dataset directly
    stories: null,
    sqft: null,
    zoneCode: raw.zone || null,
    apn: raw.apn || null,
    latitude: lat,
    longitude: lon,
    permitDate: parseDate(raw.status_date || raw.submitted_date),
    issueDate: parseDate(raw.issue_date),
    contractor: null, // not in this dataset
    ownerName: raw.use_desc || null, // use_desc gives context (e.g. "Apartment", "Commercial")
    ownerAddress: null,
    rawData: JSON.stringify(raw),
  };
}

export async function fetchLADBSPermits(offset = 0): Promise<ParsedPermit[]> {
  const { baseUrl, minValuation, permitTypes, pageSize } = config.ladbs;

  // Build SoQL WHERE clause
  const typeFilter = permitTypes.map((t) => `permit_type='${t}'`).join(" OR ");
  const where = `(${typeFilter}) AND valuation::number > ${minValuation}`;

  const params = new URLSearchParams({
    $where: where,
    $limit: pageSize.toString(),
    $offset: offset.toString(),
    $order: "status_date DESC",
  });

  const url = `${baseUrl}?${params.toString()}`;
  logger.info("Fetching LADBS permits", { url, offset });

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`LADBS API error: ${response.status} ${response.statusText}`);
  }

  const data: LADBSPermit[] = await response.json();
  logger.info(`Fetched ${data.length} permits from LADBS`, { offset });

  return data.map(parsePermit).filter((p) => p.permitNumber);
}

export async function fetchAllLADBSPermits(): Promise<ParsedPermit[]> {
  const allPermits: ParsedPermit[] = [];
  let offset = 0;
  const { pageSize } = config.ladbs;

  while (true) {
    const batch = await fetchLADBSPermits(offset);
    allPermits.push(...batch);

    if (batch.length < pageSize) break;
    offset += pageSize;

    // Safety: cap at 10,000 records per run
    if (offset >= 10000) {
      logger.warn("Reached 10,000 record cap, stopping pagination");
      break;
    }
  }

  logger.info(`Total permits fetched: ${allPermits.length}`);
  return allPermits;
}
