#!/usr/bin/env node

import { setupCLI } from "@/cli";

async function main() {
  try {
    const program = setupCLI();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Graceful shutdown on SIGINT
process.on("SIGINT", () => {
  console.log("\n👋 Goodbye!");
  process.exit(0);
});

main();
