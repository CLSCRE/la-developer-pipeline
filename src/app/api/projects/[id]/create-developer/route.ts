import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalize";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.ownerName) {
    return NextResponse.json({ error: "Project has no owner name" }, { status: 400 });
  }

  const developer = await prisma.developer.create({
    data: {
      name: project.ownerName,
      normalizedName: normalizeName(project.ownerName),
      address: project.ownerAddress || undefined,
      pipelineStage: "new",
    },
  });

  await prisma.project.update({
    where: { id },
    data: { developerId: developer.id },
  });

  return NextResponse.json(developer, { status: 201 });
}
