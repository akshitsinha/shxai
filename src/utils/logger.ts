import winston from "winston";
import { tmpdir } from "os";
import { join } from "path";

const logDir = join(tmpdir(), "shellx-logs");
const sessionId = `session-${Date.now()}`;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "shellx", sessionId },
  transports: [
    new winston.transports.File({
      filename: join(logDir, `${sessionId}.log`),
      maxsize: 5242880, // 5MB
    }),
  ],
});

export { logger };
