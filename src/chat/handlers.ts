import { logger } from "@/utils/logger";

/**
 * Handle incoming chat messages
 * For now, this is a decoy function that returns "nothing"
 */
export async function handleMessage(message: string): Promise<string> {
  logger.info(`Received message: "${message}"`);

  // Simulate some processing time
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return the decoy response
  return "nothing";
}

/**
 * Validate message content
 */
export function validateMessage(message: string): boolean {
  return message.trim().length > 0;
}

/**
 * Clean and prepare message for processing
 */
export function sanitizeMessage(message: string): string {
  return message.trim();
}
