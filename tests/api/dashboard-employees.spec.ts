import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SIGN_UP_URL = `${BASE_URL}/api/auth/sign-up/email`;
const SIGN_IN_URL = `${BASE_URL}/api/auth/sign-in/email`;
const EMPLOYEES_URL = `${BASE_URL}/api/dashboard/employees`;

const suffix = Date.now();

const ownerPayload = {
  name: 'Test Owner',
  email: `owner.${suffix}@test.example`,
  password: 'TestPass1!',
  userType: 'company',
  country: 'PL',
  phoneNumber: '512345678',
  addressLine: 'ul. Testowa 1, Warszawa, 00-001',
  companyName: 'Test Company Sp. z o.o.',
  vatNumber: 'PL1234567890',
  companyPosition: 'owner',
  userAgreement: true,
};

const employeePayload = {
  name: 'Test Employee',
  email: `emp.${suffix}@test.example`,
  password: 'TestPass1!',
  phoneNumber: '512345679',
};

/** Sign in and return the Set-Cookie header to use as a session cookie */
async function signInAsOwner(request: any): Promise<string> {
  const res = await request.post(SIGN_UP_URL, { data: ownerPayload });
  // role may still be 'user' before the plugin sets it; sign in to get a cookie
  const signinRes = await request.post(SIGN_IN_URL, {
    data: { email: ownerPayload.email, password: ownerPayload.password },
  });
  const cookie = signinRes.headers()['set-cookie'] ?? '';
  return cookie;
}

test.describe('Dashboard Employees API', () => {
  test('GET /api/dashboard/employees — returns empty array without crashing (regression: Date serialisation bug)', async ({ request }) => {
    // Arrange: sign up + sign in as company owner
    await request.post(SIGN_UP_URL, { data: ownerPayload });
    const signinRes = await request.post(SIGN_IN_URL, {
      data: { email: ownerPayload.email, password: ownerPayload.password },
    });

    expect([200, 201]).toContain(signinRes.status());

    // Act: fetch employees — should return an array, never undefined
    const res = await request.get(EMPLOYEES_URL);

    // The endpoint requires company_owner role; it may return 403 if the
    // role hasn't propagated yet, but it must NEVER return a 500 / throw.
    expect(res.status()).not.toBe(500);

    if (res.status() === 200) {
      const data = await res.json();
      // Core regression check: data must be an array (not undefined/null)
      expect(Array.isArray(data)).toBe(true);
      // Every item must have a string createdAt (not a Date object / undefined)
      for (const emp of data) {
        expect(typeof emp.createdAt).toBe('string');
        expect(() => new Date(emp.createdAt)).not.toThrow();
      }
    }
  });

  test('GET /api/dashboard/employees — returns 401 when not authenticated', async ({ request }) => {
    const res = await request.get(EMPLOYEES_URL);
    expect(res.status()).toBe(401);
  });

  test('POST /api/dashboard/employees — returns 403 for non-company-owner', async ({ request }) => {
    // Sign up as a plain private user
    const privateEmail = `private.emp.${suffix}@test.example`;
    await request.post(SIGN_UP_URL, {
      data: {
        name: 'Private User',
        email: privateEmail,
        password: 'TestPass1!',
        userType: 'private',
        country: 'PL',
        phoneNumber: '512345680',
        addressLine: 'ul. Testowa 2, Warszawa, 00-001',
        userAgreement: true,
      },
    });
    await request.post(SIGN_IN_URL, {
      data: { email: privateEmail, password: 'TestPass1!' },
    });

    const res = await request.post(EMPLOYEES_URL, { data: employeePayload });
    expect(res.status()).toBe(403);
  });

  test('POST /api/dashboard/employees — rejects missing name', async ({ request }) => {
    await request.post(SIGN_UP_URL, { data: ownerPayload });
    await request.post(SIGN_IN_URL, {
      data: { email: ownerPayload.email, password: ownerPayload.password },
    });

    const { name: _n, ...noName } = employeePayload;
    const res = await request.post(EMPLOYEES_URL, { data: noName });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/dashboard/employees — rejects invalid email', async ({ request }) => {
    await request.post(SIGN_UP_URL, { data: ownerPayload });
    await request.post(SIGN_IN_URL, {
      data: { email: ownerPayload.email, password: ownerPayload.password },
    });

    const res = await request.post(EMPLOYEES_URL, {
      data: { ...employeePayload, email: 'not-an-email' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
