// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { twoFactorClient, adminClient, customSessionClient } from "better-auth/client/plugins";
import { ac, admin, user, employee, superadmin } from "@/lib/permissions"

// Always point to the primary auth server (NEXT_PUBLIC_APP_URL = powerautomation.pl).
// Using window.location.origin breaks Google OAuth on secondary domains because
// better-auth stores the OAuth state cookie on the domain that received the
// POST /sign-in/social request, but the Google callback always lands on the
// primary domain (BETTER_AUTH_URL) — the cookie is missing there → state_mismatch.
const getBaseURL = () => {
    // On server, use environment variable
    if (typeof window === "undefined") {
        return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    }
    // In browser: prefer the explicit primary-auth URL from env.
    // Falls back to window.location.origin for local dev where NEXT_PUBLIC_APP_URL is not set.
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
};

export const authClient = createAuthClient({
    baseURL: getBaseURL(),
    fetchOptions: {
        onSuccess: (ctx) => {
            const authToken = ctx.response.headers.get("set-auth-token") // get the token from the response headers
            // Store the token securely (e.g., in localStorage)
            if(authToken && typeof window !== "undefined"){
              localStorage.setItem("bearer_token", authToken);
            }
        },
        auth: {
           type:"Bearer",
           token: () => typeof window !== "undefined" ? localStorage.getItem("bearer_token") || "" : "" // get the token from localStorage
        },
    },
    plugins: [
        twoFactorClient(),
        adminClient({
            ac,
            roles: {
                admin,
                user,
                employee,
                superadmin
            },
            allowedRoles: ["user", "employee", "admin", "superadmin"],
            adminRoles: ["admin", "superadmin"],
            adminUserIds: [process.env.ADMIN_USER_ID]
        }),
        customSessionClient()
    ],
})

// const { data } = authClient.useSession();
// const { data: sessionData } = await authClient.getSession();

export const {
    signIn,
    signOut,
    signUp,
    useSession
} = authClient;