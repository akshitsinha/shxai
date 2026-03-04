# shxai

shxai is an AI-powered shell command assistant that translates natural language into shell commands with interactive refinement. Built on Cloudflare Workers AI, `shx` translates what you want into executable shell commands. Simply describe what you want to do in plain English, and `shx` will suggest the appropriate commands while learning from your preferences along the conversation.

![shxai](https://i.postimg.cc/NfTSWZjX/output.gif)

## Installation

```bash
npm install -g shxai
```

Once installed, use either `shxai` or `shx` command in your terminal.

## Usage

Start an interactive chat session:

```bash
shx
```

Or get a direct suggestion by providing your query:

```bash
shx list all files in the current directory, including hidden ones
```

### Refine suggestions

When a command is suggested, you can:

- **Press Enter** to execute the command as-is
- **Type additional context** to refine the suggestion before execution

This allows you to iteratively improve the command until it matches your exact needs.

## Configuration

| Variable       | Description                                                  | Default                                    |
| -------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `SHX_MODEL_ID` | Cloudflare Workers AI model ID to use for command generation | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |

See all available models at [developers.cloudflare.com/workers-ai/models](https://developers.cloudflare.com/workers-ai/models/).

Use it inline:

```bash
SHX_MODEL_ID="@cf/meta/llama-3.1-8b-instruct" shx list all running processes
```

Or set it permanently in your `~/.zshrc` or `~/.bashrc`:

```bash
export SHX_MODEL_ID="@cf/meta/llama-3.1-8b-instruct"
```

## License

MIT License. See [LICENSE.md](LICENSE.md) for details.
