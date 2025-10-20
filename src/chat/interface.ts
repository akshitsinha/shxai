import { input } from "@inquirer/prompts";
import ora from "ora";
import chalk from "chalk";
import { sendMessage, getOSInfo, initializeConnection } from "@/chat/handlers";
import { logger } from "@/utils/logger";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Response {
  command: string;
  needContext: boolean;
  success: boolean;
}

const isExitCommand = (message: string) =>
  ["exit", "quit", "q", "bye"].includes(message.trim().toLowerCase());

const theme = {
  prefix: {
    idle: chalk.blue(">"),
    done: chalk.green("✔"),
  },
  style: {
    message: (text: string) =>
      text.trim() === "" ? (undefined as unknown as string) : text,
  },
};

const promptUser = (command: string) =>
  input({ message: chalk.green(command), theme });

const executeCommand = async (command: string) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      shell: process.env.SHELL || "/bin/sh",
    });
    const output = stdout || stderr;
    if (output) console.log(output);
    return { output, exitCode: 0 };
  } catch (error: any) {
    const output =
      error.stdout ||
      error.stderr ||
      error.message ||
      "Command execution failed";
    console.log(output);
    return { output, exitCode: error.code || 1 };
  }
};

const withSpinner = async <T>(message: string, fn: () => Promise<T>) => {
  const spinner = ora(message).start();
  try {
    return await fn();
  } finally {
    spinner.stop();
  }
};

const processMessage = async (message: string) => {
  if (isExitCommand(message)) {
    console.log(chalk.yellow("\nGoodbye!"));
    process.exit(0);
  }

  const output = await withSpinner("Processing...", () =>
    sendMessage("inquiry", { content: message, os: getOSInfo() }),
  );

  let current: Response = JSON.parse(output);
  let contextOutput: string | undefined;

  while (true) {
    if (!current.success) {
      console.log(chalk.red("Could not generate a valid command."));
      process.exit(1);
    }

    if (contextOutput) {
      const output = await withSpinner("Refining...", () =>
        sendMessage("context", { commandOutput: contextOutput! }),
      );
      current = JSON.parse(output);
      contextOutput = undefined;
      continue;
    }

    const userInput = await promptUser(current.command);

    if (userInput.trim()) {
      const output = await withSpinner("Refining...", () =>
        sendMessage("refine", { additionalContext: userInput }),
      );
      current = JSON.parse(output);
      continue;
    }

    const { output: execOutput, exitCode } = await executeCommand(
      current.command,
    );

    if (current.needContext) {
      contextOutput = execOutput;
      continue;
    }

    process.exit(exitCode === 0 ? 0 : 1);
  }
};

export const startChat = async (initialQuery?: string) => {
  try {
    await initializeConnection();
  } catch (error) {
    logger.error(error);
    console.log(chalk.red("Failed to initialize connection"));
    process.exit(1);
  }

  if (initialQuery) {
    await processMessage(initialQuery);
    return;
  }

  while (true) {
    try {
      const message = await input({
        message: "",
        theme,
        validate: (input: string) => (input.trim() ? true : "Enter a command"),
      });

      await processMessage(message);
    } catch (error) {
      if (error instanceof Error && error.name === "ExitPromptError") {
        console.log(chalk.yellow("\nGoodbye!"));
        process.exit(0);
      }
      logger.error(error);
    }
  }
};
