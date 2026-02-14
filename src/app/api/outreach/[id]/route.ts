import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.status) {
    data.status = body.status;
    if (body.status === "opened") data.openedAt = new Date();
    if (body.status === "replied") data.repliedAt = new Date();
  }
  if (body.subject !== undefined) data.subject = body.subject;
  if (body.body !== undefined) data.body = body.body;

  const log = await prisma.outreachLog.update({ where: { id }, data });
  return NextResponse.json(log);
}
