# TemuCS Backend - Developer Setup

## 1. Persiapan

- Pastikan sudah install [Node.js](https://nodejs.org/) dan [PostgreSQL](https://www.postgresql.org/).
- Clone repository ini.
- Buat file `.env` dan inisiasi `DATABASE_URL` dengan database lokal Anda, `PORT`, dan `JWT_SECRET`.

## 2. Install Dependencies

```sh
npm install
```

## 3. Setup Database

### a. Apply Migration Otomatis

Karena folder `prisma/migrations` sudah tersedia, jalankan:

```sh
npx prisma migrate deploy
```
> Perintah ini akan menerapkan seluruh migration ke database Anda.

### b. Generate Prisma Client

```sh
npx prisma generate
```

### c. Seed Data Awal (Super Admin)

```sh
node prisma/seed.js
```
> Ini akan membuat user superadmin (username: `superadmin`, password: `admin123`).

## 4. Jalankan Server

```sh
npm run dev
```

## 5. Akses Swagger API Docs

Buka [http://localhost:3000/api-docs](http://localhost:3000/api-docs) di browser.

---

**Catatan:**  
- Jika ingin mengubah struktur database, edit file `prisma/schema.prisma`, lalu jalankan migrate dan generate ulang.
- Untuk seed data lain, edit atau tambahkan script di `prisma/seed.js`.
