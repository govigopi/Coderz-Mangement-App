# Institute Management App

Full-stack app for managing an institute: **students**, **courses**, **billing**, **income/expense**, **marks**, and **reports**.

## Features

- **Student Management** – Add/Edit/Delete students, personal details, admission date, courses enrolled (CRUD), contact info
- **Billing & Fees** – Generate invoice at admission, track paid/pending, print/download invoice, view pending dues
- **Income & Expense** – Add expenses (Salaries, Rent, etc.) and income (fees); daily/monthly filters and reports
- **Marks / Academic** – Subject-wise marks per student, reports, grading, export/print PDF
- **Business Metrics** – Revenue per student, total revenue, monthly income charts, dashboard

## Tech Stack

- **Backend:** Node.js, Express, MongoDB
- **Mobile:** Flutter
- **Admin Dashboard:** React (Vite + TypeScript + Tailwind)
- **Reports:** PDF (PDFKit), Excel (ExcelJS)

---

## Backend Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Steps

1. **Install dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `PORT=5000`
   - `MONGODB_URI=mongodb://localhost:27017/institute_management` (or your MongoDB URL)
   - `JWT_SECRET=<a-long-random-secret>`

3. **Seed admin user** (optional)

   ```bash
   node scripts/seed-admin.js
   ```

   Default login: **admin@institute.com** / **admin123**

4. **Run server**

   ```bash
   npm run dev
   ```

   API base: `http://localhost:5000/api`

### API Overview

| Route | Description |
|-------|-------------|
| `POST /api/auth/admin/login` | Admin login |
| `POST /api/auth/staff/login` | Staff login |
| `POST /api/auth/login` | Generic login (optional `role`) |
| `GET /api/auth/me` | Current user (auth) |
| `POST /api/auth/register` | Create user (admin only) |
| `GET/POST/PUT/DELETE /api/courses` | Courses CRUD |
| `GET/POST/PUT/DELETE /api/students` | Students CRUD |
| `GET/POST /api/invoices`, `POST /api/invoices/:id/pay` | Invoices & payment |
| `GET/POST/PUT/DELETE /api/expenses` | Expenses |
| `GET/POST /api/income` | Income |
| `GET/POST/PUT/DELETE /api/marks` | Marks |
| `GET /api/reports/dashboard` | Dashboard metrics |
| `GET /api/reports/monthly-income` | Monthly income (charts) |
| `GET /api/reports/revenue-per-student` | Revenue metrics |
| `GET /api/reports/invoice-pdf/:id` | Invoice PDF |
| `GET /api/reports/marks-pdf/:studentId` | Marks PDF |
| `GET /api/reports/income-expense-excel` | Income/Expense Excel |

---

## Admin Dashboard (React)

Web admin using the same API. Separate from the Flutter app.

### Prerequisites

- Node.js 18+

### Steps

1. **Install and run**

   ```bash
   cd admin-dashboard
   npm install
   npm run dev
   ```

2. **Environment**

   Create `.env` with `VITE_API_URL=http://localhost:5000/api` (or leave default). Ensure the backend is running.

3. Open **http://localhost:5174** and log in (e.g. **admin@institute.com** / **admin123**).

### Dashboard sections

- **Dashboard** – Metrics and monthly income chart
- **Students** – List, search, add/edit/delete, optional admission invoice
- **Courses** – CRUD
- **Billing / Invoices** – Pending/partial list, record payment, download invoice PDF
- **Income & Expense** – View with date range filter
- **Marks** – By student, download marks PDF
- **Reports** – Revenue per student, download Income & Expense Excel

See `admin-dashboard/README.md` for more details.

---

## Flutter App Setup

### Prerequisites

- Flutter SDK 3.2+

### Steps

1. **Install dependencies**

   ```bash
   cd mobile
   flutter pub get
   ```

2. **API URL**

   Edit `lib/config/api_config.dart`:

   - **Android emulator:** `http://10.0.2.2:5000/api` (default)
   - **iOS simulator:** `http://localhost:5000/api`
   - **Real device:** Use your PC’s IP, e.g. `http://192.168.1.10:5000/api`

   Set both `baseUrl` and `serverOrigin` (same host, with and without `/api`).

3. **Run**

   ```bash
   flutter run
   ```

### App Screens

1. **Login** – Email/password (use seeded admin or register)
2. **Dashboard** – Counts, monthly income, pending fees, today income
3. **Students** – List, search, add/edit/delete, open add screen for billing
4. **Pending Fees** – List pending/partial invoices, Pay, Download PDF
5. **Income & Expense** – Tabs for income/expense, date filter, add income/expense
6. **Marks** – Select student, list marks, add marks, download marks PDF
7. **Reports** – Revenue per student, download Income/Expense Excel
8. **Courses** – CRUD courses (used when adding students)

---

## Data Structure (MongoDB)

- **users** – name, email, password (hashed), role
- **courses** – name, duration, fee, description
- **students** – name, mobile, email, guardian, address, admissionDate, courses[], totalFees, paidAmount, pendingAmount, status
- **invoices** – studentId, amount, paidAmount, date, status, invoiceNumber
- **expenses** – amount, date, category, description
- **income** – amount, date, source, description, studentId, invoiceId
- **marks** – studentId, subject, marks, maxMarks, examDate, term

---

## Quick Start

1. Start MongoDB.
2. In `backend`: `npm install`, create `.env`, `node scripts/seed-admin.js`, `npm run dev`.
3. **Admin (web):** In `admin-dashboard`: `npm install`, `npm run dev` → http://localhost:5174
4. **Mobile:** In `mobile`: set `api_config.dart` for your environment, `flutter pub get`, `flutter run`.
5. Log in with **admin@institute.com** / **admin123** in either the dashboard or the app.

For production, use a strong `JWT_SECRET`, HTTPS, and a proper MongoDB deployment (e.g. Atlas).
