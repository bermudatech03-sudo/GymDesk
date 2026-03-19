# GymPro CRM

Full-stack Gym Management System built with Django + React + Vite + PostgreSQL.

## Features
- Admin dashboard with live analytics (income, expenses, savings, member stats)
- Member management (enroll, renew, cancel, search, filter)
- Staff management (attendance, shifts, salary payments)
- Equipment tracking (condition, maintenance scheduling)
- Finance module (income, expenditure, savings trend charts)
- Automated notifications (WhatsApp, Email, SMS via Twilio)
- JWT authentication with role-based access

## Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create PostgreSQL database
createdb gym_crm

# Configure env
cp .env .env.local              # Edit with your DB credentials

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Open in browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

## Database: PostgreSQL (why not SQLite3)
This app uses PostgreSQL because:
- Concurrent writes from multiple admin/staff users
- Complex analytics queries (GROUP BY month, SUM, JOIN)
- JSON aggregation for notification logs
- Production-ready from day one
- Better performance with 1000+ members and attendance records

## Environment Variables (.env)
```
SECRET_KEY=your-secret-key
DB_NAME=gym_crm
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## API Endpoints
| Module | Endpoint |
|--------|----------|
| Auth | `/api/auth/login/` `/api/auth/me/` |
| Members | `/api/members/list/` `/api/members/plans/` |
| Staff | `/api/staff/members/` `/api/staff/attendance/` `/api/staff/payments/` |
| Equipment | `/api/equipment/list/` `/api/equipment/maintenance/` |
| Finances | `/api/finances/income/` `/api/finances/expenditure/` `/api/finances/summary/` |
| Notifications | `/api/notifications/` |
