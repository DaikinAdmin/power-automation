import { z } from "zod";

export const PasswordSchema = z.object({
  password: z
      .string()
      .min(8, "Hasło musi zawierać conajmniej 8 symboli")
      .regex(/[A-Z]/, "Hasło musi zawierać co najmniej 1 wielką literę")
      .regex(/[a-z]/, "Hasło musi zawierać co najmniej 1 małą literę")
      .regex(/[0-9]/, "Hasło musi zawierać co najmniej 1 cyfrę")
      .regex(/[!@#$&*]/, "Hasło musi zawierać co najmniej 1 symbol specjalny"),
});

const passwordRules = z
  .string()
  .min(8, "Hasło musi zawierać conajmniej 8 symboli")
  .regex(/[A-Z]/, "Hasło musi zawierać co najmniej 1 wielką literę")
  .regex(/[a-z]/, "Hasło musi zawierać co najmniej 1 małą literę")
  .regex(/[0-9]/, "Hasło musi zawierać co najmniej 1 cyfrę")
  .regex(/[!@#$&*]/, "Hasło musi zawierać co najmniej 1 symbol specjalny");

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
    .regex(RegExp(/^[1-9]\d{8}$/), { message: "Invalid phone number. Please enter a number in the format 999999999" }),
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
  userType: z.literal('private'),
});

export const CompanySignupSchema = z.object({
  ...baseFields,
  userType: z.literal('company'),
  companyName: z
    .string()
    .min(2, { message: "Company name must be at least 2 characters long" })
    .max(100, { message: "Company name must be at most 100 characters long" }),
  vatNumber: z
    .string()
    .min(5, { message: "VAT number must be at least 5 characters" })
    .max(20, { message: "VAT number must be at most 20 characters" }),
  companyPosition: z.enum(['owner', 'employee'], { message: "Please select your position" }),
});

export const SignupSchema = z.discriminatedUnion('userType', [
  PrivateSignupSchema,
  CompanySignupSchema,
]);

// ── Client form schemas (used by react-hook-form in the UI) ────────────────
export const PrivateSignupFormSchema = z.object({
  ...baseFormFields,
  userType: z.literal('private'),
});

export const CompanySignupFormSchema = z.object({
  ...baseFormFields,
  userType: z.literal('company'),
  companyName: z
    .string()
    .min(2, { message: "Company name must be at least 2 characters long" })
    .max(100, { message: "Company name must be at most 100 characters long" }),
  vatNumber: z
    .string()
    .min(5, { message: "VAT number must be at least 5 characters" })
    .max(20, { message: "VAT number must be at most 20 characters" }),
  companyPosition: z.enum(['owner', 'employee'], { message: "Please select your position" }),
});

export const SignupFormSchema = z.discriminatedUnion('userType', [
  PrivateSignupFormSchema,
  CompanySignupFormSchema,
]);
