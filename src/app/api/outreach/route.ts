import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const developerId = searchParams.get("developerId");
  const projectId = searchParams.get("projectId");
  const limit = parseInt(searchParams.get("limit") || "50");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (developerId) where.developerId = developerId;
  if (projectId) where.projectId = projectId;

  const logs = await prisma.outreachLog.findMany({
    where,
    include: {
      developer: { select: { id: true, name: true } },
      project: { select: { id: true, address: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.developerId || !body.type) {
    return NextResponse.json({ error: "developerId and type are required" }, { status: 400 });
  }

  const log = await prisma.outreachLog.create({
    data: {
      type: body.type,
      subject: body.subject || null,
      body: body.body || null,
      status: body.status || "sent",
      sentAt: body.type === "email" ? new Date() : null,
      templateId: body.templateId || null,
      campaignId: body.campaignId || null,
      developerId: body.developerId,
      projectId: body.projectId || null,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
