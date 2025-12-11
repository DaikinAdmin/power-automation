import { createAccessControl } from "better-auth/plugins/access";

// Define custom statements for the application
export const statement = {
    cases: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

// User role: can create, update, and delete cases
export const user = ac.newRole({ 
    cases: ["create", "update", "delete"], 
});

// Employee role: same permissions as user (can create and update cases)
export const employee = ac.newRole({ 
    cases: ["create", "update", "delete"] 
});

// Admin role: has all permissions including read
export const admin = ac.newRole({ 
    cases: ["create", "read", "update", "delete"],
});