import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSmtpConfig, substituteVariables, canSendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { developerIds, subject, body: emailBody, templateId } = body;

  if (!developerIds?.length || !subject || !emailBody) {
    return NextResponse.json({ error: "developerIds, subject, and body are required" }, { status: 400 });
  }

  const { allowed, remaining } = await canSendEmail();
  if (!allowed) {
    return NextResponse.json({ error: "Daily email limit reached", remaining }, { status: 429 });
  }

  const developers = await prisma.developer.findMany({
    where: { id: { in: developerIds } },
  });

  const smtp = await getSmtpConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let transport: any = null;

  if (smtp) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodemailer = require(/* webpackIgnore: true */ "nodemailer");
      transport = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
      });
    } catch {
      logger.warn("Could not initialize SMTP transport");
    }
  }

  let sent = 0;
  let logged = 0;
  let failed = 0;
  const toSend = Math.min(developers.length, remaining);

  for (let i = 0; i < toSend; i++) {
    const dev = developers[i];
    const vars: Record<string, string> = {
      name: dev.name,
      company: dev.company || "",
      email: dev.email || "",
    };

    const finalSubject = substituteVariables(subject, vars);
    const finalBody = substituteVariables(emailBody, vars);

    let status = "sent";

    if (transport && dev.email) {
      try {
        await transport.sendMail({
          from: smtp!.from,
          to: dev.email,
          subject: finalSubject,
          text: finalBody,
        });
        sent++;
      } catch {
        status = "draft";
        failed++;
      }
    } else {
      status = dev.email ? "draft" : "sent";
      logged++;
    }

    await prisma.outreachLog.create({
      data: {
        type: "email",
        subject: finalSubject,
        body: finalBody,
        status,
        sentAt: status === "sent" ? new Date() : null,
        templateId: templateId || null,
        developerId: dev.id,
      },
    });
  }

  const skipped = developers.length - toSend;
  logger.info("Batch email completed", { sent, logged, failed, skipped });

  return NextResponse.json({ sent, logged, failed, skipped, total: developers.length });
}
