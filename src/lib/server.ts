import { createWorkersAI } from "workers-ai-provider";
import { generateText, Output } from "ai";
import {
  Agent,
  type Connection,
  type ConnectionContext,
  type WSMessage,
  routeAgentRequest,
} from "agents";
import { validate as uuidValidate } from "uuid";
import { z } from "zod";

const schema = z.object({
  command: z.string(),
  needContext: z.boolean(),
  success: z.boolean(),
});

const SYSTEM_PROMPT =
  "You are a shell command assistant. Generate shell commands based on user requests. Set needContext=true ONLY when you must execute a prerequisite command to gather information before providing the final command. For most queries, provide the final command directly with needContext=false.";

const formatMessage = (type: string, data: Record<string, string>): string => {
  switch (type) {
    case "inquiry":
      return `[User OS: ${data.os}]\n\n${data.content}`;
    case "context":
      return `Command output:\n${data.commandOutput}\n\nProvide a refined command based on this output.`;
    case "refine":
      return `Additional context: ${data.additionalContext}\n\nRefine the command accordingly.`;
    default:
      return "";
  }
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Response {
  command: string;
  needContext: boolean;
  success: boolean;
}

interface State {
  messages: Message[];
}

export class ShellAgent extends Agent<Env, State> {
  initialState: State = { messages: [] };

  async onConnect(connection: Connection, ctx: ConnectionContext) {
    const sessionId = new URL(ctx.request.url).pathname.split("/").pop();

    if (!sessionId || !uuidValidate(sessionId)) {
      connection.close(1008, "Invalid session ID");
    }
  }

  private async generateCommand(messages: Message[]): Promise<Response> {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const model = workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    const { output } = await generateText({
      model,
      output: Output.object({ schema }),
      system: SYSTEM_PROMPT,
      messages,
    });

    return {
      command: output.success ? output.command : "",
      needContext: output.needContext ?? false,
      success: output.success ?? false,
    };
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== "string") return;

    try {
      const data = JSON.parse(message);
      const userContent = formatMessage(data.type, data);

      if (!userContent) return;

      const messages: Message[] = [
        ...this.state.messages,
        { role: "user", content: userContent },
      ];

      const response = await this.generateCommand(messages);

      connection.send(JSON.stringify(response));

      this.setState({
        messages: [
          ...messages,
          { role: "assistant", content: JSON.stringify(response) },
        ],
      });
    } catch (error) {
      connection.send(JSON.stringify({ error: "Failed to process message" }));
    }
  }

  async onClose(_connection: Connection) {}
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const agentResponse = await routeAgentRequest(request, env);
    return (
      agentResponse ?? Response.redirect("https://npmjs.com/package/shxai", 301)
    );
  },
} satisfies ExportedHandler<Env>;
