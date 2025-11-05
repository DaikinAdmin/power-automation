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

export const SignupSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Minimum 2 characters are required" })
      .max(20, { message: "Maximum of 20 characters are allowed" }),
    email: z
      .string()
      .email({ message: "Invalid email address" })
      .min(1, { message: "Email is required" }),
    phoneNumber: z
      .string()
      .regex(RegExp(/^[1-9]\d{8}$/), { message: "Invalid phone number. Please enter a number in the format 999999999" }),
    countryCode:
      z.string().max(4),
    password: z
      .string()
      .min(8, "Hasło musi zawierać conajmniej 8 symboli")
      .regex(/[A-Z]/, "Hasło musi zawierać co najmniej 1 wielką literę")
      .regex(/[a-z]/, "Hasło musi zawierać co najmniej 1 małą literę")
      .regex(/[0-9]/, "Hasło musi zawierać co najmniej 1 cyfrę")
      .regex(/[!@#$&*]/, "Hasło musi zawierać co najmniej 1 symbol specjalny"),
    companyName: z
      .string()
      .min(2, { message: "Company name must be at least 2 characters long" })
      .max(25, { message: "Company name must be at most 25 characters long" })
      .optional(),
    companyWebpage: z
      .string()
      .min(5, { message: "Website must be at least 5 characters long" })
      .max(100, { message: "Website must be at most 100 characters long" })
      .regex(/^https?:\/\/[^\s$.?#].[^\s]*$/, { message: "Invalid website URL" })
      .optional(),
    companyRole: z
      .string()
      .min(2, { message: "Company role must be at least 2 characters long" })
      .max(100, { message: "Company role must be at most 100 characters long" })
      .optional(),
    role: z
      .enum(['USER', 'EMPLOYEE', 'ADMIN']),
    userAgreement: z.boolean()
  })