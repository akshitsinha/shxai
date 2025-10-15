# ShellX

A shell command assistant that translates natural language into shell commands with interactive refinement. Built with Cloudflare Workers AI for intelligent command generation and Cloudflare Durable Objects for persistent chat sessions, `shx` provides a seamless bridge between human intent and shell execution. Simply describe what you want to do in plain English, and `shx` will suggest the appropriate commands while learning from your preferences through interactive conversations.

## Installation

```bash
npm install -g ai-shellx
```

Once installed, use either `shellx` or `shx` command in your terminal.

## Usage

Start an interactive chat session:

```bash
shx
```

Or get a direct suggestion by providing your query:

```bash
shx list all files in the current directory, including hidden ones
```

## License

MIT License. See [LICENSE.md](LICENSE.md) for details.
