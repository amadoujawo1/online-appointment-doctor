# MediBook — Online Doctor Appointment Platform

A full-stack, production-ready healthcare appointment web application with role-based access for **Patients**, **Doctors**, and **Administrators**.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Vanilla CSS |
| Backend | Node.js + Express.js (REST API) |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (access + refresh tokens) + bcryptjs |
| File Uploads | Multer (doctor profile photos) |

---

## Quick Start

You need **two terminals** — one for the backend and one for the frontend.

### Terminal 1 — Backend API (Port 5000)

```bash
cd backend
npm install       # first time only
npm run dev       # starts with nodemon auto-reload
```

The backend starts at `http://localhost:5000`.  
On first launch it **automatically seeds** sample data (8 doctors, 2 patients, 1 admin).

### Terminal 2 — Frontend (Port 3000)

```bash
cd frontend
npm install       # first time only
npm run dev       # starts Next.js dev server
```

Open `http://localhost:3000` in your browser.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@medibook.com | admin123 |
| **Doctor** | sarah.johnson@medibook.com | doctor123 |
| **Doctor** | michael.chen@medibook.com | doctor123 |
| **Patient** | alice@example.com | patient123 |
| **Patient** | bob@example.com | patient123 |

> All 8 demo doctors share the password `doctor123`.

---

## Features

### 👤 Patient Portal
- Register/Login with secure JWT authentication
- Search & filter doctors by specialty, city, fee, rating
- Book appointments by selecting date + available time slot
- View, reschedule, and cancel upcoming appointments
- Write star reviews for completed consultations
- Manage medical profile (blood group, allergies, medications, emergency contact)

### 🩺 Doctor Portal
- Register and set up professional profile
- Upload profile photo
- Configure weekly availability schedule (per-day hours + slot duration)
- View today's schedule and pending booking requests
- Confirm, reject, or mark appointments as complete
- Add consultation notes on appointment completion
- View patient intake records and medical history

### ⚙️ Admin Portal
- Platform analytics dashboard (patients, doctors, revenue, ratings)
- Doctor verification management (approve/revoke)
- Specialty catalog CRUD (add/edit/delete medical categories)
- Global appointments audit log with status filters

---

## Project Structure

```
OnlineDoctorAppointment/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js    # SQLite init & migrations
│   │   │   └── mailer.js      # Nodemailer (email notifications)
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT verify + RBAC guards
│   │   │   └── error.js       # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.js        # Register, Login, Refresh, Logout, Me
│   │   │   ├── doctors.js     # Doctor search, profile, slots, availability
│   │   │   ├── patients.js    # Patient profile management
│   │   │   ├── appointments.js# Full appointment lifecycle
│   │   │   ├── reviews.js     # Submit & list reviews
│   │   │   ├── notifications.js # In-app alerts
│   │   │   ├── admin.js       # Admin management & analytics
│   │   │   └── specialties.js # Public specialties list
│   │   └── utils/
│   │       └── seed.js        # Database seed with demo data
│   └── uploads/               # Doctor profile photos (auto-created)
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx                    # Homepage (hero, specialties, how-it-works)
        │   ├── login/page.tsx              # Login page (role tabs)
        │   ├── register/page.tsx           # Multi-step registration
        │   ├── doctors/page.tsx            # Doctor search & filters
        │   ├── doctors/[id]/page.tsx       # Doctor profile + booking widget
        │   ├── patient/
        │   │   ├── layout.tsx              # Patient portal guard
        │   │   ├── dashboard/page.tsx      # Patient dashboard
        │   │   ├── appointments/page.tsx   # Appointment history
        │   │   └── profile/page.tsx        # Medical profile editor
        │   ├── doctor/
        │   │   ├── layout.tsx              # Doctor portal guard
        │   │   ├── dashboard/page.tsx      # Doctor dashboard
        │   │   ├── appointments/page.tsx   # Appointment management
        │   │   ├── schedule/page.tsx       # Availability schedule editor
        │   │   └── profile/page.tsx        # Doctor profile editor
        │   └── admin/
        │       ├── layout.tsx              # Admin portal guard
        │       ├── dashboard/page.tsx      # Analytics dashboard
        │       ├── doctors/page.tsx        # Doctor verification
        │       ├── specialties/page.tsx    # Specialty CRUD
        │       └── appointments/page.tsx   # Platform-wide audit log
        ├── components/
        │   └── Navbar.tsx                  # Role-aware nav + notifications
        └── lib/
            ├── api.ts                      # Fetch-based API client w/ refresh
            └── auth.tsx                    # Auth context + hooks
```

---

## Environment Variables

### Backend `.env`
```env
PORT=5000
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
FRONTEND_URL=http://localhost:3000
# Email (optional — in-app notifications work without this)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
```

### Frontend `.env.local` (optional)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | — | Register patient or doctor |
| POST | /api/auth/login | — | Login, returns JWT tokens |
| POST | /api/auth/refresh | — | Rotate refresh token |
| GET | /api/auth/me | JWT | Current user profile |
| GET | /api/doctors | — | Search/filter doctors |
| GET | /api/doctors/:id | — | Doctor full profile |
| GET | /api/doctors/:id/slots | — | Available time slots for date |
| GET | /api/doctors/me | Doctor | Own doctor profile |
| PUT | /api/doctors/:id | Doctor | Update profile + photo |
| PUT | /api/doctors/:id/availability | Doctor | Set weekly schedule |
| GET | /api/patients/me | Patient | My medical profile |
| PUT | /api/patients/me | Patient | Update medical profile |
| POST | /api/appointments | Patient | Book appointment |
| GET | /api/appointments | JWT | List appointments (role-filtered) |
| PUT | /api/appointments/:id | Patient | Reschedule |
| DELETE | /api/appointments/:id | Patient | Cancel |
| PATCH | /api/appointments/:id/status | Doctor | Confirm/Complete/Cancel |
| POST | /api/reviews | Patient | Submit review (completed only) |
| GET | /api/notifications | JWT | List notifications |
| PATCH | /api/notifications/:id/read | JWT | Mark notification read |
| GET | /api/admin/stats | Admin | Platform analytics |
| GET | /api/admin/doctors | Admin | All doctors + verification status |
| PATCH | /api/admin/doctors/:id/verify | Admin | Approve/revoke doctor |
| GET/POST/PUT/DELETE | /api/admin/specialties | Admin | Specialty CRUD |
