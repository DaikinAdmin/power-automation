// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { twoFactorClient, adminClient, customSessionClient } from "better-auth/client/plugins";
import { ac, admin, user, employee, superadmin } from "@/lib/permissions"

// Get base URL from environment or use current origin (for IP-based access)
const getBaseURL = () => {
    if (typeof window !== "undefined") {
        // In browser, use window.location.origin to support IP-based access
        return window.location.origin;
    }
    // On server, use environment variable
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