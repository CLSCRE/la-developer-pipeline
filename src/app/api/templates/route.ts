import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || !body.subject || !body.body || !body.stage) {
    return NextResponse.json({ error: "name, subject, body, and stage are required" }, { status: 400 });
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name: body.name,
      subject: body.subject,
      body: body.body,
      stage: body.stage,
      isDefault: body.isDefault || false,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
