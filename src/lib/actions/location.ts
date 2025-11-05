'use server';

import { headers } from 'next/headers';

export async function getUserCountry(): Promise<string> {
  try {
    // Get IP address from headers
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || '127.0.0.1';

    // For development, return a default country
    if (ip === '127.0.0.1' || ip === '::1') {
      return 'PL'; // Default to Poland for development
    }

    // Use a free IP geolocation service
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      cache: 'force-cache',
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (response.ok) {
      const data = await response.json();
      return data.countryCode || 'PL';
    }

    return 'PL'; // Default fallback
  } catch (error) {
    console.error('Error detecting user country:', error);
    return 'PL'; // Default fallback
  }
}
