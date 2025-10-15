# Shx Project Prompts

This document contains all the prompts and iterations I used to develop the ShellX CLI project, organized by development stage.

---

## Stage I: Setup Basic Project Structure

The foundation of the project. This stage establishes the basic CLI workflow and architecture. Note that while the LLM provided the initial implementation, significant amount code was manually reviewed and refined to align with my desired approach. The philosophy here is to use your own reasoning alongside AI assistance, LLMs are powerful, but they shouldn't be the sole decision-maker, almost ever.

### Prompts

1. Scaffold a CLI project called "shellx" using Node.js. Use the latest stable version of all possible libraries. Feel free to search npm and GitHub for the latest stable versions and their API usage. This project should have a modern and minimal chatbot-like interface. For now, output "nothing" each time as a placeholder response. Confirm your plan for the project before proceeding.
   - **Note:** I like to confirm the plan with the AI before implementation to ensure it correctly understands the requirements.

2. Prepare this project as an npm package. ShellX should have an alias `shx` when installed via npm. Search for the libraries you will be using for this project. Use the latest possible versions available, and read their API documentation online for proper usage.

3. Proceed with the implementation.

4. Add a path alias for `@/*` to map to `src/*`, and use those aliases for referencing local files in TypeScript.

5. There is no need to print logs to the console. Save logs to a temporary folder instead. Try using the latest stable version of Winston for logging. Feel free to look up its API online for usage. Each session should have its own log file stored in a temporary folder—no combined logs.

---

## Stage II: AI Integration and Schema Definition

This stage implements AI response retrieval functionality and establishes structured communication between client and server. Reading the documentation yourself is always useful. A basic response structure was implemented showing command suggestions and explanations at this stage. The `agents-starter` repository by `threepointone` served as a foundation, which I built upon personally, then used LLMs for refinement, and finally implemented a custom agents structure on top of it.

### Prompts

1. I have implemented a Cloudflare Workers AI endpoint in `src/worker.ts`. Convert the current chatbot implementation so that instead of sending a mock response, it will send the user query to the AI and output the response from the AI worker binding. Try using Workers AI via Vercel's AI SDK. Refer to the documentation at https://developers.cloudflare.com/workers-ai/configuration/ai-sdk/

2. Convert the CLI to accept input as `shx <your query>`, which will automatically start the app and forward the query. Otherwise, open the interactive interface as usual. This tool is designed for helping with shell commands—reflect that in the description in `cli.ts`. The help command should only display with `shx --help`.

3. Use Zod to create a proper schema for responses between the server and client side.
   - **Note:** A rough prototype using `generateText()` was implemented beforehand to help the AI understand the desired data flow. I'm now moving to `generatedObject()` with a custom zod schema.

---

## Stage III: Interactive Command Execution and Refinement Loop

The majority of core functionality was implemented by hand and honestly, it's been nice to use your own brain. The Cloudflare Durable Objects concept is pretty lovely for state and session management. Security is critical here, confirmation for command execution is required, and a refinement loop handles multi-step operations and errors. Every line of code after each prompt was carefully reviewed and adjusted personally. I like to trust the manual approach, I like to be pilot, and the AI be a copilot. As for session management, current implementation could be optimized, feedback very much welcome.

### Prompts

1. Make the interface for running commands minimal and intuitive. Use Chalk for styling.
   - **Note:** The AI initially went overboard with fancy formatting, the preference is for minimalism.

2. Use `generateObject` instead of `generateText` to obtain a structured response from the agent for client-side consumption. Instead of just showing the command and explanation, beautifully display the explanation of the command and then prompt the user to actually run it. This response should contain a field like `needContext`, which if `true`, will trigger a refinement loop: once the user confirms and executes the command, send the output back to the AI for a refined command and explanation. If `needContext` is `false`, simply prompt for execution confirmation and then exit the program.

3. Output the command's output as is. Make the CLI even more minimal, show only the brief explanation of the command, then display it like `> <command to execute>` on the next line, with a confirmation (Enter) to execute.

4. Fix the issue where the program wasn't exiting after successful command execution when `needContext` is `false`.

5. Add a `success` property to the response schema (true or false) indicating whether the AI successfully generated the command. If `false`, directly exit the program with an appropriate message; the `command` and `explanation` fields should be empty.

6. Fix the refinement process to work correctly. For example, if the prompt is "create a folder with the same name as the process using the most memory on my machine," this requires two commands. First, the AI responds with the command to identify the process (with `needContext=true`). After user confirmation and execution, send the output back to the AI. The AI then refines and suggests the second command (with `needContext=false`). Confirm and execute that command. Exit the program if the command succeeds and `needContext=false`; otherwise, loop back to the AI if there's an error.
   - **Note:** Specificity in requirements helps the AI understand the flow better.

7. Remove the separate command display and execution confirmation steps. Instead, prompt for execution in the same line where the suggested command is displayed. Use the `inquirer` prompts library for this.

8. Prepare the npm project for publication. The project builds with `npm run build`, producing a minified file at `dist/index.js` and an entry point at `bin/shellx.js`.

9. Create a README.md for this project. Keep it professional.

---
