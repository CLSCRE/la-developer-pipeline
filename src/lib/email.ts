import { prisma } from "./db";
import { config } from "./config";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export async function getSmtpConfig(): Promise<EmailConfig | null> {
  const settings = await prisma.appSetting.findMany({
    where: {
      key: { in: ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass", "smtp_from"] },
    },
  });

  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  if (!map.smtp_host || !map.smtp_user || !map.smtp_pass) return null;

  return {
    host: map.smtp_host,
    port: parseInt(map.smtp_port || "587"),
    secure: map.smtp_secure === "true",
    user: map.smtp_user,
    pass: map.smtp_pass,
    from: map.smtp_from || map.smtp_user,
  };
}

export function substituteVariables(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export async function getDailySendCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.outreachLog.count({
    where: {
      type: "email",
      status: { not: "draft" },
      createdAt: { gte: today },
    },
  });

  return count;
}

export async function canSendEmail(): Promise<{ allowed: boolean; remaining: number }> {
  const sent = await getDailySendCount();
  const remaining = config.email.dailyLimit - sent;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}
