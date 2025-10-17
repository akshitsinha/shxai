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
      "Set true when command execution output is needed to provide a better suggestion (e.g., checking system state, file contents, or validation). Set false when you can provide the final command directly without execution feedback.",
    ),
  success: z.boolean().describe("True if a valid command was generated"),
});

const SYSTEM_PROMPT =
  "You are a shell command assistant. Generate shell commands based on user requests.";

const MESSAGE_FORMATTERS: Record<string, (data: any) => string> = {
  inquiry: (data) => `[User OS: ${data.os}]\n\n${data.content}`,
  context: (data) =>
    `Command output:\n${data.commandOutput}\n\nProvide a refined command based on this output.`,
  refine: (data) =>
    `Additional context: ${data.additionalContext}\n\nRefine the command accordingly.`,
};

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

  private async generateCommand(
    messages: ConversationMessage[],
    systemPrompt: string,
  ) {
    const result = await generateObject({
      model,
      schema: responseSchema,
      system: systemPrompt,
      messages,
    });

    const success = result.object.success ?? false;
    return {
      command: success ? result.object.command || "" : "",
      explanation: success ? result.object.explanation || "" : "",
      needContext: result.object.needContext ?? false,
      success,
    };
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== "string") return;

    try {
      const data = JSON.parse(message);
      const { type } = data;

      if (!type || !MESSAGE_FORMATTERS[type]) {
        return;
      }

      const userContent = MESSAGE_FORMATTERS[type](data);

      const messages: ConversationMessage[] = [
        ...this.state.messages,
        { role: "user", content: userContent },
      ];

      const response = await this.generateCommand(messages, SYSTEM_PROMPT);

      console.log("Sent " + JSON.stringify(response));
      connection.send(JSON.stringify(response));

      this.setState({
        messages: [
          ...messages,
          { role: "assistant", content: JSON.stringify(response) },
        ],
      });
    } catch (error) {
      console.error("Error processing message:", error);
      connection.send(JSON.stringify({ error: "Failed to process message" }));
    }
  }

  async onClose(connection: Connection) {
    console.log("Client disconnected:", connection.id);
  }
}

export default {
  async fetch(request: any, env: Env, _ctx: ExecutionContext) {
    const agentResponse = await routeAgentRequest(request, env);

    if (agentResponse) {
      return agentResponse;
    }

    return Response.redirect("https://npmjs.com/package/ai-shellx", 301);
  },
} satisfies ExportedHandler<Env>;
