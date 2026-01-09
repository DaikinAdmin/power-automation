# Page Content API

Ця документація описує API ендпоінти для роботи з динамічним контентом сторінок (pageContent).

## Схема даних

Таблиця `page_content` містить наступні поля:

```typescript
{
  id: number;              // Унікальний ідентифікатор
  slug: string;            // URL-slug сторінки (наприклад: "about-us", "terms")
  locale: string;          // Мова контенту ("pl", "en", "ua", "es")
  title: string;           // Заголовок сторінки
  content: JSON;           // Контент сторінки (JSON)
  isPublished: boolean;    // Чи опублікована сторінка (default: true)
  updatedAt: timestamp;    // Час останнього оновлення
}
```

**Унікальний індекс**: комбінація `slug + locale` повинна бути унікальною.

---

## Public API Endpoints

### 1. Отримати сторінку за slug і locale

**Endpoint**: `GET /api/public/pages/[locale]/[slug]`

**Опис**: Отримати опубліковану сторінку для відображення користувачам.

**Параметри URL**:
- `locale` - мова контенту (`pl`, `en`, `ua`, `es`)
- `slug` - URL-ідентифікатор сторінки

**Приклад запиту**:
```bash
# Отримати сторінку "about-us" англійською мовою
curl -X GET https://your-domain.com/api/public/pages/en/about-us
```

**Приклад відповіді** (200 OK):
```json
{
  "id": 1,
  "slug": "about-us",
  "locale": "en",
  "title": "About Us",
  "content": {
    "blocks": [
      {
        "type": "heading",
        "text": "Welcome to our company"
      },
      {
        "type": "paragraph",
        "text": "We are a leading provider of..."
      }
    ]
  },
  "isPublished": true,
  "updatedAt": "2026-01-08T10:30:00Z"
}
```

**Можливі помилки**:
- `400 Bad Request` - невалідна мова (locale)
- `404 Not Found` - сторінка не знайдена
- `500 Internal Server Error` - серверна помилка

**Використання в Next.js**:
```typescript
// app/[locale]/[slug]/page.tsx
import { notFound } from 'next/navigation';

export default async function DynamicPage({ 
  params 
}: { 
  params: { locale: string; slug: string } 
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/public/pages/${params.locale}/${params.slug}`,
    { next: { revalidate: 3600 } } // Cache for 1 hour
  );

  if (!res.ok) {
    notFound();
  }

  const page = await res.json();

  return (
    <div>
      <h1>{page.title}</h1>
      <div>{/* Render page.content */}</div>
    </div>
  );
}
```

---

## Admin API Endpoints

**Важливо**: Всі admin ендпоінти вимагають аутентифікації та роль `admin`.

### 2. Отримати всі сторінки (згруповані за slug)

**Endpoint**: `GET /api/admin/pages`

**Опис**: Отримати всі сторінки, згруповані за slug (для адмін панелі).

**Авторизація**: Потрібна (admin)

**Приклад запиту**:
```bash
curl -X GET https://your-domain.com/api/admin/pages \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN"
```

**Приклад відповіді** (200 OK):
```json
{
  "about-us": [
    {
      "id": 1,
      "slug": "about-us",
      "locale": "en",
      "title": "About Us",
      "content": "{...}",
      "isPublished": true,
      "updatedAt": "2026-01-08T10:30:00Z"
    },
    {
      "id": 2,
      "slug": "about-us",
      "locale": "pl",
      "title": "O nas",
      "content": "{...}",
      "isPublished": true,
      "updatedAt": "2026-01-08T10:30:00Z"
    }
  ],
  "terms": [
    {
      "id": 3,
      "slug": "terms",
      "locale": "en",
      "title": "Terms and Conditions",
      "content": "{...}",
      "isPublished": true,
      "updatedAt": "2026-01-07T14:20:00Z"
    }
  ]
}
```

---

### 3. Створити нову сторінку

**Endpoint**: `POST /api/admin/pages`

**Опис**: Створити нову версію сторінки для вказаної мови.

**Авторизація**: Потрібна (admin)

**Тіло запиту**:
```json
{
  "slug": "privacy-policy",
  "locale": "en",
  "title": "Privacy Policy",
  "content": {
    "blocks": [
      {
        "type": "heading",
        "text": "Privacy Policy"
      },
      {
        "type": "paragraph",
        "text": "Your privacy is important to us..."
      }
    ]
  },
  "isPublished": true
}
```

**Обов'язкові поля**: `slug`, `locale`, `title`, `content`

**Приклад запиту**:
```bash
curl -X POST https://your-domain.com/api/admin/pages \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "slug": "privacy-policy",
    "locale": "en",
    "title": "Privacy Policy",
    "content": {"blocks": [...]},
    "isPublished": true
  }'
```

**Приклад відповіді** (201 Created):
```json
{
  "message": "Page created successfully"
}
```

**Можливі помилки**:
- `400 Bad Request` - відсутні обов'язкові поля або невалідна мова
- `401 Unauthorized` - не авторизований або не admin
- `409 Conflict` - сторінка з таким slug і locale вже існує
- `500 Internal Server Error` - серверна помилка

---

### 4. Отримати сторінку за ID

**Endpoint**: `GET /api/admin/pages/[id]`

**Опис**: Отримати конкретну сторінку за ID для редагування.

**Авторизація**: Потрібна (admin)

**Параметри URL**:
- `id` - ID сторінки (number)

**Приклад запиту**:
```bash
curl -X GET https://your-domain.com/api/admin/pages/1 \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN"
```

**Приклад відповіді** (200 OK):
```json
{
  "id": 1,
  "slug": "about-us",
  "locale": "en",
  "title": "About Us",
  "content": {
    "blocks": [...]
  },
  "isPublished": true,
  "updatedAt": "2026-01-08T10:30:00Z"
}
```

**Можливі помилки**:
- `400 Bad Request` - невалідний ID
- `401 Unauthorized` - не авторизований або не admin
- `404 Not Found` - сторінка не знайдена
- `500 Internal Server Error` - серверна помилка

---

### 5. Оновити сторінку

**Endpoint**: `PATCH /api/admin/pages/[id]`

**Опис**: Оновити існуючу сторінку за ID.

**Авторизація**: Потрібна (admin)

**Параметри URL**:
- `id` - ID сторінки (number)

**Тіло запиту** (всі поля опціональні):
```json
{
  "title": "Updated Title",
  "content": {
    "blocks": [...]
  },
  "isPublished": false
}
```

**Приклад запиту**:
```bash
curl -X PATCH https://your-domain.com/api/admin/pages/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "title": "Updated About Us",
    "isPublished": true
  }'
```

**Приклад відповіді** (200 OK):
```json
{
  "message": "Page updated successfully"
}
```

**Можливі помилки**:
- `400 Bad Request` - невалідний ID або відсутні поля для оновлення
- `401 Unauthorized` - не авторизований або не admin
- `500 Internal Server Error` - серверна помилка
', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slug: 'contact',
    locale: 'en',
    title: 'Contact Us',
    content: { blocks: [...] },
    isPublished: true,
  }),
});

// Створити польську версію
await fetch('/api/admin/pages
**Приклад запиту**:
```bash
curl -X DELETE https://your-domain.com/api/admin/pages/1 \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN"
```

**Приклад відповіді** (200 OK):
```json
{
  "message": "Page deleted successfully"
}
```

**Можливі помилки**:
- `400 Bad Request` - невалідний ID
- `401 Unauthorized` - не авторизований або не admin
- `500 Internal Server Error` - серверна помилка

---

## Приклади використання

### Створення сторінки для кількох мов

```typescript
// Створити англійську версію
await fetch('/api/admin/pages/contact/en', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slug: 'contact',
    locale: 'en',
    title: 'Contact Us',
    content: { blocks: [...] },
    isPublished: true,
  }),
});

// Створити польську версію
await fetch('/api/admin/pages/contact/pl', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slug: 'contact',
    locale: 'pl',
    title: 'Kontakt',
    content: { blocks: [...] },
    isPublished: true,
  }),
});
```

### Отримання та відображення динамічної сторінки

```typescript
// components/DynamicPageRenderer.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function DynamicPageRenderer() {
  const params = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch(
          `/api/public/pages/${params.locale}/${params.slug}`
        );
        if (res.ok) {
          const data = await res.json();
          setPage(data);
        }
      } catch (error) {
        console.error('Error fetching page:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [params.locale, params.slug]);

  if (loading) return <div>Loading...</div>;
  if (!page) return <div>Page not found</div>;

  return (
    <div>
      <h1>{page.title}</h1>
      {/* Render page.content based on your structure */}
      {page.content.blocks?.map((block, index) => (
        <div key={index}>
          {block.type === 'heading' && <h2>{block.text}</h2>}
          {block.type === 'paragraph' && <p>{block.text}</p>}
        </div>
      ))}
    </div>
  );
}
```

### Admin Panel - CRUD інтерфейс

```typescript
// app/admin/pages/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function AdminPages() {
  const [pages, setPages] = useState({});

  useEffect(() => {
    async function fetchPages() {
      const res = await fetch('/api/admin/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    }
    fetchPages();
  }, []);

  async function deletePage(id: number) {
    if (!confirm('Are you sure?')) return;
    
    const res = await fetch(`/api/admin/pages/${id}`, {
      method: 'DELETE',
    });
    
    if (res.ok) {
      // Refresh list
      window.location.reload();
    }
  }

  return (
    <div>
      <h1>Manage Pages</h1>
      {Object.entries(pages).map(([slug, versions]) => (
        <div key={slug}>
          <h2>{slug}</h2>
          {versions.map((page) => (
            <div key={page.id}>
              <span>{page.locale} - {page.title}</span>
              <button onClick={() => deletePage(page.id)}>Delete</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## Структура контенту (рекомендації)

Поле `content` зберігає JSON. Рекомендована структура:

```json
{
  "blocks": [
    {
      "type": "heading",
      "level": 1,
      "text": "Main Title"
    },
    {
      "type": "paragraph",
      "text": "Some text content..."
    },
    {
      "type": "image",
      "src": "/imgs/example.jpg",
      "alt": "Description"
    },
    {
      "type": "list",
      "items": ["Item 1", "Item 2", "Item 3"]
    }
  ],
  "metadata": {
    "author": "Admin",
    "lastModified": "2026-01-08"
  }
}
```

Ви можете використовувати будь-яку структуру, яка підходить для вашого проекту.

---

## Кешування

- **Public endpoint**: кешується на 1 годину (3600s) з `stale-while-revalidate` 5 хвилин
- **Admin endpoints**: без кешування (завжди свіжі дані)

---

## Безпека

1. **Аутентифікація**: Admin endpoints захищені через NextAuth
2. **Авторизація**: Тільки користувачі з роллю `admin` мають доступ
3. **Валідація**: Всі вхідні дані валідуються на сервері
4. **SQL Injection**: Захист через Drizzle ORM

---

## Наступні кроки

1. Створіть компоненти для рендерингу контенту
2. Додайте admin UI для створення/редагування сторінок
3. Реалізуйте rich text editor для зручного редагування
4. Додайте версіонування контенту (опціонально)
5. Налаштуйте SEO meta tags для динамічних сторінок
