import type { BetterAuthPlugin } from "better-auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Plugin to derive role from userType during sign-up.
 * company → employee, private → user
 */
export const roleSignupPlugin = () => {
  return {
    id: "role-signup",
    hooks: {
      before: [
        {
          matcher(context) {
            return context.path === "/sign-up/email";
          },
          handler: async (ctx: any) => {
            const body = ctx.body as any;
            const userType = body?.userType;

            // Derive role from userType + companyPosition
            if (userType === "company") {
              const position = body?.companyPosition;
              ctx.requestedRole = position === "employee" ? "company_employee" : "company_owner";
            } else {
              ctx.requestedRole = "user";
            }

            return { context: ctx };
          },
        },
      ],
      after: [
        {
          matcher(context) {
            return context.path === "/sign-up/email";
          },
          handler: async (ctx: any) => {
            const requestedRole = ctx.requestedRole;

            if (requestedRole && ctx.context.returned) {
              const returned = ctx.context.returned as any;

              if (returned.user?.id) {
                try {
                  await db
                    .update(user)
                    .set({ role: requestedRole })
                    .where(eq(user.id, returned.user.id));

                  returned.user.role = requestedRole;
                } catch (error) {
                  console.error("Error updating user role:", error);
                }
              }
            }

            return ctx;
          },
        },
      ],
    },
  } satisfies BetterAuthPlugin;
};
