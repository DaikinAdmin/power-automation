// auth.ts
import { countryCodes } from "@/helpers/country-codes";
import { email } from "@/helpers/email/resend";
import { ForgotPasswordSchema } from "@/helpers/zod/forgot-password-schema";
import SignInSchema from "@/helpers/zod/login-schema";
import { PasswordSchema, SignupSchema } from "@/helpers/zod/signup-schema";
import { twoFactorSchema } from "@/helpers/zod/two-factor-schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin as adminPlugin,
  customSession,
  openAPI,
  twoFactor
} from "better-auth/plugins";
import { validator, StandardAdapter } from "validation-better-auth";
import { roleSignupPlugin } from "./role-signup-plugin";
import { nextCookies } from "better-auth/next-js";
import { ac, user, employee, admin } from "./permissions";
import { db } from "@/db";
import { 
  user as userTable, 
  session as sessionTable, 
  account as accountTable, 
  verification as verificationTable,
  twoFactor as twoFactorTable 
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // don't allow user to set role
      },
      phoneNumber: {
        type: "string",
        required: true,
        defaultValue: "555-555-555",
      },
      userAgreement: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      countryCode: {
        type: "string",
        required: true,
        defaultValue: countryCodes[0].code,
      },
      companyName: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      userType: {
        type: "string",
        required: true,
        defaultValue: "private",
      },
      vatNumber: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      addressLine: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      country: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      companyPosition: {
        type: "string",
        required: false,
        defaultValue: "",
      },
    },
  },
  appName: "power-automation",
  trustedOrigins: [
    "http://localhost:3000",
    // "http://localhost:3030",
    // "http://217.60.20.130", // VPS IP for temporary access
    process.env.BASE_URL || "",
    process.env.BETTER_AUTH_URL || "",
    process.env.NEXT_PUBLIC_APP_URL || "",
  ].filter(Boolean), // Remove empty strings
  advanced: {
    disableCSRFCheck: false,
    // Only use secure cookies when actually using HTTPS
    useSecureCookies: process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_URL?.startsWith("https"),
    generateSessionId: () => {
      return crypto.randomUUID();
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: userTable,
      session: sessionTable,
      account: accountTable,
      verification: verificationTable,
      twoFactor: twoFactorTable,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 20,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 3600 * 24,
    sendResetPassword: async ({ user, url, token }, request) => {
      await email.sendMail({
        from: process.env.MAIL_USER,
        // TODO once we will go to prod, change to: user.email,
        to: user.email,
        subject: "Reset your password",
        html: `Click the link to reset your password: ${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await email.sendMail({
        from: process.env.MAIL_USER,
        to: user.email,
        subject: "Email Verification",
        html: `Click the link to verify your email: ${url}`,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60 * 12,
    freshAge: 60 * 60 * 1,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // Cache duration in seconds
    }
  },
  plugins: [
    roleSignupPlugin(),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          await email.sendMail({
            from: process.env.MAIL_USER,
            to: user.email,
            subject: "Two Factor",
            html: `Your OTP is ${otp}`,
          });
        },
      },
      skipVerificationOnEnable: true,
    }),
    validator([
      { path: "/sign-up/email", adapter: StandardAdapter(SignupSchema) },
      { path: "/sign-in/email", adapter: StandardAdapter(SignInSchema) },
      { path: "/two-factor/enable", adapter: StandardAdapter(PasswordSchema) },
      { path: "/two-factor/disable", adapter: StandardAdapter(PasswordSchema) },
      { path: "/two-factor/verify-otp", adapter: StandardAdapter(twoFactorSchema) },
      { path: "/forgot-password", adapter: StandardAdapter(ForgotPasswordSchema) },
    ]),
    nextCookies(),
    adminPlugin({
      defaultRole: "user",
      impersonationSessionDuration: 60 * 60 * 24,
      defaultBanReason: "Spamming",
      ac,
      roles: {
        admin,
        user,
        employee
      },
      allowedRoles: ["user", "employee", "admin"],
      adminRoles: ["admin"],
      adminUserIds: [process.env.ADMIN_USER || ""]
    }),
    openAPI(),
    customSession(async ({ user, session }) => {
      const [response] = await db
        .select({
          role: userTable.role,
          twoFactorEnabled: userTable.twoFactorEnabled
        })
        .from(userTable)
        .where(eq(userTable.id, session.userId));

      const role = response?.role || "user";
      const twoFactorEnabled = response?.twoFactorEnabled || false;
      
      return {
        user: {
          ...user,
          role,
          twoFactorEnabled
        },
        session
      }
    }),
  ],
});
