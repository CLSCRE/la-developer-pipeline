import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSmtpConfig, substituteVariables, canSendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { developerId, projectId, subject, body: emailBody, templateId } = body;

  if (!developerId || !subject || !emailBody) {
    return NextResponse.json({ error: "developerId, subject, and body are required" }, { status: 400 });
  }

  const { allowed, remaining } = await canSendEmail();
  if (!allowed) {
    return NextResponse.json({ error: "Daily email limit reached", remaining }, { status: 429 });
  }

  const developer = await prisma.developer.findUnique({ where: { id: developerId } });
  if (!developer) {
    return NextResponse.json({ error: "Developer not found" }, { status: 404 });
  }

  // Build template variables
  const vars: Record<string, string> = {
    name: developer.name,
    company: developer.company || "",
    email: developer.email || "",
  };

  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project) {
      vars.projectAddress = project.address;
      vars.permitNumber = project.permitNumber;
    }
  }

  const finalSubject = substituteVariables(subject, vars);
  const finalBody = substituteVariables(emailBody, vars);

  const smtp = await getSmtpConfig();
  let status = "sent";

  if (smtp && developer.email) {
    try {
      // Attempt to dynamically load nodemailer if available
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodemailer = require(/* webpackIgnore: true */ "nodemailer");
      const transport = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
      });
      await transport.sendMail({
        from: smtp.from,
        to: developer.email,
        subject: finalSubject,
        text: finalBody,
      });
      logger.info("Email sent", { to: developer.email, subject: finalSubject });
    } catch (err) {
      logger.warn("SMTP send failed, logging as draft", { error: String(err) });
      status = "draft";
    }
  } else {
    logger.info("No SMTP configured or no email on developer — logging outreach only", { developerId });
    status = developer.email ? "draft" : "sent";
  }

  const log = await prisma.outreachLog.create({
    data: {
      type: "email",
      subject: finalSubject,
      body: finalBody,
      status,
      sentAt: status === "sent" ? new Date() : null,
      templateId: templateId || null,
      developerId,
      projectId: projectId || null,
    },
  });

  return NextResponse.json({ log, status, remaining: remaining - 1 });
}
