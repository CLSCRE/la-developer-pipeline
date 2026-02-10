export const config = {
  ladbs: {
    baseUrl: "https://data.lacity.org/resource/pi9x-tg5x.json",
    minValuation: 500000,
    permitTypes: ["Bldg-New", "Bldg-Alter/Repair"],
    pageSize: 1000,
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
} as const;

export type PipelineStage = "entitlement" | "permitted" | "construction" | "completed";
export type FinancingType = "predevelopment" | "construction" | "bridge" | "permanent";

export function computePipelineStage(permitStatus: string): { stage: PipelineStage; financingType: FinancingType } {
  const status = permitStatus.toLowerCase();

  if (status.includes("submitted") || status.includes("plan check") || status.includes("plan check")) {
    return { stage: "entitlement", financingType: "predevelopment" };
  }
  if (status.includes("issued") || status.includes("permit issued")) {
    return { stage: "permitted", financingType: "construction" };
  }
  if (status.includes("inspection") || status.includes("under inspection")) {
    return { stage: "construction", financingType: "bridge" };
  }
  if (status.includes("final") || status.includes("completed") || status.includes("certificate")) {
    return { stage: "completed", financingType: "permanent" };
  }

  // Default to entitlement for unknown statuses
  return { stage: "entitlement", financingType: "predevelopment" };
}
