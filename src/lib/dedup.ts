import { prisma } from "./db";
import { normalizeName } from "./normalize";

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export interface DuplicatePair {
  developer1: {
    id: string;
    name: string;
    normalizedName: string;
    leadScore: number | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    entityType: string | null;
    projectCount: number;
    outreachCount: number;
  };
  developer2: {
    id: string;
    name: string;
    normalizedName: string;
    leadScore: number | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    entityType: string | null;
    projectCount: number;
    outreachCount: number;
  };
  distance: number;
}

export async function findPotentialDuplicates(): Promise<DuplicatePair[]> {
  const developers = await prisma.developer.findMany({
    select: {
      id: true,
      name: true,
      normalizedName: true,
      leadScore: true,
      email: true,
      phone: true,
      website: true,
      address: true,
      entityType: true,
      _count: { select: { projects: true, outreachLogs: true } },
    },
    orderBy: { name: "asc" },
  });

  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < developers.length; i++) {
    const a = developers[i];
    const normA = a.normalizedName || normalizeName(a.name);

    for (let j = i + 1; j < developers.length; j++) {
      const b = developers[j];
      const normB = b.normalizedName || normalizeName(b.name);

      // Early skip: if length difference > 3, distance must be > 3
      if (Math.abs(normA.length - normB.length) > 3) continue;

      const dist = levenshteinDistance(normA, normB);
      if (dist <= 3) {
        pairs.push({
          developer1: {
            id: a.id,
            name: a.name,
            normalizedName: normA,
            leadScore: a.leadScore,
            email: a.email,
            phone: a.phone,
            website: a.website,
            address: a.address,
            entityType: a.entityType,
            projectCount: a._count.projects,
            outreachCount: a._count.outreachLogs,
          },
          developer2: {
            id: b.id,
            name: b.name,
            normalizedName: normB,
            leadScore: b.leadScore,
            email: b.email,
            phone: b.phone,
            website: b.website,
            address: b.address,
            entityType: b.entityType,
            projectCount: b._count.projects,
            outreachCount: b._count.outreachLogs,
          },
          distance: dist,
        });
      }
    }
  }

  // Sort by distance (closest matches first)
  pairs.sort((a, b) => a.distance - b.distance);

  return pairs;
}

export async function mergeDevelopers(primaryId: string, secondaryId: string): Promise<void> {
  const [primary, secondary] = await Promise.all([
    prisma.developer.findUnique({ where: { id: primaryId } }),
    prisma.developer.findUnique({ where: { id: secondaryId } }),
  ]);

  if (!primary || !secondary) {
    throw new Error("One or both developers not found");
  }

  // Transfer projects from secondary to primary
  await prisma.project.updateMany({
    where: { developerId: secondaryId },
    data: { developerId: primaryId },
  });

  // Transfer outreach logs from secondary to primary
  await prisma.outreachLog.updateMany({
    where: { developerId: secondaryId },
    data: { developerId: primaryId },
  });

  // Transfer tags (skip duplicates via unique constraint)
  const secondaryTags = await prisma.developerTag.findMany({
    where: { developerId: secondaryId },
  });
  for (const tag of secondaryTags) {
    const existing = await prisma.developerTag.findUnique({
      where: { developerId_tag: { developerId: primaryId, tag: tag.tag } },
    });
    if (!existing) {
      await prisma.developerTag.create({
        data: { developerId: primaryId, tag: tag.tag },
      });
    }
  }

  // Fill blank contact fields from secondary
  const updates: Record<string, string> = {};
  if (!primary.email && secondary.email) updates.email = secondary.email;
  if (!primary.phone && secondary.phone) updates.phone = secondary.phone;
  if (!primary.website && secondary.website) updates.website = secondary.website;
  if (!primary.address && secondary.address) updates.address = secondary.address;
  if (!primary.linkedinUrl && secondary.linkedinUrl) updates.linkedinUrl = secondary.linkedinUrl;
  if (!primary.company && secondary.company) updates.company = secondary.company;

  // Combine notes
  if (secondary.notes) {
    const combinedNotes = [primary.notes, `[Merged from ${secondary.name}] ${secondary.notes}`]
      .filter(Boolean)
      .join("\n\n");
    updates.notes = combinedNotes;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.developer.update({
      where: { id: primaryId },
      data: updates,
    });
  }

  // Delete secondary's tags first (foreign key constraint)
  await prisma.developerTag.deleteMany({
    where: { developerId: secondaryId },
  });

  // Delete secondary developer
  await prisma.developer.delete({
    where: { id: secondaryId },
  });
}
