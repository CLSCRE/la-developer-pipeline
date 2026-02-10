import { PrismaClient } from "@prisma/client";
export type { Project, Developer, ScrapeRun, OutreachLog, DeveloperTag, EmailTemplate, AppSetting } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
