import { z } from "zod";

export const PasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number"),
});

const passwordRules = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
  .regex(/[0-9]/, "Password must contain at least 1 number");

// Server-side base fields — addressLine is already assembled
const baseFields = {
  name: z
    .string()
    .min(2, { message: "Minimum 2 characters are required" })
    .max(50, { message: "Maximum of 50 characters are allowed" }),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .min(1, { message: "Email is required" }),
  password: passwordRules,
  country: z.string().length(2, { message: "Please select a country" }),
  phoneNumber: z
    .string()
    .regex(RegExp(/^[1-9]\d{8}$/), {
      message:
        "Invalid phone number. Please enter a number in the format 999999999",
    }),
  addressLine: z
    .string()
    .min(5, { message: "Address must be at least 5 characters" })
    .max(200, { message: "Address must be at most 200 characters" }),
  userAgreement: z.boolean(),
};

// Client form base fields — split address fields for the UI
const baseFormFields = {
  name: baseFields.name,
  email: baseFields.email,
  password: baseFields.password,
  country: baseFields.country,
  phoneNumber: baseFields.phoneNumber,
  city: z
    .string()
    .min(1, { message: "City is required" })
    .max(100, { message: "City must be at most 100 characters" }),
  street: z
    .string()
    .min(2, { message: "Street and number are required" })
    .max(150, { message: "Street must be at most 150 characters" }),
  postalCode: z
    .string()
    .min(3, { message: "Postal code is required" })
    .max(20, { message: "Postal code must be at most 20 characters" }),
  userAgreement: baseFields.userAgreement,
};

// ── Server schemas (used by better-auth validator plugin) ──────────────────
export const PrivateSignupSchema = z.object({
  ...baseFields,
  // address is optional for private users
  addressLine: z.string().max(200),
  userType: z.literal("private"),
});

export const CompanySignupSchema = z.object({
  ...baseFields,
  userType: z.literal("company"),
  companyName: z
    .string()
    .min(2, { message: "Company name must be at least 2 characters long" })
    .max(100, { message: "Company name must be at most 100 characters long" }),
  vatNumber: z
    .string()
    .min(5, { message: "VAT number must be at least 5 characters" })
    .max(20, { message: "VAT number must be at most 20 characters" }),
  companyPosition: z.enum(["owner", "employee"], {
    message: "Please select your position",
  }),
});

export const SignupSchema = z.discriminatedUnion("userType", [
  PrivateSignupSchema,
  CompanySignupSchema,
]);

// ── Client form schemas (used by react-hook-form in the UI) ────────────────
export const PrivateSignupFormSchema = z.object({
  name: baseFormFields.name,
  email: baseFormFields.email,
  password: baseFormFields.password,
  country: baseFormFields.country,
  phoneNumber: baseFormFields.phoneNumber,
  // address is optional for private users
  city: z.string().max(100).optional(),
  street: z.string().max(150).optional(),
  postalCode: z.string().max(20).optional(),
  userAgreement: baseFormFields.userAgreement,
  userType: z.literal("private"),
});

export const CompanySignupFormSchema = z.object({
  ...baseFormFields,
  userType: z.literal("company"),
  companyName: z
    .string()
    .min(2, { message: "Company name must be at least 2 characters long" })
    .max(100, { message: "Company name must be at most 100 characters long" }),
  vatNumber: z
    .string()
    .min(5, { message: "VAT number must be at least 5 characters" })
    .max(20, { message: "VAT number must be at most 20 characters" }),
  companyPosition: z.enum(["owner", "employee"], {
    message: "Please select your position",
  }),
});

export const SignupFormSchema = z.discriminatedUnion("userType", [
  PrivateSignupFormSchema,
  CompanySignupFormSchema,
]);
