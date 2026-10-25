---
layout: default
title: HTTPS
nav_order: 3
parent: Server setup
---

> **The server now uses [Caddy](https://caddyserver.com/) instead of Nginx.** Caddy obtains and renews the Let's Encrypt certificate itself, and its configuration is [`server/caddy/Caddyfile`](https://github.com/hl7-eu/tx.hl7europe.eu/blob/master/server/caddy/Caddyfile). To change it, see [Updating the server](updates.html#caddy). The Nginx setup below is kept for reference only.

# Secure FHIR Server with Nginx and Let's Encrypt

How to set u behind **Nginx with HTTPS** using **Let's Encrypt** inside Docker.  




## **Summary**
- Nginx acts as a **reverse proxy**.
- **Let's Encrypt** provides a free SSL certificate.
- **Certbot** automatically renews SSL certificates.
- **Docker Compose** simplifies deployment.

| **Step** | **Command** |
|----------|------------|
| **1️⃣ Prepare Folders** | `mkdir -p certbot/www certbot/letsencrypt nginx` |
| **2️⃣ Configure Nginx (No SSL)** | Edit `nginx/default.conf` |
| **3️⃣ Start Nginx & FHIR Server** | `docker-compose up -d` |
| **4️⃣ Obtain SSL Certificate** | `docker run --rm certbot/certbot certonly --webroot ...` |
| **5️⃣ Generate `ssl-dhparams.pem`** | `openssl dhparam -out certbot/letsencrypt/ssl-dhparams.pem 2048` |
| **6️⃣ Enable SSL in Nginx** | Edit `nginx/default.conf`, restart Nginx |
| **7️⃣ Test HTTPS** | `curl -I https://tx.hl7europe.eu` |
| **8️⃣ Set Up Auto-Renewal** | `crontab -e` |


---

## **📁 Folder Structure**
```
/project-root
│── certbot/
│   ├── www/                 # Stores Let's Encrypt challenge files
│   ├── letsencrypt/         # Stores SSL certificates
│── nginx/
│   ├── default.conf         # Nginx configuration
│── docker-compose.yml       # Service definitions
```

---

## **🟢 Step 1: Prepare the Environment**

Run:
```bash
mkdir -p certbot/www certbot/letsencrypt nginx
```

---

## **🟡 Step 2: Configure Nginx (Initial Setup Without SSL)**
Before getting an SSL certificate, **Nginx must run on port 80**.

### 🔹 **Edit `nginx/default.conf`**
```nginx
server {
    listen 80;
    server_name tx.hl7europe.eu;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```

---

## **🔵 Step 3: Deploy Nginx & FHIR Server**
### 🔹 **Edit `docker-compose.yml`**
```yaml
version: '3.8'

services:
  fhirserver:
    image: ghcr.io/healthintersections/fhirserver:nightly
    volumes:
      - ./txcache:/var/cache/txcache
      - ./config:/root/fhirserver/config
    container_name: tx-fhir
    expose:
      - "80"
    networks:
      - fhir_network

  nginx:
    image: nginx:latest
    container_name: tx-nginx
    volumes:
      - ./nginx:/etc/nginx/conf.d
      - ./certbot/www:/var/www/certbot
    ports:
      - "80:80"
    depends_on:
      - fhirserver
    networks:
      - fhir_network
    restart: unless-stopped

networks:
  fhir_network:
    driver: bridge
```

### 🔹 **Start the Services**
```bash
docker-compose up -d
```

Verify:
```bash
docker ps
```

---

## **🟣 Step 4: Obtain an SSL Certificate**
Once Nginx is running, request an SSL certificate from Let's Encrypt.

Run:
```bash
docker run --rm \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  -v "$(pwd)/certbot/letsencrypt:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d tx.hl7europe.eu \
  --register-unsafely-without-email \
  --agree-tos \
  --non-interactive
```

Verify:
```bash
ls -l certbot/letsencrypt/live/tx.hl7europe.eu/
```
✅ Expected files:
```
cert.pem  chain.pem  fullchain.pem  privkey.pem
```

---

## **🟠 Step 5: Enable SSL in Nginx**
Once SSL is issued, update Nginx for **HTTPS**.

### 🔹 **Generate `ssl-dhparams.pem`**
```bash
openssl dhparam -out certbot/letsencrypt/ssl-dhparams.pem 2048
```

### 🔹 **Update `nginx/default.conf`**
```nginx
server {
    listen 80;
    server_name tx.hl7europe.eu;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name tx.hl7europe.eu;

    ssl_certificate /etc/letsencrypt/live/tx.hl7europe.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tx.hl7europe.eu/privkey.pem;

    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://fhirserver:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 🔹 **Update `docker-compose.yml`**
```yaml
  nginx:
    volumes:
      - ./certbot/www:/var/www/certbot
      - ./certbot/letsencrypt:/etc/letsencrypt
```

### 🔹 **Restart Everything**
```bash
docker-compose down
docker-compose up -d
```

---

## **✅ Step 6: Test HTTPS**
Check:
```bash
curl -I https://tx.hl7europe.eu
```
✅ Expected output:
```
HTTP/2 200
```

---

## **🔄 Step 7: Enable Auto-Renewal**
Let's Encrypt certificates expire every **90 days**.

### 🔹 **Test Renewal**
```bash
docker run --rm \
  -v "$(pwd)/certbot/letsencrypt:/etc/letsencrypt" \
  certbot/certbot renew --dry-run
```

### 🔹 **Set Up a Cron Job**
Edit crontab:
```bash
crontab -e
```
Add:
```
0 12 * * * docker run --rm -v "$(pwd)/certbot/letsencrypt:/etc/letsencrypt" certbot/certbot renew --quiet && docker-compose restart nginx
```
✅ This checks for renewal **daily at noon**.

---
