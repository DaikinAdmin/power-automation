import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  if (!city) {
    return NextResponse.json({ error: 'City is required' }, { status: 400 });
  }

  try {
    // В тестовому режимі використовуємо sandbox URL, для проду - api-shipx-pl.easypack24.net
    const res = await fetch(`https://sandbox-api-shipx-pl.easypack24.net/v1/points?city=${encodeURIComponent(city)}&type=parcel_locker`, {
      headers: {
        'Authorization': `Bearer ${process.env.INPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch points from InPost');
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('InPost API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}