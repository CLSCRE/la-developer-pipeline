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

// Field names from hbkd-qubn dataset (LADBS-Permits, has contractor/applicant info)
interface LADBSOldPermit {
  pcis_permit: string;
  permit_type: string;
  permit_sub_type?: string;
  initiating_office?: string;
  issue_date?: string;
  address_start?: string;
  street_name?: string;
  street_suffix?: string;
  zip_code?: string;
  work_description?: string;
  valuation?: string;
  contractors_business_name?: string;
  contractor_address?: string;
  contractor_city?: string;
  license?: string;
  principal_first_name?: string;
  principal_last_name?: string;
  license_expiration_date?: string;
  applicant_first_name?: string;
  applicant_last_name?: string;
  applicant_business_name?: string;
  zone?: string;
  council_district?: string;
}

// Field names from gwh9-jnip dataset (Submitted Permits — pre-issuance)
interface LADBSSubmittedPermit {
  permit_nbr?: string;
  permit_type?: string;
  permit_sub_type?: string;
  primary_address?: string;
  zip_code?: string;
  zone?: string;
  apn?: string;
  submitted_date?: string;
  status_desc?: string;
  status_date?: string;
  valuation?: string;
  work_desc?: string;
  lat?: string;
  lon?: string;
  cd?: string;
  use_code?: string;
  use_desc?: string;
  geolocation?: { type: string; coordinates: number[] };
}

export interface ParsedPermit {
  permitNumber: string;
  permitType: string;
  status: string;
  pipelineStage: string;
  pipelineSubstage: string | null;
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
  const { stage, substage, financingType } = computePipelineStage(raw.status_desc || "");
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
    pipelineSubstage: substage,
    financingType: financingType,
    address,
    description: raw.work_desc || null,
    valuation,
    units: null,
    stories: null,
    sqft: null,
    zoneCode: raw.zone || null,
    apn: raw.apn || null,
    latitude: lat,
    longitude: lon,
    permitDate: parseDate(raw.status_date || raw.submitted_date),
    issueDate: parseDate(raw.issue_date),
    contractor: null,
    ownerName: null,
    ownerAddress: null,
    rawData: JSON.stringify(raw),
  };
}

function parseOldPermit(raw: LADBSOldPermit): ParsedPermit {
  const valuation = raw.valuation ? parseFloat(raw.valuation) : null;

  // Build address from parts
  const addrParts = [raw.address_start, raw.street_name, raw.street_suffix].filter(Boolean);
  const address = addrParts.length > 0
    ? `${addrParts.join(" ")}, Los Angeles, CA${raw.zip_code ? " " + raw.zip_code : ""}`
    : "Unknown Address";

  // Determine status from permit type (this dataset doesn't have a status field)
  const { stage, substage, financingType } = computePipelineStage(raw.issue_date ? "Issued" : "");

  // Build contractor name
  const contractor = raw.contractors_business_name?.trim() || null;

  // Build applicant/owner name from available fields
  let ownerName: string | null = null;
  if (raw.applicant_business_name?.trim()) {
    ownerName = raw.applicant_business_name.trim();
  } else if (raw.applicant_first_name || raw.applicant_last_name) {
    ownerName = [raw.applicant_first_name, raw.applicant_last_name].filter(Boolean).join(" ").trim() || null;
  } else if (raw.principal_first_name || raw.principal_last_name) {
    ownerName = [raw.principal_first_name, raw.principal_last_name].filter(Boolean).join(" ").trim() || null;
  }

  // Build contractor address
  let ownerAddress: string | null = null;
  if (raw.contractor_address) {
    ownerAddress = raw.contractor_address;
    if (raw.contractor_city) ownerAddress += `, ${raw.contractor_city}`;
  }

  return {
    permitNumber: raw.pcis_permit || "",
    permitType: raw.permit_type || "Unknown",
    status: raw.issue_date ? "Issued" : "Unknown",
    pipelineStage: stage,
    pipelineSubstage: substage,
    financingType: financingType,
    address,
    description: raw.work_description || null,
    valuation,
    units: null,
    stories: null,
    sqft: null,
    zoneCode: raw.zone || null,
    apn: null,
    latitude: null,
    longitude: null,
    permitDate: parseDate(raw.issue_date),
    issueDate: parseDate(raw.issue_date),
    contractor,
    ownerName,
    ownerAddress,
    rawData: JSON.stringify(raw),
  };
}

function parseSubmittedPermit(raw: LADBSSubmittedPermit): ParsedPermit {
  const { stage, substage, financingType } = computePipelineStage(raw.status_desc || "Submitted");
  const valuation = raw.valuation ? parseFloat(raw.valuation) : null;
  const lat = raw.lat ? parseFloat(raw.lat) : null;
  const lon = raw.lon ? parseFloat(raw.lon) : null;

  const address = raw.primary_address
    ? `${raw.primary_address}, Los Angeles, CA${raw.zip_code ? " " + raw.zip_code : ""}`
    : "Unknown Address";

  return {
    permitNumber: raw.permit_nbr || "",
    permitType: raw.permit_type || "Unknown",
    status: raw.status_desc || "Submitted",
    pipelineStage: stage,
    pipelineSubstage: substage,
    financingType: financingType,
    address,
    description: raw.work_desc || null,
    valuation,
    units: null,
    stories: null,
    sqft: null,
    zoneCode: raw.zone || null,
    apn: raw.apn || null,
    latitude: lat,
    longitude: lon,
    permitDate: parseDate(raw.submitted_date || raw.status_date),
    issueDate: null,
    contractor: null,
    ownerName: null,
    ownerAddress: null,
    rawData: JSON.stringify(raw),
  };
}

export async function fetchLADBSPermits(offset = 0, dateFrom?: string): Promise<ParsedPermit[]> {
  const { baseUrl, minValuation, permitTypes, pageSize } = config.ladbs;

  // Build SoQL WHERE clause
  const typeFilter = permitTypes.map((t) => `permit_type='${t}'`).join(" OR ");
  let where = `(${typeFilter}) AND valuation::number > ${minValuation}`;

  // Add date filter if specified
  if (dateFrom) {
    where += ` AND status_date >= '${dateFrom}'`;
  }

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

export async function fetchAllLADBSPermits(dateFrom?: string): Promise<ParsedPermit[]> {
  const allPermits: ParsedPermit[] = [];
  let offset = 0;
  const { pageSize, maxRecords } = config.ladbs;

  while (true) {
    const batch = await fetchLADBSPermits(offset, dateFrom);
    allPermits.push(...batch);

    if (batch.length < pageSize) break;
    offset += pageSize;

    if (offset >= maxRecords) {
      logger.warn(`Reached ${maxRecords} record cap, stopping pagination`);
      break;
    }
  }

  logger.info(`Total permits fetched: ${allPermits.length}`);
  return allPermits;
}

// Fetch from the old dataset (hbkd-qubn) that has contractor/applicant info
export async function fetchOldDatasetPermits(offset = 0, minValuation = 500000): Promise<ParsedPermit[]> {
  const { oldDatasetUrl, pageSize } = config.ladbs;

  // Filter for building permits with high valuation
  const where = `valuation > ${minValuation} AND (permit_type='Bldg-New' OR permit_type='Bldg-Addition' OR permit_type='Bldg-Alter/Repair')`;

  const params = new URLSearchParams({
    $where: where,
    $limit: pageSize.toString(),
    $offset: offset.toString(),
    $order: "issue_date DESC",
  });

  const url = `${oldDatasetUrl}?${params.toString()}`;
  logger.info("Fetching old LADBS dataset", { url, offset });

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Old LADBS API error: ${response.status} ${response.statusText}`);
  }

  const data: LADBSOldPermit[] = await response.json();
  logger.info(`Fetched ${data.length} permits from old dataset`, { offset });

  return data.map(parseOldPermit).filter((p) => p.permitNumber);
}

export async function fetchAllOldDatasetPermits(minValuation = 500000): Promise<ParsedPermit[]> {
  const allPermits: ParsedPermit[] = [];
  let offset = 0;
  const { pageSize, maxRecords } = config.ladbs;

  while (true) {
    const batch = await fetchOldDatasetPermits(offset, minValuation);
    allPermits.push(...batch);

    if (batch.length < pageSize) break;
    offset += pageSize;

    if (offset >= maxRecords) {
      logger.warn(`Reached ${maxRecords} record cap for old dataset`);
      break;
    }
  }

  logger.info(`Total old dataset permits fetched: ${allPermits.length}`);
  return allPermits;
}

// Fetch from submitted permits dataset (gwh9-jnip) — pre-issuance entitlement stage
export async function fetchSubmittedPermits(offset = 0, minValuation = 500000): Promise<ParsedPermit[]> {
  const { submittedUrl, permitTypes, pageSize } = config.ladbs;

  const typeFilter = permitTypes.map((t) => `permit_type='${t}'`).join(" OR ");
  const where = `(${typeFilter}) AND valuation::number > ${minValuation}`;

  const params = new URLSearchParams({
    $where: where,
    $limit: pageSize.toString(),
    $offset: offset.toString(),
    $order: "status_date DESC",
  });

  const url = `${submittedUrl}?${params.toString()}`;
  logger.info("Fetching submitted permits", { url, offset });

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Submitted permits API error: ${response.status} ${response.statusText}`);
  }

  const data: LADBSSubmittedPermit[] = await response.json();
  logger.info(`Fetched ${data.length} submitted permits`, { offset });

  return data.map(parseSubmittedPermit).filter((p) => p.permitNumber);
}

export async function fetchAllSubmittedPermits(minValuation = 500000): Promise<ParsedPermit[]> {
  const allPermits: ParsedPermit[] = [];
  let offset = 0;
  const { pageSize, maxRecords } = config.ladbs;

  while (true) {
    const batch = await fetchSubmittedPermits(offset, minValuation);
    allPermits.push(...batch);

    if (batch.length < pageSize) break;
    offset += pageSize;

    if (offset >= maxRecords) {
      logger.warn(`Reached ${maxRecords} record cap for submitted dataset`);
      break;
    }
  }

  logger.info(`Total submitted permits fetched: ${allPermits.length}`);
  return allPermits;
}
