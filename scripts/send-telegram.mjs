// Sends a file to Telegram as one or more HTML messages. Messages are split on lines containing only "---".
// Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID, set as environment variables on the cloud environment.
// Usage: node scripts/send-telegram.mjs <file>
import { readFileSync } from "node:fs";
import { splitMessages } from "./lib.mjs";

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = process.env;
if (!token || !chatId) {
  console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set on this environment.");
  process.exit(1);
}

const chunks = splitMessages(readFileSync(process.argv[2], "utf8"));
for (const text of chunks) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const body = await res.json();
  if (!body.ok) {
    console.error(`Telegram rejected a message: ${body.description}`);
    process.exit(1);
  }
}
console.log(`Sent ${chunks.length} message(s) to Telegram.`);
