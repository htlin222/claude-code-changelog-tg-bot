.PHONY: setup start dev clean

setup:
	@echo "=== Claude Code Changelog Telegram Bot Setup ==="
	@echo ""
	@read -p "Telegram Bot Token: " token; \
	read -p "Telegram Chat ID: " chat_id; \
	echo "TELEGRAM_BOT_TOKEN=$$token" > .env; \
	echo "TELEGRAM_CHAT_ID=$$chat_id" >> .env; \
	echo ""; \
	echo ".env created successfully!"

start:
	pnpm start

dev:
	pnpm dev

clean:
	rip data/CHANGELOG.md 2>/dev/null || true
