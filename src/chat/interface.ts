import { input } from "@inquirer/prompts";
import ora from "ora";
import chalk from "chalk";
import {
  handleMessage,
  sendContextMessage,
  initializeConnection,
} from "@/chat/handlers";
import { logger } from "@/utils/logger";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface CommandResponse {
  command: string;
  explanation: string;
  needContext: boolean;
  success: boolean;
}

function isExitCommand(message: string): boolean {
  return ["exit", "quit", "q", "bye"].includes(message.trim().toLowerCase());
}

async function promptAndExecute(
  response: CommandResponse
): Promise<{ output: string; exitCode: number }> {
  if (!response.success) {
    console.log(chalk.red("Could not generate a valid command."));
    process.exit(1);
  }

  console.log(chalk.gray(response.explanation));
  await input({
    message: chalk.green(`${response.command}`),
    theme: { 
      prefix: { 
        idle: chalk.blue(">"), 
        done: chalk.green("✔") 
      } 
    },
  });

  return executeCommand(response.command);
}

async function executeCommand(
  command: string
): Promise<{ output: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execAsync(command);
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

async function processMessage(message: string): Promise<void> {
  if (isExitCommand(message)) {
    console.log(chalk.yellow("\n👋 Goodbye!"));
    process.exit(0);
  }

  const spinner = ora("Processing...").start();
  const output = await handleMessage(message);
  spinner.stop();

  const response: CommandResponse = JSON.parse(output);

  if (response.needContext) {
    let contextOutput = (await promptAndExecute(response)).output;

    while (true) {
      const refineSpinner = ora("Refining...").start();
      const refinedOutput = await sendContextMessage(contextOutput);
      refineSpinner.stop();

      const refinedResponse: CommandResponse = JSON.parse(refinedOutput);

      if (refinedResponse.needContext) {
        contextOutput = (await promptAndExecute(refinedResponse)).output;
        continue;
      }

      const { exitCode, output: execOutput } =
        await promptAndExecute(refinedResponse);

      if (exitCode === 0) {
        process.exit(0);
      }

      contextOutput = execOutput;
    }
  } else {
    const { exitCode } = await promptAndExecute(response);
    process.exit(exitCode === 0 ? 0 : 1);
  }
}

export async function startChat(initialQuery?: string): Promise<void> {
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
        console.log(chalk.yellow("\n👋 Goodbye!"));
        process.exit(0);
      }
      logger.error(error);
    }
  }
}
