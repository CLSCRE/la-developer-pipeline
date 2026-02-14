export const config = {
  ladbs: {
    baseUrl: "https://data.lacity.org/resource/pi9x-tg5x.json",
    oldDatasetUrl: "https://data.lacity.org/resource/hbkd-qubn.json",
    submittedUrl: "https://data.lacity.org/resource/gwh9-jnip.json",
    minValuation: 500000,
    permitTypes: ["Bldg-New", "Bldg-Alter/Repair"],
    pageSize: 1000,
    maxRecords: 50000,
  },
  assessor: {
    baseUrl: "https://assessor.lacounty.gov/api",
  },
  zimas: {
    baseUrl: "https://zimas.lacity.org/arcgis/rest/services",
  },
  email: {
    dailyLimit: 50,
  },
  sos: {
    searchUrl: "https://businesssearch.sos.ca.gov/CBS/SearchResults",
    detailUrl: "https://businesssearch.sos.ca.gov/CBS/Detail",
  },
  googlePlaces: {
    baseUrl: "https://places.googleapis.com/v1/places:searchText",
  },
} as const;

export type PipelineStage = "entitlement" | "permitted" | "construction" | "completed";
export type PipelineSubstage =
  | "submitted"
  | "plan_check"
  | "pc_approved"
  | "ready_to_issue"
  | "issued"
  | "under_inspection"
  | "cofo_issued"
  | "finaled"
  | "expired"
  | null;
export type FinancingType = "predevelopment" | "construction" | "bridge" | "permanent";

export function computePipelineStage(permitStatus: string): {
  stage: PipelineStage;
  substage: PipelineSubstage;
  financingType: FinancingType;
} {
  const status = permitStatus.toLowerCase();

  // Completed: permit finaled, expired, or closed
  if (status.includes("finaled")) {
    return { stage: "completed", substage: "finaled", financingType: "permanent" };
  }
  if (status.includes("expired") || status.includes("closed")) {
    return { stage: "completed", substage: "expired", financingType: "permanent" };
  }

  // Construction: CofO/CofC/TCO (Certificate of Occupancy) or inspection
  if (status.includes("cofo") || status.includes("cofc") || status.includes("tco") || status.includes("certificate")) {
    return { stage: "construction", substage: "cofo_issued", financingType: "bridge" };
  }
  if (status.includes("inspection")) {
    return { stage: "construction", substage: "under_inspection", financingType: "bridge" };
  }

  // Permitted: permit issued (but no CofO yet)
  if (status.includes("issued") || status.includes("permit issued")) {
    return { stage: "permitted", substage: "issued", financingType: "construction" };
  }

  // Entitlement substages (pre-issuance)
  if (status.includes("ready to issue") || status.includes("ready_to_issue") || status.includes("rfi")) {
    return { stage: "entitlement", substage: "ready_to_issue", financingType: "predevelopment" };
  }
  if (status.includes("approved") || status.includes("pc approved") || status.includes("pcapproved")) {
    return { stage: "entitlement", substage: "pc_approved", financingType: "predevelopment" };
  }
  if (status.includes("plan check") || status.includes("plancheck") || status.includes("pc -")) {
    return { stage: "entitlement", substage: "plan_check", financingType: "predevelopment" };
  }
  if (status.includes("submitted") || status.includes("application")) {
    return { stage: "entitlement", substage: "submitted", financingType: "predevelopment" };
  }

  // Default to entitlement for unknown statuses
  return { stage: "entitlement", substage: null, financingType: "predevelopment" };
}
