export interface Config {
  workerUrl: string;
}

export function getConfig(): Config {
  const env = process.env.NODE_ENV;
  const workerUrl =
    process.env.WORKER_URL ||
    (env === "development"
      ? "http://localhost:8787"
      : "https://cf-shellx.asinha.workers.dev/");

  return { workerUrl };
}
