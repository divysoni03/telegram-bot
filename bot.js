const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// Replace with your Telegram bot token
const token = TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const helpingVideo = path.join(__dirname, 'helpVideo.mp4');

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome! Send me a voice message, and I will convert it to a "girl\'s voice".');
});

// Handle /help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Commands:\n1. /start - Start the bot.\n2. /help - Get help with commands.\nSend a voice note, and I will convert it.');
    bot.sendVideo(chatId, helpingVideo);
});

// Handle voice messages
bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    try {
        bot.sendMessage(chatId, 'Processing your voice message...');
        const fileUrl = await bot.getFileLink(fileId);
        const inputFilePath = path.join(__dirname, 'input.ogg');
        const outputFilePath = path.join(__dirname, 'output.ogg');

        const response = await axios({
            url: fileUrl,
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(inputFilePath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            ffmpeg(inputFilePath)
                .audioFilters('asetrate=44100*1.6,aresample=44100,atempo=1.0')
                .audioFilters('afftdn')
                .save(outputFilePath)
                .on('end', async () => {
                    await bot.sendVoice(chatId, outputFilePath);
                    fs.unlinkSync(inputFilePath);
                    fs.unlinkSync(outputFilePath);
                })
                .on('error', (err) => {
                    console.error('Error during conversion:', err);
                    bot.sendMessage(chatId, 'Sorry, something went wrong during the conversion.');
                });
        });
    } catch (error) {
        console.error('Error processing voice message:', error);
        bot.sendMessage(chatId, 'Sorry, something went wrong.');
    }
});
