import nodemailer from "nodemailer";

import SMTPTransport from "nodemailer/lib/smtp-transport";

export const email = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
    }
} as SMTPTransport.Options);