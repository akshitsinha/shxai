export interface Config {
  workerUrl: string;
}

export function getConfig(): Config {
  const workerUrl =
    process.env.NODE_ENV === "production"
      ? process.env.WORKER_URL || "https://cf-shellx.asinha.workers.dev/"
      : process.env.WORKER_URL || "http://localhost:8787";

  return {
    workerUrl,
  };
}
