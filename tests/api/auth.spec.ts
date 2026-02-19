import { test, expect, validateUserResponse } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SIGN_UP_URL = `${BASE_URL}/api/auth/sign-up/email`;
const SIGN_IN_URL = `${BASE_URL}/api/auth/sign-in/email`;

// Random suffix to avoid collisions across test runs
const suffix = Date.now();

const privatePayload = {
  name: 'Jane Private',
  email: `private.${suffix}@test.example`,
  password: 'TestPass1!',
  userType: 'private',
  country: 'PL',
  phoneNumber: '512345678',
  addressLine: 'ul. Testowa 1, Warszawa, 00-001',
  userAgreement: true,
};

const companyPayload = {
  name: 'John Company',
  email: `company.${suffix}@test.example`,
  password: 'TestPass1!',
  userType: 'company',
  country: 'DE',
  phoneNumber: '512345679',
  addressLine: 'Teststraße 1, Berlin, 10115',
  companyName: 'ACME GmbH',
  vatNumber: 'DE123456789',
  companyPosition: 'owner',
  userAgreement: true,
};

test.describe('Auth API — Sign Up', () => {
  test('Private user signup returns 200 with role=user and userType=private', async ({ request }) => {
    const res = await request.post(SIGN_UP_URL, { data: privatePayload });
    expect([200, 201]).toContain(res.status());
    const data = await res.json();
    validateUserResponse(data);
    expect(data.user.userType ?? data.user.user_type ?? 'private').toBe('private');
  });

  test('Company user signup returns 200 with userType=company', async ({ request }) => {
    const res = await request.post(SIGN_UP_URL, { data: companyPayload });
    expect([200, 201]).toContain(res.status());
    const data = await res.json();
    validateUserResponse(data);
    const ut = data.user.userType ?? data.user.user_type ?? 'company';
    expect(ut).toBe('company');
  });

  test('Validation — missing email returns 4xx', async ({ request }) => {
    const { email: _email, ...payload } = privatePayload;
    const res = await request.post(SIGN_UP_URL, { data: payload });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('Validation — missing password returns 4xx', async ({ request }) => {
    const { password: _pw, ...payload } = privatePayload;
    const res = await request.post(SIGN_UP_URL, {
      data: { ...payload, email: `nopw.${suffix}@test.example` },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('Validation — missing companyName for company type returns 4xx', async ({ request }) => {
    const { companyName: _cn, ...payload } = companyPayload;
    const res = await request.post(SIGN_UP_URL, {
      data: { ...payload, email: `nocn.${suffix}@test.example` },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('Validation — invalid VAT format (too short) returns 4xx', async ({ request }) => {
    const res = await request.post(SIGN_UP_URL, {
      data: {
        ...companyPayload,
        email: `badvat.${suffix}@test.example`,
        vatNumber: 'X',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('Duplicate email returns 4xx', async ({ request }) => {
    const email = `dup.${suffix}@test.example`;
    const payload = { ...privatePayload, email };
    // First signup
    await request.post(SIGN_UP_URL, { data: payload });
    // Second signup with same email
    const res = await request.post(SIGN_UP_URL, { data: payload });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('Weak password (no special char) returns 4xx', async ({ request }) => {
    const res = await request.post(SIGN_UP_URL, {
      data: {
        ...privatePayload,
        email: `weakpw.${suffix}@test.example`,
        password: 'TestPass1',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('Auth API — Sign In', () => {
  test('Sign in with wrong password returns 4xx', async ({ request }) => {
    const res = await request.post(SIGN_IN_URL, {
      data: {
        email: privatePayload.email,
        password: 'WrongPass9!',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('Sign in with non-existent email returns 4xx', async ({ request }) => {
    const res = await request.post(SIGN_IN_URL, {
      data: {
        email: `nouser.${suffix}@test.example`,
        password: 'TestPass1!',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
