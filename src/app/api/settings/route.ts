import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const settings = await prisma.appSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json(map);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  // body is { key: value, key: value, ... }
  const entries = Object.entries(body) as [string, string][];
  for (const [key, value] of entries) {
    await prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  return NextResponse.json({ success: true, updated: entries.length });
}
