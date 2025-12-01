import { Command } from "commander";
import { startChat } from "@/chat/interface";
import { logger } from "@/utils/logger";

const program = new Command();

export function setupCLI(): Command {
  program
    .name("shxai")
    .description(
      "AI-powered shell command assistant - get help with terminal commands and shell operations",
    )
    .version("0.2.1")
    .argument("[query...]", "Your shell command question or query")
    .action(async (queryArgs: string[]) => {
      try {
        const initialQuery =
          queryArgs && queryArgs.length > 0 ? queryArgs.join(" ") : undefined;

        await startChat(initialQuery);
      } catch (error) {
        logger.error("Failed to start application:", error);
        process.exit(1);
      }
    });

  return program;
}
