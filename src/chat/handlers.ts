import { AgentClient } from "agents/client";
import { getConfig } from "@/utils/config";
import { v4 as uuidv4 } from "uuid";

const client = new AgentClient({
  host: getConfig().workerUrl,
  agent: "shell-agent",
  name: uuidv4(),
});

function isSystemMessage(data: any): boolean {
  return data.type === "cf_agent_state" || data.type === "cf_agent_mcp_servers";
}

function waitForSystemMessage(timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout"));
    }, timeoutMs);

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (!isSystemMessage(data)) return;
      } catch {
        return;
      }

      cleanup();
      resolve(event.data);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      client.removeEventListener("message", handler);
    };

    client.addEventListener("message", handler);
  });
}

function waitForUserMessage(timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout"));
    }, timeoutMs);

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (isSystemMessage(data)) return;
      } catch {}

      cleanup();
      resolve(event.data);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      client.removeEventListener("message", handler);
    };

    client.addEventListener("message", handler);
  });
}

export async function initializeConnection(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (client.readyState === WebSocket.OPEN) return resolve();

    const timeout = setTimeout(
      () => reject(new Error("Connection timeout")),
      5000
    );

    client.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );

    client.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error("Connection failed"));
      },
      { once: true }
    );
  });

  await waitForSystemMessage(5000);
}

export async function handleMessage(message: string): Promise<string> {
  client.send(JSON.stringify({ type: "inquiry", content: message }));
  return waitForUserMessage(30000);
}

export async function sendContextMessage(
  commandOutput: string
): Promise<string> {
  client.send(JSON.stringify({ type: "context", commandOutput }));
  return waitForUserMessage(30000);
}
