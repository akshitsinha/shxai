import { Command } from "commander";
import { startChat } from "@/chat/interface";
import { logger } from "@/utils/logger";

const program = new Command();

export function setupCLI(): Command {
  program
    .name("shellx")
    .description("A modern CLI chatbot with minimal interface")
    .version("1.0.0");

  // Main chat command (default)
  program.action(async () => {
    try {
      // Start the chat interface
      await startChat();
    } catch (error) {
      logger.error("Failed to start chat interface:", error);
      process.exit(1);
    }
  });

  // Add help command
  program
    .command("help")
    .description("Show help information")
    .action(() => {
      program.help();
    });

  return program;
}
