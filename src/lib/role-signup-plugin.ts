import type { BetterAuthPlugin } from "better-auth";
import prisma from "@/db";

/**
 * Plugin to allow setting role during sign-up
 * This plugin stores the role from the request and applies it after user creation
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
            const role = body?.role;
            
            // Store the role in context for later use
            if (role && typeof role === "string") {
              const allowedRoles = ["user", "employee"];
              if (allowedRoles.includes(role)) {
                ctx.requestedRole = role;
              }
            }
            
            // Remove role from body to prevent admin plugin from blocking
            if (body?.role) {
              delete body.role;
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
              
              // Update the user's role in the database using Prisma directly
              if (returned.user?.id) {
                try {
                  await prisma.user.update({
                    where: { id: returned.user.id },
                    data: { role: requestedRole },
                  });
                  
                  // Update the returned user object
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
