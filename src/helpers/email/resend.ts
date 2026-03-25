import nodemailer from "nodemailer";

import SMTPTransport from "nodemailer/lib/smtp-transport";

// Port 465 — implicit SSL (default)
export const email = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: true,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
    }
} as SMTPTransport.Options);

// Port 587 — explicit STARTTLS (used for @powerautomation.pl recipients)
export const emailStartTLS = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT_STARTTLS ?? 587),
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
    }
} as SMTPTransport.Options);