// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { twoFactorClient, adminClient, customSessionClient } from "better-auth/client/plugins";
import { ac, admin, user, employee, superadmin } from "@/lib/permissions"

// Use the current origin so each domain talks to its own auth endpoint.
// Each domain's auth instance (pl/ua) has its own Google OAuth client and
// baseURL, so state cookies and callbacks stay on the same domain.
const getBaseURL = () => {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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