import { input } from "@inquirer/prompts";
import ora from "ora";
import chalk from "chalk";
import {
  handleMessage,
  sendContextMessage,
  sendRefinementMessage,
  initializeConnection,
} from "@/chat/handlers";
import { logger } from "@/utils/logger";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let showExplanations = false;

interface CommandResponse {
  command: string;
  explanation: string;
  needContext: boolean;
  success: boolean;
}

function isExitCommand(message: string): boolean {
  return ["exit", "quit", "q", "bye"].includes(message.trim().toLowerCase());
}

function validateResponse(response: CommandResponse): void {
  if (!response.success) {
    console.log(chalk.red("Could not generate a valid command."));
    process.exit(1);
  }
}

function displayCommand(response: CommandResponse): void {
  if (showExplanations) {
    console.log(chalk.gray(response.explanation));
  }
}

async function promptUser(command: string): Promise<string> {
  return input({
    message: chalk.green(command),
    theme: {
      prefix: {
        idle: chalk.blue("> "),
        done: chalk.green("✔ "),
      },
    },
  });
}

async function promptForRefinementOrExecution(
  response: CommandResponse,
): Promise<"execute" | string> {
  validateResponse(response);
  displayCommand(response);

  const userInput = await promptUser(response.command);
  return userInput.trim() === "" ? "execute" : userInput;
}

async function promptAndExecute(
  response: CommandResponse,
): Promise<{ output: string; exitCode: number }> {
  validateResponse(response);
  displayCommand(response);

  await promptUser(response.command);
  return executeCommand(response.command);
}

async function executeCommand(
  command: string,
): Promise<{ output: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      shell: process.env.SHELL || "/bin/sh",
    });
    const output = stdout || stderr;
    if (output) {
      console.log(output);
    }
    return { output, exitCode: 0 };
  } catch (error: any) {
    const errorOutput =
      error.stdout ||
      error.stderr ||
      error.message ||
      "Command execution failed";
    console.log(errorOutput);
    return { output: errorOutput, exitCode: error.code || 1 };
  }
}

async function refineCommand(
  response: CommandResponse,
): Promise<CommandResponse> {
  while (true) {
    const userAction = await promptForRefinementOrExecution(response);

    if (userAction === "execute") {
      return response;
    }

    const spinner = ora(" Refining...").start();
    const output = await sendRefinementMessage(userAction);
    spinner.stop();

    response = JSON.parse(output);
  }
}

async function executeWithContext(response: CommandResponse): Promise<void> {
  let contextOutput = (await executeCommand(response.command)).output;

  while (true) {
    const spinner = ora(" Refining...").start();
    const output = await sendContextMessage(contextOutput);
    spinner.stop();

    const refinedResponse: CommandResponse = JSON.parse(output);

    if (refinedResponse.needContext) {
      contextOutput = (await promptAndExecute(refinedResponse)).output;
      continue;
    }

    const { exitCode } = await promptAndExecute(refinedResponse);
    process.exit(exitCode === 0 ? 0 : 1);
  }
}

async function processMessage(message: string): Promise<void> {
  if (isExitCommand(message)) {
    console.log(chalk.yellow("\n👋 Goodbye!"));
    process.exit(0);
  }

  const spinner = ora(" Processing...").start();
  const output = await handleMessage(message);
  spinner.stop();

  const response = await refineCommand(JSON.parse(output));

  if (response.needContext) {
    await executeWithContext(response);
  } else {
    const { exitCode } = await executeCommand(response.command);
    process.exit(exitCode === 0 ? 0 : 1);
  }
}

export async function startChat(
  initialQuery?: string,
  explain?: boolean,
): Promise<void> {
  showExplanations = explain ?? false;

  try {
    await initializeConnection();
  } catch (error) {
    logger.error(error);
    console.log(chalk.red("Failed to initialize connection"));
    process.exit(1);
  }

  if (initialQuery) {
    await processMessage(initialQuery);
    process.exit(0);
  }

  while (true) {
    try {
      const message = await input({
        message: "",
        theme: { prefix: { idle: chalk.blue(">"), done: chalk.green("✔") } },
        validate: (input: string) => (input.trim() ? true : "Enter a command"),
      });

      await processMessage(message);
      process.exit(0);
    } catch (error) {
      if (error instanceof Error && error.name === "ExitPromptError") {
        console.log(chalk.yellow("\nGoodbye!"));
        process.exit(0);
      }

      logger.error(error);
    }
  }
}
