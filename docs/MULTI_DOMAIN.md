# Мульти-доменна архітектура Power Automation

## Огляд

Сайт обслуговує два домени з однієї кодової бази:

| Домен | Ключ | Мова за замовч. | Індексується | Платіжні системи |
|---|---|---|---|---|
| `powerautomation.pl` | `pl` | Польська (`pl`) | `/pl/` | Przelewy24 |
| `powerautomation.com.ua` | `ua` | Українська (`ua`) | `/ua/` | LiqPay |

> Англійська (`/en/`) та іспанська (`/es/`) доступні на обох доменах, але **не індексуються** пошуковими системами.

---

## Архітектура

```
┌─────────────────┐     ┌─────────────────┐
│  .pl  (Nginx)   │     │ .com.ua (Nginx) │
└────────┬────────┘     └────────┬────────┘
         │  Host: powerautomation.pl     Host: powerautomation.com.ua
         │                       │
         └───────────┬───────────┘
                     ▼
           ┌─────────────────┐
           │   Middleware     │
           │ (src/middleware) │
           │                 │
           │ 1. Визначає     │
           │    домен по Host│
           │ 2. Встановлює   │
           │    defaultLocale│
           │ 3. Ставить      │
           │    cookie +     │
           │    заголовок    │
           └────────┬────────┘
                    ▼
           ┌─────────────────┐
           │   Next.js App   │
           │                 │
           │ Server Components│──▶ getServerDomainConfig()
           │ Client Components│──▶ useDomainConfig()
           └─────────────────┘
```

---

## Ключові файли

| Файл | Призначення |
|---|---|
| `src/lib/domain-config.ts` | Центральна конфігурація доменів (контакти, GTM, платіжні системи, локалі) |
| `src/middleware.ts` | Middleware: визначає домен, встановлює defaultLocale, cookie та заголовок |
| `src/lib/server-domain.ts` | Серверна функція `getServerDomainConfig()` для RSC та Route Handlers |
| `src/hooks/useDomain.ts` | Клієнтський хук `useDomainConfig()` — читає cookie `domain-key` |
| `src/app/robots.ts` | Динамічний `robots.txt` залежно від домену |
| `src/app/sitemap.ts` | Динамічний `sitemap.xml` залежно від домену |
| `src/app/[locale]/layout.tsx` | Layout: GTM ID та metadata залежать від домену |
| `src/components/layout/footer.tsx` | Футер: контакти з конфігу домену |
| `src/components/layout/main-header.tsx` | Хедер: телефон з конфігу домену |
| `src/app/[locale]/payment/page.tsx` | Платіжна сторінка: показує тільки дозволені провайдери |

---

## Як це працює

### 1. Визначення домену (Middleware)

При кожному запиті `src/middleware.ts`:

1. Читає заголовок `Host` (або `x-forwarded-host` за Nginx)
2. Знаходить відповідний конфіг домену з `DOMAIN_CONFIGS`
3. Створює `next-intl` middleware з `defaultLocale` цього домену
4. Встановлює:
   - Заголовок `x-domain-key` (для серверних компонентів)
   - Cookie `domain-key` (для клієнтських компонентів)

```typescript
// Приклад: відвідувач заходить на powerautomation.com.ua
// → Host = "powerautomation.com.ua"
// → domainConfig = DOMAIN_CONFIGS.ua
// → defaultLocale = "ua"
// → cookie domain-key = "ua"
// → Редірект: / → /ua/
```

### 2. Серверні компоненти

```typescript
import { getServerDomainConfig } from '@/lib/server-domain';

export default async function MyPage() {
  const domainConfig = await getServerDomainConfig();
  // domainConfig.key       → 'ua' | 'pl'
  // domainConfig.gtmId     → 'GTM-...'
  // domainConfig.contacts  → { phone, email, ... }
  // domainConfig.paymentProviders → ['liqpay'] | ['przelewy24']
}
```

### 3. Клієнтські компоненти

```typescript
'use client';
import { useDomainConfig } from '@/hooks/useDomain';

export default function MyComponent() {
  const { contacts, paymentProviders, key } = useDomainConfig();
  // ...
}
```

---

## Конфігурація доменів

Вся конфігурація знаходиться в `src/lib/domain-config.ts`:

```typescript
export const DOMAIN_CONFIGS: Record<DomainKey, DomainConfig> = {
  ua: {
    key: 'ua',
    host: 'powerautomation.com.ua',
    baseUrl: 'https://powerautomation.com.ua',
    defaultLocale: 'ua',
    availableLocales: ['ua', 'en', 'es', 'pl'],
    indexedLocales: ['ua'],           // Тільки UA індексується
    paymentProviders: ['liqpay'],     // Тільки LiqPay
    gtmId: 'GTM-...',
    contacts: { ... },
    siteName: 'Power Automation Україна',
  },
  pl: {
    key: 'pl',
    host: 'powerautomation.pl',
    baseUrl: 'https://powerautomation.pl',
    defaultLocale: 'pl',
    availableLocales: ['pl', 'en', 'es', 'ua'],
    indexedLocales: ['pl'],           // Тільки PL індексується
    paymentProviders: ['przelewy24'], // Тільки Przelewy24
    gtmId: 'GTM-TNWRJ8MC',
    contacts: { ... },
    siteName: 'Power Automation',
  },
};
```

### Додавання нового домену

1. Додати новий ключ до `DomainKey` type
2. Додати конфігурацію до `DOMAIN_CONFIGS`
3. Оновити Nginx для нового домену

---

## robots.txt

Генерується динамічно (`src/app/robots.ts`) на основі домену:

**powerautomation.com.ua/robots.txt:**
```
User-agent: *
Allow: /ua/
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /pl/
Disallow: /en/
Disallow: /es/

Sitemap: https://powerautomation.com.ua/sitemap.xml
```

**powerautomation.pl/robots.txt:**
```
User-agent: *
Allow: /pl/
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /ua/
Disallow: /en/
Disallow: /es/

Sitemap: https://powerautomation.pl/sitemap.xml
```

---

## sitemap.xml

Генерується динамічно (`src/app/sitemap.ts`):

- На `powerautomation.com.ua` — URL тільки з `/ua/` (напр. `https://powerautomation.com.ua/ua/categories/...`)
- На `powerautomation.pl` — URL тільки з `/pl/` (напр. `https://powerautomation.pl/pl/categories/...`)

---

## Платіжні системи

Сторінка оплати (`src/app/[locale]/payment/page.tsx`) показує **тільки ті кнопки**, які дозволені для поточного домену:

- **powerautomation.pl** → Przelewy24
- **powerautomation.com.ua** → LiqPay

Щоб додати Privat24 для UA-домену, достатньо оновити конфіг:
```typescript
// domain-config.ts
ua: {
  paymentProviders: ['liqpay', 'privat24'],
}
```

---

## Google Tag Manager

Кожен домен має свій GTM Container ID:

- Встановлюється в `src/lib/domain-config.ts` → поле `gtmId`
- Використовується в `src/app/[locale]/layout.tsx`
- Можна також задати через змінні оточення: `APP_GTM_ID_PL`, `APP_GTM_ID_UA`

---

## Контактна інформація

Контакти визначаються в `domain-config.ts` → поле `contacts`:

```typescript
contacts: {
  address: ['Tyniecka 2, 52-407', 'Wrocław, Polska'],
  phone: '+48690997944',
  phoneFormatted: '+48 690 997 944',
  email: 'm.sokolowska@ammproject.com',
  contactPerson: 'Maria Sokołowska',
  contactRole: 'Manager ds. sprzedaży',
}
```

Використовуються у:
- **Футер** (`footer.tsx`) — адреса, телефон, email, контактна особа
- **Хедер** (`main-header.tsx`) — телефон

---

## Змінні оточення (.env)

```bash
# Ключ домену для localhost / розробки: 'pl' або 'ua'
APP_DOMAIN_KEY="pl"

# GTM ID для кожного домену
APP_GTM_ID_PL="GTM-TNWRJ8MC"
APP_GTM_ID_UA="GTM-XXXXXXXX"     # ← замініть на реальний
```

---

## Nginx конфігурація

Обидва домени проксують на один контейнер Next.js. Nginx передає заголовок `Host`, тому middleware може визначити домен:

```nginx
# powerautomation.pl.conf
server {
    server_name powerautomation.pl www.powerautomation.pl;

    location / {
        proxy_pass http://nextjs:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# powerautomation.com.ua.conf
server {
    server_name powerautomation.com.ua www.powerautomation.com.ua;

    location / {
        proxy_pass http://nextjs:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **Важливо:** Nginx має передавати заголовок `Host` або `X-Forwarded-Host` — без цього middleware не зможе визначити домен.

---

## Локальна розробка

За замовчуванням на `localhost` використовується домен з `APP_DOMAIN_KEY` (PL).

Щоб протестувати UA-домен локально:

1. Додайте в `C:\Windows\System32\drivers\etc\hosts`:
   ```
   127.0.0.1 powerautomation.com.ua
   127.0.0.1 powerautomation.pl
   ```
2. Відкрийте `http://powerautomation.com.ua:3000` — буде UA-домен
3. Відкрийте `http://powerautomation.pl:3000` — буде PL-домен

Або змініть `APP_DOMAIN_KEY="ua"` в `.env` для тестування UA-версії на localhost.

---

## Деплой (Docker)

Один контейнер обслуговує обидва домени. Різні `.env` файли не потрібні. Достатньо встановити:

```bash
APP_GTM_ID_PL="GTM-TNWRJ8MC"
APP_GTM_ID_UA="GTM-XXXXXXXX"
```

---

## Чек-ліст для запуску UA-домену

- [ ] Заповнити реальні контакти в `domain-config.ts` → `ua.contacts`
- [ ] Встановити реальний GTM ID для UA: `APP_GTM_ID_UA`
- [ ] Налаштувати DNS для `powerautomation.com.ua`
- [ ] Додати Nginx конфіг для `powerautomation.com.ua`
- [ ] Отримати SSL-сертифікат для `powerautomation.com.ua`
- [ ] Перевірити robots.txt: `https://powerautomation.com.ua/robots.txt`
- [ ] Перевірити sitemap: `https://powerautomation.com.ua/sitemap.xml`
- [ ] Перевірити, що `/ua/` сторінки індексуються, а `/pl/`, `/en/`, `/es/` — ні
- [ ] Перевірити платіжні кнопки (LiqPay на UA, Przelewy24 на PL)
- [ ] Перевірити контакти у футері та хедері
- [ ] Перевірити GTM теги в DevTools → Network → GTM

---

## Застаріла конфігурація

Файл `src/proxy.ts` — це стара версія middleware, яку замінив `src/middleware.ts`. Його можна видалити після перевірки, що все працює.

Статичний файл `public/robots.txt` видалено і замінено на динамічний `src/app/robots.ts`.
