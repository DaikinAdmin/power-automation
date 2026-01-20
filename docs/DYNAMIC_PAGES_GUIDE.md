# Динамічні сторінки з Editor.js

Цей документ описує як створювати та редагувати динамічні сторінки на сайті з використанням Editor.js.

## Структура

### Створені файли:

1. **[src/components/EditorJSRenderer.tsx](../src/components/EditorJSRenderer.tsx)** - компонент для рендерингу контенту Editor.js
2. **[src/app/[locale]/[slug]/page.tsx](../src/app/[locale]/[slug]/page.tsx)** - динамічна сторінка для відображення контенту
3. **[scripts/seed-pages.ts](../scripts/seed-pages.ts)** - скрипт для заповнення БД тестовими даними

### Доступні сторінки:

Після запуску seed скрипта доступні наступні сторінки (для кожної мови - ua, en, pl, es):

- `/ua/about-us` - Про нас
- `/ua/delivery` - Доставка та оплата
- `/ua/returns` - Повернення товару
- `/ua/contacts` - Контакти

## Як використовувати

### 1. Створення нової сторінки

#### Через API (для адміністраторів):

```bash
curl -X POST http://localhost:3000/api/admin/pages \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "slug": "privacy-policy",
    "locale": "en",
    "title": "Privacy Policy",
    "content": {
      "blocks": [
        {
          "type": "header",
          "data": {
            "text": "Our Privacy Policy",
            "level": 2
          }
        },
        {
          "type": "paragraph",
          "data": {
            "text": "We respect your privacy..."
          }
        }
      ],
      "version": "2.30.0"
    },
    "isPublished": true
  }'
```

#### Через seed скрипт:

1. Відкрийте файл `scripts/seed-pages.ts`
2. Додайте новий об'єкт до масиву `pageContentData`:

```typescript
{
  slug: "privacy-policy",
  locale: "en",
  title: "Privacy Policy",
  content: {
    time: Date.now(),
    blocks: [
      { type: "header", data: { text: "Our Privacy Policy", level: 2 } },
      { type: "paragraph", data: { text: "We respect your privacy..." } },
    ],
    version: "2.30.0",
  },
}
```

3. Запустіть seed:

```bash
npm run seed:pages
```

### 2. Типи блоків Editor.js

EditorJSRenderer підтримує наступні типи блоків:

#### Header (Заголовок)
```json
{
  "type": "header",
  "data": {
    "text": "Your Header Text",
    "level": 2
  }
}
```
Підтримує рівні від 1 до 6.

#### Paragraph (Параграф)
```json
{
  "type": "paragraph",
  "data": {
    "text": "Your paragraph text. Can include <b>bold</b> and <i>italic</i> HTML tags."
  }
}
```

#### List (Список)
```json
{
  "type": "list",
  "data": {
    "style": "unordered",
    "items": [
      "First item",
      "Second item",
      "Third item"
    ]
  }
}
```
Стилі: `"unordered"` (маркований) або `"ordered"` (нумерований).

#### Quote (Цитата)
```json
{
  "type": "quote",
  "data": {
    "text": "Quote text here",
    "caption": "Author name"
  }
}
```

#### Code (Код)
```json
{
  "type": "code",
  "data": {
    "code": "const hello = 'world';"
  }
}
```

#### Warning (Попередження)
```json
{
  "type": "warning",
  "data": {
    "title": "Warning!",
    "message": "This is important information."
  }
}
```

#### Delimiter (Роздільник)
```json
{
  "type": "delimiter",
  "data": {}
}
```

#### Table (Таблиця)
```json
{
  "type": "table",
  "data": {
    "content": [
      ["Header 1", "Header 2", "Header 3"],
      ["Cell 1", "Cell 2", "Cell 3"],
      ["Cell 4", "Cell 5", "Cell 6"]
    ]
  }
}
```

#### Checklist (Чеклист)
```json
{
  "type": "checklist",
  "data": {
    "items": [
      { "text": "Task 1", "checked": true },
      { "text": "Task 2", "checked": false }
    ]
  }
}
```

### 3. Редагування існуючої сторінки

#### Отримати ID сторінки:

```bash
curl http://localhost:3000/api/admin/pages \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN"
```

#### Оновити сторінку:

```bash
curl -X PATCH http://localhost:3000/api/admin/pages/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "title": "Updated Title",
    "content": {
      "blocks": [...]
    }
  }'
```

### 4. Видалення сторінки

```bash
curl -X DELETE http://localhost:3000/api/admin/pages/1 \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN"
```

## Приклади використання

### Приклад 1: Проста сторінка "Про нас"

```json
{
  "slug": "about-us",
  "locale": "en",
  "title": "About Us",
  "content": {
    "blocks": [
      {
        "type": "header",
        "data": { "text": "About Our Company", "level": 1 }
      },
      {
        "type": "paragraph",
        "data": { "text": "We are a leading provider of industrial automation solutions." }
      },
      {
        "type": "header",
        "data": { "text": "Our Mission", "level": 2 }
      },
      {
        "type": "paragraph",
        "data": { "text": "To provide high-quality products and excellent customer service." }
      },
      {
        "type": "list",
        "data": {
          "style": "unordered",
          "items": [
            "Quality products",
            "Fast delivery",
            "Expert support"
          ]
        }
      }
    ]
  }
}
```

### Приклад 2: Сторінка з таблицею цін

```json
{
  "slug": "pricing",
  "locale": "en",
  "title": "Pricing",
  "content": {
    "blocks": [
      {
        "type": "header",
        "data": { "text": "Our Pricing Plans", "level": 1 }
      },
      {
        "type": "table",
        "data": {
          "content": [
            ["Plan", "Price", "Features"],
            ["Basic", "$10/mo", "10 GB Storage"],
            ["Pro", "$20/mo", "50 GB Storage"],
            ["Enterprise", "Contact Us", "Unlimited"]
          ]
        }
      }
    ]
  }
}
```

## Доступ до сторінок

### Публічні URL:

- Англійська: `http://localhost:3000/en/{slug}`
- Українська: `http://localhost:3000/ua/{slug}`
- Польська: `http://localhost:3000/pl/{slug}`
- Іспанська: `http://localhost:3000/es/{slug}`

Приклади:
- `http://localhost:3000/en/about-us`
- `http://localhost:3000/ua/delivery`
- `http://localhost:3000/pl/contacts`

### Admin API endpoints:

Дивіться [PAGE_CONTENT_API.md](PAGE_CONTENT_API.md) для повної документації API.

## Стилізація

EditorJSRenderer використовує Tailwind CSS класи для стилізації. Ви можете кастомізувати вигляд редагуючи компонент `src/components/EditorJSRenderer.tsx`.

### Приклад кастомізації:

```tsx
// Змінити стиль параграфів
<p className="my-3 text-gray-700 leading-relaxed text-lg">
  {blockData.text}
</p>

// Змінити стиль заголовків
<h2 className="text-3xl font-bold text-blue-600 mb-4">
  {blockData.text}
</h2>
```

## Кешування

Сторінки кешуються на 1 годину (3600 секунд) для оптимізації продуктивності. Після оновлення контенту через API, нова версія буде доступна після закінчення часу кешу або після перезавантаження Next.js dev сервера.

## SEO

Кожна сторінка автоматично генерує:
- `title` - з поля title сторінки
- `description` - з першого параграфа контенту (до 160 символів)

Метадані можна кастомізувати в функції `generateMetadata` файлу `src/app/[locale]/[slug]/page.tsx`.

## Troubleshooting

### Сторінка не відображається

1. Перевірте чи існує сторінка в БД:
```bash
curl http://localhost:3000/api/public/pages/en/about-us
```

2. Перевірте чи поле `isPublished` встановлено в `true`

3. Перевірте консоль браузера на наявність помилок

### Блок не рендериться

Переконайтеся що тип блоку підтримується в `EditorJSRenderer.tsx`. Якщо ні - додайте новий case в switch statement.

## Наступні кроки

1. Створіть admin UI для створення/редагування сторінок
2. Додайте rich text editor (Editor.js) для зручного редагування
3. Реалізуйте версіонування контенту
4. Додайте можливість завантаження зображень
5. Налаштуйте автоматичне ISR (Incremental Static Regeneration)
