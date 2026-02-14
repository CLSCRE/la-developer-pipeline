import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { developerId } = await request.json();

  if (!developerId) {
    return NextResponse.json({ error: "developerId required" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id },
    data: { developerId },
    include: { developer: true },
  });

  return NextResponse.json(project);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.update({
    where: { id },
    data: { developerId: null },
  });

  return NextResponse.json(project);
}
