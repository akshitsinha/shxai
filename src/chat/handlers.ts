import { getConfig } from "@/utils/config";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ServerResponse {
  command: string;
  needContext: boolean;
  success: boolean;
  messages: Message[];
}

let messages: Message[] = [];

export const connect = async (): Promise<void> => {
  const response = await fetch(getConfig().workerUrl).catch(() => {
    throw new Error(
      "Could not reach the server. Check your internet connection.",
    );
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Server returned unexpected status: ${response.status}`);
  }
};

export const sendMessage = async (
  type: string,
  payload: Record<string, string>,
): Promise<string> => {
  const response = await fetch(getConfig().workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      messages,
      modelId: process.env.SHX_MODEL_ID,
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const data = (await response.json()) as ServerResponse;
  messages = data.messages;

  return JSON.stringify({
    command: data.command,
    needContext: data.needContext,
    success: data.success,
  });
};

export const getOSInfo = () => {
  const osMap: Record<string, string> = {
    darwin: "macOS",
    linux: "Linux",
    win32: "Windows",
  };
  return `${osMap[process.platform] || process.platform} (shell: ${process.env.SHELL || "unknown"})`;
};
