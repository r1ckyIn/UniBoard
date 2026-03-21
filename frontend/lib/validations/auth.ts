import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .refine((e) => e.endsWith("@uni.sydney.edu.au"), {
      message: "Please use your USYD student email (@uni.sydney.edu.au)",
    }),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    displayName: z.string().min(1, "Display name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format")
      .refine((e) => e.endsWith("@uni.sydney.edu.au"), {
        message: "Please use your USYD student email (@uni.sydney.edu.au)",
      }),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Calculate password strength score from 0 to 4.
 * Criteria: length >= 8, length >= 12, mixed case, digit, special char.
 * Score is capped at 4.
 */
export function getPasswordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}
