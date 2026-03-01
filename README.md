# Claude Code Changelog Telegram Bot

Monitors the [Claude Code CHANGELOG.md](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) hourly and pushes zh-TW summaries to Telegram via `claude -p`.

## How it works

```
cron (hourly)
  → fetch raw CHANGELOG.md from GitHub
  → diff against locally stored copy
  → if changed:
      → pipe diff to `claude -p` for zh-TW summary
      → send summary to Telegram
      → save new copy locally
```

## Setup

```bash
make setup   # prompts for Telegram bot token and chat ID
```

## Run

```bash
pnpm start   # or: make start
pnpm dev     # watch mode with auto-reload
```

## Requirements

- Node.js 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- Your Telegram chat ID
