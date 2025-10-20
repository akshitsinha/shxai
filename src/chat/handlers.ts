import { AgentClient } from "agents/client";
import { getConfig } from "@/utils/config";
import { v4 as uuidv4 } from "uuid";

const client = new AgentClient({
  host: getConfig().workerUrl,
  agent: "shell-agent",
  name: uuidv4(),
});

const isSystemMessage = (type: string) =>
  type === "cf_agent_state" || type === "cf_agent_mcp_servers";

const waitForMessage = (timeoutMs: number, filter: (type: string) => boolean) =>
  new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout"));
    }, timeoutMs);

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (!filter(data.type)) return;
        cleanup();
        resolve(event.data);
      } catch {}
    };

    const cleanup = () => {
      clearTimeout(timeout);
      client.removeEventListener("message", handler);
    };

    client.addEventListener("message", handler);
  });

export const initializeConnection = async () => {
  await new Promise<void>((resolve, reject) => {
    if (client.readyState === WebSocket.OPEN) return resolve();

    const timeout = setTimeout(
      () => reject(new Error("Connection timeout")),
      5000,
    );

    client.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );

    client.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error("Connection failed"));
      },
      { once: true },
    );
  });

  await waitForMessage(5000, isSystemMessage);
};

export const sendMessage = (type: string, payload: Record<string, string>) => {
  client.send(JSON.stringify({ type, ...payload }));
  return waitForMessage(30000, (type) => !isSystemMessage(type));
};

export const getOSInfo = () => {
  const osMap: Record<string, string> = {
    darwin: "macOS",
    linux: "Linux",
    win32: "Windows",
  };
  return `${osMap[process.platform] || process.platform} (shell: ${process.env.SHELL || "unknown"})`;
};
