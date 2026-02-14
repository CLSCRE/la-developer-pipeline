import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/normalize";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const stage = searchParams.get("stage") || "";
  const sort = searchParams.get("sort") || "name";
  const order = searchParams.get("order") === "desc" ? "desc" : "asc";
  const limit = parseInt(searchParams.get("limit") || "100");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { company: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (stage) {
    where.pipelineStage = stage;
  }

  // Build orderBy — support leadScore sort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any;
  if (sort === "leadScore") {
    orderBy = { leadScore: order };
  } else {
    orderBy = { [sort]: order };
  }

  const developers = await prisma.developer.findMany({
    where,
    include: {
      _count: { select: { projects: true, outreachLogs: true } },
      tags: true,
      projects: { select: { valuation: true } },
    },
    orderBy,
    take: limit,
  });

  const total = await prisma.developer.count({ where });

  return NextResponse.json({ developers, total });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const developer = await prisma.developer.create({
    data: {
      name: body.name,
      normalizedName: normalizeName(body.name),
      company: body.company || null,
      email: body.email || null,
      phone: body.phone || null,
      linkedinUrl: body.linkedinUrl || null,
      website: body.website || null,
      address: body.address || null,
      entityType: body.entityType || null,
      notes: body.notes || null,
      pipelineStage: body.pipelineStage || "new",
    },
  });

  return NextResponse.json(developer, { status: 201 });
}
