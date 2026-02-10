type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const suffix = data ? ` ${JSON.stringify(data)}` : "";

  switch (level) {
    case "error":
      console.error(`${prefix} ${message}${suffix}`);
      break;
    case "warn":
      console.warn(`${prefix} ${message}${suffix}`);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.log(`${prefix} ${message}${suffix}`);
      }
      break;
    default:
      console.log(`${prefix} ${message}${suffix}`);
  }
}

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => log("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => log("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) => log("error", message, data),
  debug: (message: string, data?: Record<string, unknown>) => log("debug", message, data),
};
