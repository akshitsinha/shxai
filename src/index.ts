import { setupCLI } from "@/cli";

const main = async () => {
  try {
    const program = setupCLI();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
};

main();
