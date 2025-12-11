// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { bearer, twoFactorClient } from "better-auth/plugins";
import { auth } from "./auth";
import { adminClient, customSessionClient } from "better-auth/client/plugins"
import { ac, user, employee, admin } from "./permissions";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    fetchOptions: {
        onSuccess: (ctx) => {
            const authToken = ctx.response.headers.get("set-auth-token") // get the token from the response headers
            // Store the token securely (e.g., in localStorage)
            if (authToken && typeof window !== "undefined") {
                localStorage.setItem("bearer_token", authToken);
            }
        },
        auth: {
            type: "Bearer",
            token: () => typeof window !== "undefined" ? localStorage.getItem("bearer_token") || "" : "" // get the token from localStorage
        }
    },
    plugins: [
        twoFactorClient(),
        adminClient({
            ac,
            roles: {
                admin,
                user,
                employee
            },
            allowedRoles: ["user", "employee", "admin"],
            adminRoles: ["admin"],
            adminUserIds: [process.env.ADMIN_USER_ID || ""]
        }),
        bearer(),
        customSessionClient<typeof auth>()
    ]
})

export const {
    signIn,
    signOut,
    signUp,
    useSession
} = authClient;