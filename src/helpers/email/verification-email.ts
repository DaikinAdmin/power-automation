type SupportedLocale = 'ua' | 'pl' | 'en' | 'es';

interface VerificationEmailStrings {
  subject: string;
  title: string;
  body: string;
  buttonText: string;
  footer: string;
}

const translations: Record<SupportedLocale, VerificationEmailStrings> = {
  ua: {
    subject: 'Підтвердження email',
    title: 'Підтвердження email',
    body: 'Дякуємо за реєстрацію! Будь ласка, натисніть кнопку нижче, щоб верифікувати свою електронну адресу та активувати акаунт.',
    buttonText: 'Підтвердити Email',
    footer: 'Якщо ви не реєструвалися на нашому сайті, просто проігноруйте цей лист.',
  },
  pl: {
    subject: 'Weryfikacja adresu e-mail',
    title: 'Weryfikacja adresu e-mail',
    body: 'Dziękujemy za rejestrację! Kliknij poniższy przycisk, aby zweryfikować swój adres e-mail i aktywować konto.',
    buttonText: 'Zweryfikuj e-mail',
    footer: 'Jeśli nie rejestrowałeś się na naszej stronie, zignoruj tę wiadomość.',
  },
  en: {
    subject: 'Email Verification',
    title: 'Email Verification',
    body: 'Thank you for signing up! Please click the button below to verify your email address and activate your account.',
    buttonText: 'Verify Email',
    footer: 'If you did not register on our website, simply ignore this email.',
  },
  es: {
    subject: 'Verificación de correo electrónico',
    title: 'Verificación de correo electrónico',
    body: 'Gracias por registrarte. Haz clic en el botón a continuación para verificar tu dirección de correo electrónico y activar tu cuenta.',
    buttonText: 'Verificar correo',
    footer: 'Si no te registraste en nuestro sitio, simplemente ignora este correo.',
  },
};

export function getVerificationEmailSubject(locale: string): string {
  const t = translations[(locale as SupportedLocale)] ?? translations.en;
  return t.subject;
}

export function buildVerificationEmailHtml(verificationUrl: string, locale: string): string {
  const t = translations[(locale as SupportedLocale)] ?? translations.en;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f9fafb;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      background-color: #ffffff;
      margin: 0 auto;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    }
    .content {
      padding: 32px;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      line-height: 24px;
      color: #4b5563;
      margin-top: 0;
      margin-bottom: 32px;
    }
    .btn-container {
      margin-bottom: 32px;
    }
    .btn {
      display: inline-block;
      background-color: #ef4444;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 16px;
      font-weight: 500;
      padding: 12px 32px;
      border-radius: 6px;
    }
    .footer {
      font-size: 14px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="content">
        <h1>${t.title}</h1>
        <p>${t.body}</p>
        <div class="btn-container">
          <a href="${verificationUrl}" class="btn" target="_blank">${t.buttonText}</a>
        </div>
        <div class="footer">
          ${t.footer}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
