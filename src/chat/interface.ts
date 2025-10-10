import inquirer from "inquirer";
import ora from "ora";
import { handleMessage } from "./handlers";
import { logger } from "@/utils/logger";

export async function startChat(): Promise<void> {
  const chalk = (await import("chalk")).default;
  console.log(chalk.gray("\n💬 Chat started. Type your messages below:\n"));

  while (true) {
    try {
      // Get user input
      const { message } = await inquirer.prompt([
        {
          type: "input",
          name: "message",
          message: chalk.cyan("You:"),
          validate: (input: string) => {
            if (input.trim().length === 0) {
              return "Please enter a message";
            }
            return true;
          },
        },
      ]);

      // Check for exit commands
      if (
        message.trim().toLowerCase() === "exit" ||
        message.trim().toLowerCase() === "quit" ||
        message.trim().toLowerCase() === "bye"
      ) {
        console.log(chalk.yellow("\n👋 Goodbye!"));
        break;
      }

      // Show processing spinner
      const spinner = ora({
        text: chalk.gray("Processing..."),
        color: "cyan",
      }).start();

      try {
        // Process the message
        const response = await handleMessage(message);

        spinner.stop();

        // Display response
        console.log(chalk.green("Bot:"), chalk.white(response));
        console.log(); // Empty line for spacing
      } catch (error) {
        spinner.fail(chalk.red("Failed to process message"));
        logger.error("Message processing error:", error);
        console.log(
          chalk.red("Sorry, something went wrong. Please try again.\n")
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "ExitPromptError") {
        // User pressed Ctrl+C
        console.log(chalk.yellow("\n\n👋 Goodbye!"));
        break;
      }

      logger.error("Chat interface error:", error);
      console.log(chalk.red("An error occurred. Please try again.\n"));
    }
  }
}
