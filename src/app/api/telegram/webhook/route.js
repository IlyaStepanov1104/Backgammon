import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Перенаправляем запрос на новый бот API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/bot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(await request.json())
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      console.error('Bot API error:', await response.text());
      return NextResponse.json({ error: 'Bot API error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  // GET запрос для проверки работоспособности вебхука
  return NextResponse.json({ status: 'Webhook is working' });
}
