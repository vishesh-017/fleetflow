# 🚚 FleetFlow - Modular Fleet & Logistics Management System

![Python](https://img.shields.io/badge/Python-3.9+-blue)
![React](https://img.shields.io/badge/React-18+-61DAFB)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Setup & Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/vishesh-017/fleetflow.git
cd fleetflow
2️⃣ Backend Setup (Flask)
cd backend
pip install -r requirements.txt
python app.py

Backend runs at:

http://localhost:5000
3️⃣ Frontend Setup (React)
cd frontend
npm install
npm start

Frontend runs at:

http://localhost:3000
📌 Overview

FleetFlow replaces manual logbooks with a centralized digital fleet command center.

It helps organizations manage:

🚘 Vehicles

👨‍✈️ Drivers

🚚 Trip Dispatch

📊 Utilization & Performance Tracking

🎯 Key Features
📊 Command Center Dashboard

Active fleet tracking

Utilization rate calculation

Maintenance alerts

Real-time updates

🚘 Vehicle Management

Add / Edit / Delete vehicles

Unique license plate validation

Capacity tracking (kg)

Status control:

Available

In Shop

On Trip

👨‍✈️ Driver Registry

Driver creation

Assignment validation

Compliance tracking (future scope)

🚚 Trip Dispatch Logic

Workflow:

Select available vehicle

Assign driver

Enter cargo weight

Validate cargo < vehicle capacity

Dispatch

Business Rules:

Vehicles marked “In Shop” cannot be dispatched

Cargo exceeding capacity is blocked

Expired driver licenses block assignment (planned)

🏗️ Tech Stack
Layer	Technology
Backend	Flask + SQLAlchemy + SQLite
Frontend	React 18 + Material UI
API	RESTful JSON
Database	SQLite (PostgreSQL-ready)
📁 Project Structure
fleetflow/
│
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── instance/
│   │   └── fleetflow.db
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── components/
│   ├── package.json
│   └── package-lock.json
│
├── README.md
└── .gitignore
