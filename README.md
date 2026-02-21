# FleetFlow 🚚 - Modular Fleet & Logistics Management System

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)
![React 18+](https://img.shields.io/badge/react-18+-61DAFB.svg)

---

## 🎯 Project Overview

FleetFlow replaces manual logbooks with a **centralized digital hub** for:

- Fleet lifecycle management  
- Driver safety monitoring  
- Financial performance tracking  

### 👥 Target Users
- Fleet Managers (vehicle health, scheduling)
- Dispatchers (trip creation, cargo validation)
- Safety Officers (driver compliance)
- Financial Analysts (fuel spend, ROI)

---

## ✨ Core Features

### 📊 Command Center Dashboard

Active Fleet: 3/5 vehicles
Maintenance Alerts: 1
Utilization Rate: 60%
Pending Cargo: 2 shipments


**Filters:** Vehicle Type | Status | Region

---

### 🚘 Vehicle Registry
- Full CRUD operations
- License Plate (Unique ID)
- Max Load Capacity (kg/tons)
- Status:
  - Available
  - In Shop
  - On Trip

---

### 🚚 Trip Dispatcher


Create Trip Workflow:

Select Available Vehicle + Driver

Enter Cargo Weight

VALIDATION: Cargo < Capacity ✓

Status: Draft → Dispatched → Completed


---

### 🔐 Key Logic Rules


Vehicle "In Shop" → Hidden from Dispatch
Cargo 450kg < Van 500kg Capacity → PASS
License Expired → Block Driver Assignment


---

## 🏗️ Tech Stack

| Component | Technology |
|------------|------------|
| Backend | Flask + SQLAlchemy + SQLite |
| Frontend | React 18 + Material-UI |
| API | RESTful JSON |
| Real-time | Auto-refresh dashboard |

---

## 🚀 Quick Start

### 1️⃣ Clone & Setup

```bash
git clone <your-repo-url>
cd FleetFlow
2️⃣ Backend Setup
cd backend
pip install -r requirements.txt
python app.py

Backend runs at:

http://localhost:5000
3️⃣ Frontend Setup
cd frontend
npm install
npm start

Frontend runs at:

http://localhost:3000
4️⃣ MVP Test Workflow
1. Open localhost:3000
2. Add Vehicle: VAN001 + 500kg
3. Add Driver: Alex
4. Verify Dashboard updates

✅ MVP COMPLETE

📊 API Endpoints
Method	Endpoint	Description
GET	/vehicles	List vehicles
POST	/vehicles	Create vehicle
GET	/drivers	List drivers
POST	/drivers	Create driver
GET	/dashboard	KPI summary
📁 Project Structure
FleetFlow/
│
├── backend/
│   ├── app.py
│   └── fleetflow.db
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── requirements.txt
└── README.md
👥 Team Sprint Plan (8hr MVP)
Role	Time	Responsibility
Tech Lead	2hr	Backend APIs + DB
Frontend Dev	4hr	React UI
Full Stack	1hr	API Integration
QA	1hr	Testing

Daily Standup: 15 minutes
Code Merge: GitHub PR

🚧 Upcoming Features
Sprint 2

Trip creation form

Cargo validation logic

Maintenance auto-toggle

Sprint 3

Expense logging

Cost-per-km analytics

CSV/PDF export

🔒 Security

SQLAlchemy ORM protection

CORS enabled

PostgreSQL upgrade-ready

JWT authentication (future enhancement)

🌍 Deployment

Backend:

Render

Heroku

Frontend:

Vercel

Netlify

Database:

PostgreSQL (Railway / Supabase)

🤝 Contributing
git checkout -b feature/new-feature
git commit -m "Add new feature"
git push origin feature/new-feature

Then open a Pull Request.

📄 License

MIT License © 2026 Team FleetFlow
