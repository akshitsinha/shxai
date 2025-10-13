import { createWorkersAI } from "workers-ai-provider";
import { generateObject } from "ai";
import {
  Agent,
  type Connection,
  type ConnectionContext,
  type WSMessage,
  routeAgentRequest,
} from "agents";
import { env } from "cloudflare:workers";
import { Ai } from "@cloudflare/workers-types";
import { validate as uuidValidate } from "uuid";
import { z } from "zod";

const workersai = createWorkersAI({ binding: env.AI });
const model = workersai("@cf/meta/llama-3-8b-instruct");

const responseSchema = z.object({
  command: z.string().describe("The shell command to execute"),
  explanation: z.string().describe("Explanation of what the command does"),
  needContext: z
    .boolean()
    .describe(
      "Whether the command needs to be executed to provide context for refinement"
    ),
  success: z
    .boolean()
    .describe("True if the AI could generate a valid command, false otherwise"),
});

export interface Env {
  AI: Ai;
}

interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ShellAgentState {
  messages: ConversationMessage[];
}

export class ShellAgent extends Agent<Env, ShellAgentState> {
  initialState: ShellAgentState = {
    messages: [],
  };

  async onConnect(connection: Connection, ctx: ConnectionContext) {
    console.log("Client connected:", connection.id);

    const url = new URL(ctx.request.url);
    const sessionId = url.pathname.split("/").pop();

    if (!sessionId || !uuidValidate(sessionId)) {
      console.error("Invalid session ID:", sessionId);
      connection.close(1008, "Invalid session ID");
      return;
    }
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== "string") return;

    try {
      const data = JSON.parse(message);

      if (data.type === "inquiry" && data.content) {
        const userMessage = data.content;

        const messagesWithUser: ConversationMessage[] = [
          ...this.state.messages,
          { role: "user" as const, content: userMessage },
        ];

        const result = await generateObject({
          model: model,
          schema: responseSchema,
          system: `You are a shell command assistant. Generate shell commands based on user requests.

Set needContext=true when:
- The command output is needed to generate a more accurate or complete command
- You need to check system state, file contents, or command output to refine the suggestion
- The user's request requires information that can only be obtained by running a command first

Set needContext=false when:
- You can provide the final command directly without needing execution feedback
- The command is straightforward and doesn't require validation or refinement`,
          messages: messagesWithUser,
        });

        const success = result.object.success ?? false;
        const response = {
          command: success ? result.object.command : "",
          explanation: success ? result.object.explanation : "",
          needContext: result.object.needContext ?? false,
          success,
        };

        console.log("Sent " + JSON.stringify(response));
        connection.send(JSON.stringify(response));

        this.setState({
          messages: [
            ...messagesWithUser,
            { role: "assistant" as const, content: JSON.stringify(response) },
          ],
        });
      } else if (data.type === "context" && data.commandOutput) {
        const contextMessage = `Command output:\n${data.commandOutput}\n\nBased on this output, provide a refined command and explanation.`;

        const messagesWithContext: ConversationMessage[] = [
          ...this.state.messages,
          { role: "user" as const, content: contextMessage },
        ];

        const result = await generateObject({
          model: model,
          schema: responseSchema,
          system: `You are a shell command assistant. The user has executed a command and provided the output.

Generate a refined command based on the command output.

Set needContext=true if you need to gather more information by executing another command.
Set needContext=false if you can now provide the final command.

If the output shows an error, analyze it and provide a corrected command with needContext=false so it can be retried.`,
          messages: messagesWithContext,
        });

        const success = result.object.success ?? false;
        const response = {
          command: success ? result.object.command || "" : "",
          explanation: success ? result.object.explanation || "" : "",
          needContext: result.object.needContext ?? false,
          success,
        };

        connection.send(JSON.stringify(response));

        this.setState({
          messages: [
            ...messagesWithContext,
            { role: "assistant" as const, content: JSON.stringify(response) },
          ],
        });
      }
    } catch (error) {
      console.error("Error processing message:", error);
      connection.send(
        JSON.stringify({
          error: "Failed to process message",
        })
      );
    }
  }

  async onClose(connection: Connection) {
    console.log("Client disconnected:", connection.id);
  }
}

export default {
  async fetch(request: any, env: Env, _ctx: ExecutionContext) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
