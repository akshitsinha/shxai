import { createWorkersAI } from "workers-ai-provider";
import { generateText, Output } from "ai";
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
  role: "user" | "assistant";
  content: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return new Response(null, { status: 204 });
    }

    if (request.method !== "POST") {
      return Response.redirect("https://npmjs.com/package/shxai", 301);
    }

    try {
      const data = (await request.json()) as Record<string, unknown>;
      const { type, messages = [], modelId, ...payload } = data;

      const userContent = formatMessage(
        type as string,
        payload as Record<string, string>,
      );
      if (!userContent) {
        return Response.json(
          { error: "Invalid message type" },
          { status: 400 },
        );
      }

      const allMessages: Message[] = [
        ...(messages as Message[]),
        { role: "user", content: userContent },
      ];

      const workersai = createWorkersAI({ binding: env.AI });
      const model = workersai(
        (modelId as string) || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      );
      const { output } = await generateText({
        model,
        output: Output.object({ schema }),
        system: SYSTEM_PROMPT,
        messages: allMessages,
      });

      return Response.json({
        command: output.success ? output.command : "",
        needContext: output.needContext ?? false,
        success: output.success ?? false,
        messages: [
          ...allMessages,
          { role: "assistant", content: JSON.stringify(output) },
        ],
      });
    } catch {
      return Response.json(
        { error: "Failed to process request" },
        { status: 500 },
      );
    }
  },
} satisfies ExportedHandler<Env>;
