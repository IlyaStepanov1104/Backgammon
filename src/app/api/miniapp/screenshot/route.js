import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

let browser = null;

async function getBrowser() {
    if (!browser || !browser.isConnected()) {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });
    }
    return browser;
}

// Отправка фото через Telegram API напрямую (без импорта бота)
async function sendTelegramPhoto(chatId, photoBuffer, caption) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', new Blob([photoBuffer], { type: 'image/png' }), 'screenshot.png');
    if (caption) {
        formData.append('caption', caption);
    }

    const response = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
            method: 'POST',
            body: formData
        }
    );

    const result = await response.json();
    if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
    }
    return result;
}

// POST - создание и отправка скриншота карточки через Telegram
export async function POST(request) {
    try {
        const { cardId, telegramId } = await request.json();

        if (!cardId || !telegramId) {
            return NextResponse.json({ error: 'Card ID and Telegram ID are required' }, { status: 400 });
        }

        const browser = await getBrowser();
        const page = await browser.newPage();

        try {
            // Устанавливаем размер viewport
            await page.setViewport({ width: 360, height: 120000 });

            // Переходим на страницу скриншота
            const screenshotUrl = `http://localhost:3000/screenshot?cardId=${cardId}`;
            await page.goto(screenshotUrl, {
                waitUntil: 'networkidle0',
                timeout: 10000
            });

            // Ждем, пока элемент загрузится
            await page.waitForSelector('#screenshot-card');

            // Находим элемент карточки
            const element = await page.$('#screenshot-card');

            if (!element) {
                throw new Error('Screenshot element not found');
            }

            // Делаем скриншот только карточки
            const screenshotBuffer = await element.screenshot({ type: 'png' });

            // Отправляем скриншот через Telegram API напрямую
            await sendTelegramPhoto(telegramId, screenshotBuffer, 'Скриншот карточки');

            return NextResponse.json({
                success: true,
                message: 'Screenshot sent to Telegram'
            });

        } finally {
            await page.close();
        }

    } catch (error) {
        console.error('Screenshot generation error:', error);
        return NextResponse.json({
            error: 'Failed to send screenshot',
            details: error.message
        }, { status: 500 });
    }
}