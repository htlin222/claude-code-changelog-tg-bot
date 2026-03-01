import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "./config.js";

const MAX_MESSAGE_LENGTH = 4096;

function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_MESSAGE_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a newline boundary
    let splitIndex = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
    if (splitIndex === -1 || splitIndex < MAX_MESSAGE_LENGTH / 2) {
      splitIndex = MAX_MESSAGE_LENGTH;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex);
  }

  return chunks;
}

export async function sendMessage(text: string): Promise<void> {
  const escaped = escapeMarkdownV2(text);
  const chunks = splitMessage(escaped);

  for (const chunk of chunks) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: chunk,
        parse_mode: "MarkdownV2",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Telegram API error: ${res.status} ${body}`);
      // Retry without parse_mode as fallback
      const fallbackRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: text.slice(0, MAX_MESSAGE_LENGTH),
        }),
      });
      if (!fallbackRes.ok) {
        const fallbackBody = await fallbackRes.text();
        throw new Error(`Telegram API error: ${fallbackRes.status} ${fallbackBody}`);
      }
      return; // Fallback sent the raw text, stop chunked sending
    }
  }
}
