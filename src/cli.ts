import { Command } from "commander";
import { startChat } from "@/chat/interface";
import { logger } from "@/utils/logger";

const program = new Command();

export function setupCLI(): Command {
  program
    .name("shellx")
    .description(
      "AI-powered shell command assistant - get help with terminal commands and shell operations",
    )
    .version("0.1.0")
    .option("-e, --explain", "Show explanations for generated commands")
    .argument("[query...]", "Your shell command question or query")
    .action(async (queryArgs: string[], options: { explain?: boolean }) => {
      try {
        const initialQuery =
          queryArgs && queryArgs.length > 0 ? queryArgs.join(" ") : undefined;

        await startChat(initialQuery, options.explain);
      } catch (error) {
        logger.error("Failed to start application:", error);
        process.exit(1);
      }
    });

  return program;
}
