# Multi-Domain Docker Deployment

## Архітектура

Один Docker-образ → два контейнери з різними змінними середовища.

```
                          ┌─────────────────────────┐
                          │      Docker Image        │
                          │   (one build, shared)    │
                          └────────┬────────┬────────┘
                                   │        │
                    ┌──────────────┘        └──────────────┐
                    ▼                                      ▼
        ┌───────────────────────┐          ┌───────────────────────┐
        │  Container: app       │          │  Container: app-daikin│
        │  powerautomation.pl   │          │  daikinwroclaw.pl     │
        │  Port 3060            │          │  Port 3061            │
        │  Locale: pl,en,es     │          │  Locale: ua           │
        │  GTM: GTM-TNWRJ8MC   │          │  GTM: (свій або —)    │
        │  Binotel: ✅           │          │  Binotel: ❌           │
        └───────────┬───────────┘          └───────────┬───────────┘
                    │                                  │
                    └──────────────┬───────────────────┘
                                   ▼
                          ┌─────────────────┐
                          │   PostgreSQL     │
                          │ (shared DB)      │
                          └─────────────────┘
```

## Змінні середовища (per-container)

| Змінна | Опис | powerautomation.pl | daikinwroclaw.pl |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Повний URL домену | `https://powerautomation.pl` | `https://daikinwroclaw.pl` |
| `BETTER_AUTH_URL` | URL для auth | `https://powerautomation.pl` | `https://daikinwroclaw.pl` |
| `APP_DEFAULT_LOCALE` | Локаль за замовчуванням | `pl` | `ua` |
| `APP_SITE_LOCALES` | Індексовані локалі (через кому) | `pl,en,es` | `ua` |
| `APP_GTM_ID` | Google Tag Manager ID | `GTM-TNWRJ8MC` | *(пусто або свій)* |
| `APP_BINOTEL_ENABLED` | Binotel віджети | `true` | `false` |
| `APP_SITE_NAME` | Назва сайту | `Power Automation` | `Daikin Wrocław` |
| `MAIL_USER` | Email відправника | `info@powerautomation.pl` | `info@daikinwroclaw.pl` |
| `MAIL_FROM` | Повне ім'я відправника | `PowerAutomation Info <info@...>` | `Daikin Wrocław <info@...>` |

## Крок 1: Збірка одного образу

```bash
docker compose build app
```

Цей образ використовується обома контейнерами. Другий контейнер `app-daikin` збілдиться з того ж Dockerfile.

> **Оптимізація**: щоб не білдити двічі, можна прив'язати `app-daikin` до вже
> зібраного образу (див. Крок 5).

## Крок 2: Налаштуйте `.env` на VPS

Додайте змінні для другого домену у `.env` файл на сервері:

```env
# ===== Power Automation (primary) =====
NEXT_PUBLIC_APP_URL=https://powerautomation.pl
BETTER_AUTH_URL=https://powerautomation.pl
APP_DEFAULT_LOCALE=pl
APP_SITE_LOCALES=pl,en,es
APP_GTM_ID=GTM-TNWRJ8MC
APP_BINOTEL_ENABLED=true
APP_SITE_NAME=Power Automation

# ===== Daikin Wrocław (second domain) =====
DAIKIN_APP_URL=https://daikinwroclaw.pl
DAIKIN_BETTER_AUTH_URL=https://daikinwroclaw.pl
DAIKIN_DEFAULT_LOCALE=ua
DAIKIN_SITE_LOCALES=ua
DAIKIN_GTM_ID=
DAIKIN_BINOTEL_ENABLED=false
DAIKIN_SITE_NAME=Daikin Wrocław
DAIKIN_MAIL_USER=info@daikinwroclaw.pl
DAIKIN_MAIL_FROM=Daikin Wrocław <info@daikinwroclaw.pl>
DAIKIN_MAIL_PASSWORD=ваш_пароль
```

## Крок 3: Запуск обох контейнерів

```bash
# Запустити все (включаючи новий контейнер)
docker compose up -d

# Або тільки другий контейнер
docker compose up -d app-daikin
```

Після запуску:
- `powerautomation.pl` → контейнер `app` → `localhost:3060`
- `daikinwroclaw.pl` → контейнер `app-daikin` → `localhost:3061`

## Крок 4: Nginx налаштування

### 4.1 Скопіюйте конфіг

```bash
sudo cp nginx/daikinwroclaw.pl.conf /etc/nginx/sites-available/daikinwroclaw.pl
sudo ln -s /etc/nginx/sites-available/daikinwroclaw.pl /etc/nginx/sites-enabled/
```

### 4.2 Отримайте SSL сертифікат

```bash
sudo certbot certonly --nginx -d daikinwroclaw.pl -d www.daikinwroclaw.pl
```

### 4.3 Перевірте та перезавантажте Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Крок 5 (опціонально): Один build — два контейнери

Щоб `app-daikin` використовував той самий образ (без повторної збірки), замініть `build:` на `image:` у `docker-compose.yml`:

```yaml
app-daikin:
    image: power-automation-app:latest  # той самий образ
    # ... решта environment залишається
```

І збілдьте один раз з тегом:
```bash
docker compose build app
docker tag power-automation-app:latest power-automation-app:latest
```

## SEO / Індексація / Аналітика

### Чи заважає це позиціонуванню?
**Ні.** Кожен домен отримує:

| Що | Як працює |
|---|---|
| **robots.txt** | Генерується динамічно (`src/app/robots.ts`). Кожен контейнер віддає свій `robots.txt` з правильним `Sitemap:` та правилами `Disallow` для неіндексованих локалей. |
| **sitemap.xml** | Генерується динамічно (`src/app/sitemap.ts`). URL-и використовують `NEXT_PUBLIC_APP_URL` контейнера — тому `powerautomation.pl/sitemap.xml` містить тільки URL-и `powerautomation.pl`. |
| **Canonical URL** | Всі `<link rel="canonical">` та `<meta property="og:url">` генеруються з `NEXT_PUBLIC_APP_URL`. Google бачить кожен сайт як окремий. |
| **GTM / Analytics** | Кожен домен може мати свій GTM контейнер (або зовсім без нього). Аналітика не змішується. |
| **Binotel** | Вмикається/вимикається через `APP_BINOTEL_ENABLED`. |
| **meta robots** | Тег `noindex, nofollow` автоматично додається для локалей, що не входять до `APP_SITE_LOCALES`. |

### Що НЕ потрібно робити
- **НЕ** потрібно додавати `hreflang` між доменами (це різні бізнеси/ринки).
- **НЕ** потрібно робити спільний `sitemap-index.xml`.
- **НЕ** потрібно налаштовувати `301` редіректи між доменами.

## Порти

| Сервіс | Порт хоста | Призначення |
|---|---|---|
| `app` (powerautomation.pl) | 3060 | Primary Next.js |
| `app-daikin` (daikinwroclaw.pl) | 3061 | Second Next.js |
| `postgres` | 5435 | PostgreSQL |
| `loki` | 3100 | Loki logs |
| `grafana` | 3300 | Grafana UI |

## Файли, що змінились

| Файл | Що змінилось |
|---|---|
| `src/lib/domain-config.ts` | **Новий** — хелпер для зчитування доменних env vars |
| `src/app/robots.ts` | **Новий** — динамічний robots.txt (замість `public/robots.txt`) |
| `src/app/sitemap.ts` | Використовує `getBaseUrl()` / `getIndexedLocales()` замість хардкоду |
| `src/app/[locale]/layout.tsx` | Динамічний GTM, Binotel, metadataBase, canonical, siteName |
| `src/app/[locale]/page.tsx` | Динамічний canonical / og:url |
| `src/app/[locale]/categories/page.tsx` | Динамічний canonical |
| `src/app/[locale]/category/[slug]/page.tsx` | Динамічний canonical |
| `src/app/[locale]/product/[id]/page.tsx` | Динамічний canonical |
| `src/app/feed/products.xml/route.ts` | BASE_URL та LOCALE з env vars |
| `next.config.ts` | Додано `daikinwroclaw.pl` до `images.domains` |
| `docker-compose.yml` | Додано контейнер `app-daikin` + нові env vars |
| `nginx/daikinwroclaw.pl.conf` | **Новий** — nginx конфіг для другого домену → порт 3061 |
| `.env` | Додано нові змінні `APP_DEFAULT_LOCALE`, `APP_SITE_LOCALES` тощо |
| `public/robots.txt` | **Видалено** — замінено на `src/app/robots.ts` |

## Додавання третього домену

1. Додайте новий сервіс у `docker-compose.yml` (копія `app-daikin` з іншими env vars та портом).
2. Створіть nginx конфіг (`nginx/newdomain.conf`).
3. Додайте домен до `images.domains` у `next.config.ts`.
4. Запустіть: `docker compose up -d app-newdomain`.
