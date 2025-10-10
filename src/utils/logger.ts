import winston from "winston";
import { tmpdir } from "os";
import { join } from "path";

// Create logs directory in system temp folder
const logDir = join(tmpdir(), "shellx-logs");

// Generate unique session ID
const sessionId = `session-${Date.now()}-${Math.random()
  .toString(36)
  .substr(2, 9)}`;

// Create Winston logger instance with single session log file
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "shellx", sessionId },
  transports: [
    // Single log file per session
    new winston.transports.File({
      filename: join(logDir, `${sessionId}.log`),
      maxsize: 5242880, // 5MB
    }),
  ],
});

// Export the logger instance
export { logger };
