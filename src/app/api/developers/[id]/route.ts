import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const developer = await prisma.developer.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { permitDate: "desc" },
        select: {
          id: true,
          address: true,
          permitNumber: true,
          permitType: true,
          pipelineStage: true,
          valuation: true,
          permitDate: true,
        },
      },
      outreachLogs: {
        orderBy: { createdAt: "desc" },
        include: { project: { select: { address: true } } },
      },
      tags: true,
    },
  });

  if (!developer) {
    return NextResponse.json({ error: "Developer not found" }, { status: 404 });
  }

  return NextResponse.json(developer);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  const fields = ["name", "company", "email", "phone", "linkedinUrl", "website", "address", "entityType", "sosStatus", "notes", "pipelineStage"];
  for (const field of fields) {
    if (field in body) data[field] = body[field];
  }
  if ("name" in body) {
    data.normalizedName = normalizeName(body.name);
  }

  const developer = await prisma.developer.update({
    where: { id },
    data,
  });

  return NextResponse.json(developer);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Unlink projects first
  await prisma.project.updateMany({
    where: { developerId: id },
    data: { developerId: null },
  });

  // Delete tags and outreach logs
  await prisma.developerTag.deleteMany({ where: { developerId: id } });
  await prisma.outreachLog.deleteMany({ where: { developerId: id } });
  await prisma.developer.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
