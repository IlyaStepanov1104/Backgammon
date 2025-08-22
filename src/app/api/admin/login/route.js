import { NextResponse } from 'next/server';

const LOGIN = process.env.ADMIN_USERNAME;
const PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    
    // Проверяем учетные данные администратора
    if (username !== LOGIN || password !== PASSWORD) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: true, 
      admin: {
        username: username
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
