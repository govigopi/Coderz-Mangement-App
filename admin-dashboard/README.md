# Institute Admin Dashboard (React)

Web admin for the Institute Management app. Uses the same Node.js backend API.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Create `.env` (or use defaults):

   ```
   VITE_API_URL=http://localhost:5000/api
   ```

   Ensure the backend is running and CORS allows this origin.

3. **Run**

   ```bash
   npm run dev
   ```

   Opens at **http://localhost:5174**

## Login

Use the same credentials as the backend (e.g. **admin@institute.com** / **code123** after running the seed script).

## Sections

- **Dashboard** – Counts, monthly income chart
- **Students** – List, search, add/edit/delete, admission invoice option
- **Courses** – CRUD courses
- **Billing / Invoices** – Pending/partial invoices, record payment, download PDF
- **Income & Expense** – View income and expense with optional date range
- **Marks** – Select student, view marks, download marks PDF
- **Reports** – Revenue per student, download Income & Expense Excel

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host.
