import OpenAI from "openai";
import TelegramBot from "node-telegram-bot-api";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!OPENAI_API_KEY || !TELEGRAM_TOKEN || !CHAT_ID) {
  console.error("Missing required environment variables: OPENAI_API_KEY, TELEGRAM_TOKEN, CHAT_ID");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const bot = new TelegramBot(TELEGRAM_TOKEN);

const SYSTEM_PROMPT = `You are an English learning assistant for Hebrew speakers.
Return a JSON object with this exact structure (no markdown, no code blocks, raw JSON only):
{
  "words": [
    { "english": "word", "hebrew": "תרגום", "example": "short example sentence" }
  ],
  "tip": "מוטיבציה קצרה וטיפ ללמידת אנגלית בעברית"
}
Rules:
- Exactly 10 words, ranging from B1 to C1 level
- Words should be practical and useful in daily life
- The tip must be written in Hebrew, short and motivating
- No markdown formatting in the response, only raw JSON`;

function formatMessage(data) {
  const today = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jerusalem",
  });

  const wordLines = data.words
    .map(
      (w, i) =>
        `${i + 1}. 🔤 *${w.english}* — ${w.hebrew}\n   _"${w.example}"_`
    )
    .join("\n\n");

  return (
    `📅 *${today}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🇬🇧 *10 מילים באנגלית להיום*\n\n` +
    `${wordLines}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 *טיפ היום:* ${data.tip}\n\n` +
    `🚀 בהצלחה בלמידה!`
  );
}

async function run() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: "Generate today's English words and tip." },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content;
    const data = JSON.parse(raw);

    if (!Array.isArray(data.words) || data.words.length !== 10 || !data.tip) {
      throw new Error(`Unexpected response structure: ${raw}`);
    }

    const message = formatMessage(data);

    await bot.sendMessage(CHAT_ID, message, { parse_mode: "Markdown" });
    console.log("Message sent successfully.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

run();
