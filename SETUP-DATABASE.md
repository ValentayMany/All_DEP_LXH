# LHMS e-Doc — ติดตั้ง Database (PHP + MySQL)

โปรเจ็กต์นี้ใช้ **PHP** เชื่อมต่อ **MySQL/MariaDB** แทน Supabase สำหรับ API ทั้งหมด (`/api/*`)

## สิ่งที่ต้องมี

- PHP 8.1+ (เปิด extension `pdo_mysql`)
- MySQL หรือ MariaDB
- XAMPP / Laragon / หรือ `php` ใน PATH

## 1) สร้างฐานข้อมูล

ใน phpMyAdmin หรือ command line:

```bash
mysql -u root -p < database/mysql-schema.sql
mysql -u root -p lhms_edoc < database/mysql-documents-seed.sql
```

## 2) ตั้งค่า `.env`

คัดลอกจาก `.env.example` แล้วแก้ค่า:

```
DB_HOST=127.0.0.1
DB_NAME=lhms_edoc
DB_USER=root
DB_PASS=รหัสผ่านของคุณ
JWT_SECRET=สตริงยาวๆ แบบสุ่ม
```

## 3) รันเว็บ

### วิธี A — PHP built-in server (แนะนำทดสอบ)

จากโฟลเดอร์โปรเจ็กต์:

```bash
php -S localhost:3000 router.php
```

เปิดเบราว์เซอร์: `http://localhost:3000`

### วิธี B — XAMPP

1. คัดลอกโฟลเดอร์ไปที่ `C:\xampp\htdocs\lhms-edoc`
2. เปิด Apache + MySQL
3. ตั้ง Virtual Host ชี้ DocumentRoot ไปที่โฟลเดอร์โปรเจ็กต์ (มี `.htaccess` ที่ root)
4. หรือเข้า `http://localhost/lhms-edoc/public/` และให้ `public/.htaccess` ส่ง `/api` ไป PHP

## บัญชีทดสอบ (หลัง import schema)

| Username | Password   |
|----------|------------|
| admin    | admin1234  |
| HR       | HR1234     |
| AD       | ADM1234    |

## โครงสร้าง API (PHP)

| Method | Path |
|--------|------|
| POST | `/api/auth/login` |
| POST | `/api/auth/register` |
| GET | `/api/departments` |
| GET/POST | `/api/documents` |
| GET | `/api/documents/next-number?dept=...` |
| PUT/DELETE | `/api/documents/{docNumber}` |
| GET/POST | `/api/approvers` |
| GET | `/api/approvers/active?dept=...` |
| PUT | `/api/approvers/{id}` |

## Node.js (เวอร์ชันเก่า)

ยังมี `server/` สำหรับ Supabase อยู่ หากต้องการใช้ PHP เป็นหลัก ให้รันผ่าน `router.php` หรือ Apache แทน `npm start`
