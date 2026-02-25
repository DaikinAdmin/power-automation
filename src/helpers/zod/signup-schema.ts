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
