import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const { host, port, secure, user, pass } = await request.json();

  if (!host || !user || !pass) {
    return NextResponse.json({ error: "host, user, and pass are required" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require(/* webpackIgnore: true */ "nodemailer");
    const transport = nodemailer.createTransport({
      host,
      port: parseInt(port || "587"),
      secure: secure === true || secure === "true",
      auth: { user, pass },
    });
    await transport.verify();
    logger.info("SMTP test successful", { host });
    return NextResponse.json({ success: true, message: "SMTP connection successful" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("SMTP test failed", { host, error: message });
    return NextResponse.json({ success: false, message: `Connection failed: ${message}` });
  }
}
