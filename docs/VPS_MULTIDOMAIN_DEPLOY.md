# Розгортання мультидомену на VPS

## Поточний стан

- `powerautomation.pl` — **вже працює** → Next.js на порту `3060`, Nginx на VPS
- `daikinwroclaw.com` — **тестовий UA-домен** → той самий контейнер, другий Nginx vhost
- `powerautomation.com.ua` — **майбутній продакшн UA-домен** (коли будете готові)

---

## Частина 1 — Розгортання daikinwroclaw.com (тест UA-версії)

### Крок 1. Запушити код на VPS

Виконайте на своїй машині:

```bash
git add -A
git commit -m "feat: multi-domain support"
git push
```

На VPS:
```bash
cd /path/to/powerautomation   # ваша тека на VPS
git pull
```

---

### Крок 2. Оновити .env на VPS

```bash
nano .env
```

Знайдіть рядок з `APP_UA_TEST_HOST` і **розкоментуйте** (приберіть `#`):

```bash
# БУЛО (закоментовано):
# APP_UA_TEST_HOST=daikinwroclaw.com

# СТАЛО (розкоментовано):
APP_UA_TEST_HOST=daikinwroclaw.com
```

Також перевірте, щоб були ці змінні (додайте якщо немає):
```bash
APP_GTM_ID_PL=GTM-TNWRJ8MC
APP_GTM_ID_UA=GTM-XXXXXXXX
LIQPAY_PUBLIC_KEY=sandbox_i63147586042
LIQPAY_PRIVATE_KEY=sandbox_3qbsUvQkxyc6lqOl6Vs39pEtwros8FHl0v1NtEPS
```

---

### Крок 3. Перезапустити Docker-контейнер

```bash
docker-compose up -d --force-recreate app
```

Перевірте що запустився:
```bash
docker-compose logs -f app --tail=50
```

---

### Крок 4. Налаштувати DNS для daikinwroclaw.com

У вашого DNS-провайдера (Cloudflare, домен-реєстратор тощо) додайте A-записи:

```
A    daikinwroclaw.com      →  IP_вашого_VPS
A    www.daikinwroclaw.com  →  IP_вашого_VPS
```

Перевірте, що DNS поширився (~5-30 хвилин):
```bash
# На VPS або своїй машині:
nslookup daikinwroclaw.com
# або
dig daikinwroclaw.com +short
```

---

### Крок 5. Додати Nginx конфіг на VPS

```bash
# Скопіювати конфіг з репозиторію
sudo cp nginx/daikinwroclaw.com.conf /etc/nginx/sites-available/pa.daikinkobierzyce.pl

# Створити symlink
sudo ln -s /etc/nginx/sites-available/pa.daikinkobierzyce.pl /etc/nginx/sites-enabled/

# Перевірити синтаксис
sudo nginx -t
```

Якщо `nginx -t` показав помилку SSL (бо сертифіката ще немає) — тимчасово **закоментуйте** SSL-рядки у конфізі і перезавантажте:
```bash
sudo nano /etc/nginx/sites-available/pa.daikinkobierzyce.pl
# Закоментуйте ці 4 рядки:
#   ssl_certificate ...
#   ssl_certificate_key ...
#   include /etc/letsencrypt/options-ssl-nginx.conf;
#   ssl_dhparam ...

# Також змініть listen на http-only тимчасово:
#   listen 443 ssl http2; → listen 80;

sudo nginx -t && sudo systemctl reload nginx
```

---

### Крок 6. Отримати SSL-сертифікат

```bash
sudo certbot --nginx -d pa.daikinkobierzyce.pl -d www.pa.daikinkobierzyce.pl
```

Certbot автоматично:
- Отримає сертифікат Let's Encrypt
- Впише шляхи до `ssl_certificate` у конфіг
- Додасть автоматичне перенаправлення HTTP → HTTPS

Після успіху:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

### Крок 7. Перевірка

```bash
# 1. Редірект на UA мову
curl -I https://daikinwroclaw.com
# Має бути: 307/308 Location: /ua/

# 2. robots.txt — дозволяє тільки /ua/
curl https://daikinwroclaw.com/robots.txt
# Має показати Allow: /ua/, Disallow: /pl/ ...

# 3. sitemap — URL з /ua/
curl https://daikinwroclaw.com/sitemap.xml | head -30
```

У браузері відкрийте:
- `https://daikinwroclaw.com` → має відкритись `/ua/` (UA мова, UA контакти)
- `https://powerautomation.pl` → продовжує працювати з `/pl/`

---

## Частина 2 — Коли будете переходити на powerautomation.com.ua

### Крок 1. DNS: направити powerautomation.com.ua на ваш VPS

У реєстратора/DNS домену `powerautomation.com.ua`:
```
A    powerautomation.com.ua      →  IP_вашого_VPS
A    www.powerautomation.com.ua  →  IP_вашого_VPS
```

> ⚠️ Дочекайтесь, поки старий VPS для `.com.ua` вимкнений або DNS вже оновився. Перевірте: `nslookup powerautomation.com.ua` — має показати ваш новий IP.

---

### Крок 2. Додати Nginx конфіг для powerautomation.com.ua

```bash
# Створити конфіг (копія daikinwroclaw з новим server_name)
sudo cp /etc/nginx/sites-available/daikinwroclaw.com \
        /etc/nginx/sites-available/powerautomation.com.ua

sudo nano /etc/nginx/sites-available/powerautomation.com.ua
```

Замініть `server_name`:
```nginx
# БУЛО:
server_name daikinwroclaw.com www.daikinwroclaw.com;

# СТАЛО (двічі, в HTTP і HTTPS блоках):
server_name powerautomation.com.ua www.powerautomation.com.ua;
```

Замініть шляхи до SSL і логів:
```nginx
ssl_certificate /etc/letsencrypt/live/powerautomation.com.ua/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/powerautomation.com.ua/privkey.pem;

access_log /var/log/nginx/powerautomation-ua-access.log;
error_log /var/log/nginx/powerautomation-ua-error.log;
```

```bash
sudo ln -s /etc/nginx/sites-available/powerautomation.com.ua /etc/nginx/sites-enabled/
sudo certbot --nginx -d powerautomation.com.ua -d www.powerautomation.com.ua
sudo nginx -t && sudo systemctl reload nginx
```

---

### Крок 3. Оновити .env — прибрати тест, додати реальний домен

```bash
nano .env
```

```bash
# ПРИБРАТИ тестовий домен:
# APP_UA_TEST_HOST=daikinwroclaw.com   ← закоментувати або видалити

# Змінна APP_UA_TEST_HOST більше не потрібна,
# бо powerautomation.com.ua вже прописаний в domain-config.ts напряму
```

```bash
docker-compose up -d --force-recreate app
```

---

### Крок 4. Перевірка переходу

```bash
curl -I https://powerautomation.com.ua
# → Location: /ua/

curl https://powerautomation.com.ua/robots.txt
# → Allow: /ua/, Disallow: /pl/

curl https://powerautomation.pl/robots.txt
# → Allow: /pl/, Disallow: /ua/
```

---

## Швидка шпаргалка команд

```bash
# Перезапустити тільки app-контейнер (підхопить нові .env)
docker-compose up -d --force-recreate app

# Переглянути логи
docker-compose logs -f app --tail=100

# Стан контейнерів
docker-compose ps

# Перевірити Nginx
sudo nginx -t
sudo systemctl reload nginx

# Переглянути сертифікати
sudo certbot certificates
```

---

## Troubleshooting

| Симптом | Що перевірити |
|---------|---------------|
| Сайт не відкривається | `docker-compose ps` — чи запущений app? |
| Показує PL замість UA | `APP_UA_TEST_HOST` в `.env` та `docker-compose up --force-recreate` |
| 502 Bad Gateway | `docker ps` — порт 3060; `curl http://localhost:3060` |
| SSL помилки | `certbot certificates`; `nginx -t` |
| robots.txt не оновився | Очистіть кеш: `curl -H 'Cache-Control: no-cache' https://daikinwroclaw.com/robots.txt` |


## Огляд

Ваш сайт вже працює на **powerautomation.pl**. 
Щоб додати **powerautomation.com.ua**, потрібно:

1. Налаштувати DNS для нового домену
2. Оновити Nginx конфіг
3. Отримати SSL сертифікат
4. Оновити Docker/застосунок (якщо потрібно)
5. Протестувати

---

## 1. DNS конфігурація

Додайте A-записи для **powerautomation.com.ua** у вашому DNS провайдері:

```
A   powerautomation.com.ua      → ВАШ_IP_VPS
A   www.powerautomation.com.ua  → ВАШ_IP_VPS
```

**Перевірка DNS:**
```bash
# Перевірте, чи домен вказує на ваш VPS
nslookup powerautomation.com.ua
dig powerautomation.com.ua
```

---

## 2. Nginx конфігурація

На VPS створіть новий конфіг для Ukraine домену.

### 2.1. Створити конфіг файл

```bash
# Підключіться до VPS
ssh root@ВАШ_IP_VPS

# Створіть конфіг для UA домену
nano /etc/nginx/sites-available/powerautomation.com.ua
```

### 2.2. Вміст конфігу

```nginx
server {
    listen 80;
    server_name powerautomation.com.ua www.powerautomation.com.ua;

    # Redirect to SSL
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name powerautomation.com.ua www.powerautomation.com.ua;

    # SSL сертифікати (будуть створені Certbot)
    ssl_certificate /etc/letsencrypt/live/powerautomation.com.ua/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/powerautomation.com.ua/privkey.pem;

    # SSL налаштування (копіювати з powerautomation.pl)
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Логи
    access_log /var/log/nginx/powerautomation.com.ua.access.log;
    error_log /var/log/nginx/powerautomation.com.ua.error.log;

    # Проксування до Next.js контейнера (той самий, що PL)
    location / {
        proxy_pass http://localhost:3000; # АБО http://nextjs:3000 якщо в Docker network
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;

        # Таймаути
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Статичні файли (як у PL конфігу)
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2.3. Включити конфіг

```bash
# Створити symlink
ln -s /etc/nginx/sites-available/powerautomation.com.ua /etc/nginx/sites-enabled/

# Перевірити конфіг
nginx -t

# Якщо OK, перезавантажити
systemctl reload nginx
```

---

## 3. SSL сертифікат

Використайте Certbot (Let's Encrypt) для отримання безплатного SSL:

```bash
# Встановіть certbot (якщо ще не встановлений)
apt update
apt install certbot python3-certbot-nginx

# Отримайте сертифікат для нового домену
certbot --nginx -d powerautomation.com.ua -d www.powerautomation.com.ua

# Перевірте автоматичне оновлення
certbot renew --dry-run
```

**Certbot автоматично:**
- Отримає сертифікат
- Оновить Nginx конфіг з SSL шляхами
- Налаштує автоматичне оновлення

---

## 4. Docker конфігурація (якщо використовуєте)

### 4.1. Якщо Next.js в Docker

Переконайтеся, що контейнер доступний для обох доменів:

```yaml
# docker-compose.yml
version: '3.8'
services:
  nextjs:
    build: .
    ports:
      - "3000:3000"  # Nginx проксує на цей порт
    environment:
      - NODE_ENV=production
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx:/etc/nginx/conf.d
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - nextjs
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### 4.2. Оновити Nginx в Docker

Якщо Nginx теж в контейнері, додайте конфіг UA домену до `nginx/` теки:

```bash
# На VPS
cd /path/to/your/project
cp nginx/powerautomation.pl.conf nginx/powerautomation.com.ua.conf

# Відредагувати server_name у новому файлі
sed -i 's/powerautomation\\.pl/powerautomation.com.ua/g' nginx/powerautomation.com.ua.conf

# Перезапустити контейнери
docker-compose up -d --force-recreate nginx
```

---

## 5. Тестування

### 5.1. Перевірити accessibility

```bash
# Перевірити, чи сайти доступні
curl -I https://powerautomation.com.ua
curl -I https://powerautomation.pl

# Перевірити SSL
echo | openssl s_client -servername powerautomation.com.ua -connect powerautomation.com.ua:443 2>/dev/null | openssl x509 -noout -dates
```

### 5.2. Перевірити мультидомен функціональність

1. **Локалі за замовчуванням:**
   - `powerautomation.pl` → редірект до `/pl/`
   - `powerautomation.com.ua` → редірект до `/ua/`

2. **robots.txt:**
   - `powerautomation.pl/robots.txt` → дозволяє тільки `/pl/`
   - `powerautomation.com.ua/robots.txt` → дозволяє тільки `/ua/`

3. **sitemap.xml:**
   - `powerautomation.pl/sitemap.xml` → URL з `/pl/`
   - `powerautomation.com.ua/sitemap.xml` → URL з `/ua/`

4. **Контакти:**
   - Перевірити футер і хедер на обох доменах

5. **Платежі:**
   - PL домен: тільки Przelewy24
   - UA домен: тільки LiqPay

---

## 6. Firewall (якщо потрібно)

Переконайтеся, що порти відкриті:

```bash
# Ubuntu/Debian з ufw
ufw allow 80/tcp
ufw allow 443/tcp

# CentOS/RHEL з firewalld
firewall-cmd --permanent --zone=public --add-service=http
firewall-cmd --permanent --zone=public --add-service=https
firewall-cmd --reload
```

---

## 7. Моніторинг

Додайте перевірки для нового домену:

```bash
# Простий health check
echo "*/5 * * * * curl -f https://powerautomation.com.ua > /dev/null 2>&1" | crontab -

# Або використайте существующий monitoring
```

---

## 8. Backup конфігурації

```bash
# Backup Nginx конфігів
tar -czf nginx-configs-$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/

# Backup SSL сертифікатів
tar -czf letsencrypt-$(date +%Y%m%d).tar.gz /etc/letsencrypt/
```

---

## Troubleshooting

### Проблема: DNS не оновився
```bash
# Перевірити DNS
dig powerautomation.com.ua @8.8.8.8
```

### Проблема: SSL не працює
```bash
# Перевірити сертифікати
certbot certificates
nginx -t
systemctl status nginx
```

### Проблема: Сайт не показує UA локаль
```bash
# Перевірити заголовки
curl -H "Host: powerautomation.com.ua" http://localhost:3000 -v
```

### Проблема: 502 Bad Gateway
```bash
# Перевірити, чи працює Next.js
docker ps  # або pm2 list
netstat -tulpn | grep :3000
```

---

## Швидкий чек-ліст

- [ ] DNS A-записи додані
- [ ] Nginx конфіг створений і включений
- [ ] SSL сертифікат отриманий
- [ ] Nginx перезавантажений
- [ ] Firewall налаштований
- [ ] `powerautomation.com.ua` → редірект до `/ua/`
- [ ] `powerautomation.pl` → редірект до `/pl/`
- [ ] robots.txt працює на обох доменах
- [ ] sitemap.xml працює на обох доменах
- [ ] Контакти відображаються правильно
- [ ] Платіжні кнопки фільтруються за доменом

---

## Відкат (якщо щось пішло не так)

```bash
# Відключити новий сайт
rm /etc/nginx/sites-enabled/powerautomation.com.ua
systemctl reload nginx

# Видалити SSL сертифікат
certbot delete --cert-name powerautomation.com.ua
```

Після цього ваш PL домен продовжить працювати як раніше.