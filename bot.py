#!/usr/bin/env python3
"""
Sidor Avoda Maor — Telegram Bot
Receives work schedule screenshots, parses shifts for מאור פורמן,
and creates Google Calendar events after user confirmation.
"""

import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)

from vision_parser import parse_schedule_image, format_shifts_for_confirmation
from calendar_client import create_all_shifts

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.environ["TELEGRAM_TOKEN"]

# In-memory store: chat_id → pending shifts list
pending_shifts: dict[int, list[dict]] = {}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "שלום! אני הבוט של מאור לסידור עבודה 💼\n\n"
        "שלח לי תמונה של הסידור עבודה ואני אזהה את המשמרות שלך "
        "ואוסיף אותן ל-Google Calendar."
    )


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    await update.message.reply_text("מעבד את הסידור... ⏳")

    try:
        photo = update.message.photo[-1]
        file = await context.bot.get_file(photo.file_id)
        image_bytes = await file.download_as_bytearray()

        shifts = parse_schedule_image(bytes(image_bytes))

        if not shifts:
            await update.message.reply_text(
                "לא מצאתי משמרות עבור מאור פורמן בתמונה זו. "
                "נסה לשלוח תמונה ברורה יותר."
            )
            return

        pending_shifts[chat_id] = shifts
        confirmation_text = format_shifts_for_confirmation(shifts)

        keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("✅ אישור", callback_data="confirm"),
                InlineKeyboardButton("❌ ביטול", callback_data="cancel"),
            ]
        ])

        await update.message.reply_text(confirmation_text, reply_markup=keyboard)

    except Exception as e:
        logger.error(f"Error processing photo: {e}", exc_info=True)
        await update.message.reply_text(
            f"שגיאה בעיבוד התמונה: {e}\nנסה שנית."
        )


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    chat_id = update.effective_chat.id
    action = query.data

    if action == "cancel":
        pending_shifts.pop(chat_id, None)
        await query.edit_message_text("ביטול. לא הוכנס כלום ליומן.")
        return

    if action == "confirm":
        shifts = pending_shifts.pop(chat_id, None)
        if not shifts:
            await query.edit_message_text("לא נמצאו משמרות לאישור.")
            return

        await query.edit_message_text("מכניס משמרות ליומן... ⏳")

        try:
            links = create_all_shifts(shifts)
            lines = ["✅ המשמרות נוספו ל-Google Calendar:\n"]
            for shift, link in zip(shifts, links):
                lines.append(
                    f"📅 {shift['date']} — {shift['location']}, "
                    f"{shift['role']}, {shift['shift_type']} "
                    f"({shift['start_time']}–{shift['end_time']})"
                )
            await context.bot.send_message(chat_id=chat_id, text="\n".join(lines))

        except Exception as e:
            logger.error(f"Calendar error: {e}", exc_info=True)
            await context.bot.send_message(
                chat_id=chat_id,
                text=f"שגיאה בהוספה ליומן: {e}"
            )


def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(CallbackQueryHandler(handle_callback))

    logger.info("Bot is running...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
