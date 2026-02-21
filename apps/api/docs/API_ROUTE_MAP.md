# FleetGuard Pro — REST API Route Map

Base path: **/api/v1**  
All endpoints (except Auth login/register/refresh/forgot-password/reset-password) require **Bearer JWT**.  
Roles: `ADMIN`, `MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `FINANCE`.

---

## Auth (`/auth`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|--------|-------------|
| POST | /api/v1/auth/login | No | — | Login with email/password |
| POST | /api/v1/auth/register | No | — | Register new user |
| POST | /api/v1/auth/refresh | No | — | Refresh access token (single-use rotation) |
| POST | /api/v1/auth/logout | Yes | All | Invalidate refresh tokens |
| POST | /api/v1/auth/forgot-password | No | — | Request 6-digit OTP (always 200) |
| POST | /api/v1/auth/reset-password | No | — | Reset password with OTP |

---

## Vehicles (`/vehicles`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|--------|-------------|
| GET | /api/v1/vehicles | Yes | All | List with filters (status, type, region), pagination, sort |
| GET | /api/v1/vehicles/available | Yes | All | Only AVAILABLE (e.g. dispatcher dropdown) |
| GET | /api/v1/vehicles/:id | Yes | All | Detail + last maintenance, active trip, fuel |
| GET | /api/v1/vehicles/:id/history | Yes | All | Status change history |
| GET | /api/v1/vehicles/:id/stats | Yes | All | ROI, cost per km, utilization % |
| POST | /api/v1/vehicles | Yes | ADMIN, MANAGER | Create vehicle |
| PATCH | /api/v1/vehicles/:id | Yes | All | Update (not status directly) |
| DELETE | /api/v1/vehicles/:id | Yes | ADMIN | Soft delete (only if AVAILABLE) |

---

## Trips (`/trips`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|--------|-------------|
| POST | /api/v1/trips | Yes | DISPATCHER, MANAGER, ADMIN | Create trip (transaction, all rules) |
| GET | /api/v1/trips | Yes | All | List with filters (status, vehicle, driver, date) |
| GET | /api/v1/trips/active | Yes | All | Currently active trips |
| GET | /api/v1/trips/:id | Yes | All | Detail + vehicle, driver, fuel logs |
| PATCH | /api/v1/trips/:id/dispatch | Yes | DISPATCHER, MANAGER | DRAFT → DISPATCHED |
| PATCH | /api/v1/trips/:id/start | Yes | All | DISPATCHED → IN_PROGRESS |
| PATCH | /api/v1/trips/:id/complete | Yes | All | IN_PROGRESS → COMPLETED, release vehicle/driver |
| PATCH | /api/v1/trips/:id/cancel | Yes | All | Cancel (DRAFT/DISPATCHED) with reason |

---

## Maintenance (`/maintenance`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|--------|-------------|
| POST | /api/v1/maintenance | Yes | All | Create log (sets vehicle IN_SHOP) |
| PATCH | /api/v1/maintenance/:id/complete | Yes | All | Mark done, set vehicle AVAILABLE |
| GET | /api/v1/maintenance | Yes | All | List with filters |
| GET | /api/v1/maintenance/overdue | Yes | All | Vehicles past maintenance interval |

---

## Fuel (`/fuel`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|--------|-------------|
| POST | /api/v1/fuel | Yes | All | Log fuel (trip or standalone) |
| GET | /api/v1/fuel/vehicle/:id | Yes | All | Fuel history for vehicle |
| GET | /api/v1/fuel/anomalies | Yes | FINANCE, ADMIN | Flagged anomalies |
| GET | /api/v1/fuel/stats | Yes | All | Fleet efficiency stats |

---

## Expenses (`/expenses`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|--------|-------------|
| POST | /api/v1/expenses | Yes | All | Log expense |
| GET | /api/v1/expenses | Yes | All | List (category, date filters) |
| GET | /api/v1/expenses/report | Yes | FINANCE, ADMIN | Monthly breakdown per vehicle |

---

## Drivers (`/drivers`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|--------|-------------|
| GET | /api/v1/drivers | Yes | All | List drivers |
| GET | /api/v1/drivers/expiring-licenses | Yes | All | Licenses expiring in 30 days |
| GET | /api/v1/drivers/:id | Yes | All | Driver detail |
| GET | /api/v1/drivers/:id/performance | Yes | All | Trip stats, safety score, violations |
| POST | /api/v1/drivers | Yes | All | Create driver |
| PATCH | /api/v1/drivers/:id | Yes | All | Update driver |
| DELETE | /api/v1/drivers/:id | Yes | All | Soft delete |
| POST | /api/v1/drivers/:id/violations | Yes | SAFETY_OFFICER, ADMIN | Record violation |
| PATCH | /api/v1/drivers/:id/status | Yes | ADMIN | Manual status override |

---

## Analytics (`/analytics`) — read-only

| Method | Path | Auth | Roles | Description |
|--------|------|------|--------|-------------|
| GET | /api/v1/analytics/fleet-utilization | Yes | All | Utilization % (from, to, vehicleType) |
| GET | /api/v1/analytics/fuel-efficiency | Yes | All | By vehicleId, from, to |
| GET | /api/v1/analytics/cost-per-km | Yes | All | By vehicleId, from, to |
| GET | /api/v1/analytics/vehicle-roi/:id | Yes | All | Vehicle ROI |
| GET | /api/v1/analytics/expense-breakdown | Yes | All | Pie data (from, to) |
| GET | /api/v1/analytics/driver-performance | Yes | All | By driverId |
| GET | /api/v1/analytics/export | Yes | All | type=csv\|pdf, report=fuel\|expenses\|utilization, from, to |

---

## Admin (`/admin`) — ADMIN only

| Method | Path | Auth | Roles | Description |
|--------|------|------|--------|-------------|
| GET | /api/v1/admin/config | Yes | ADMIN | Read SystemConfig |
| PUT | /api/v1/admin/config | Yes | ADMIN | Update SystemConfig |
| GET | /api/v1/admin/feature-flags | Yes | ADMIN | List feature flags |
| PUT | /api/v1/admin/feature-flags | Yes | ADMIN | Toggle feature |
| GET | /api/v1/admin/audit-log | Yes | ADMIN | Audit log (user, action, date filters) |
| GET | /api/v1/admin/system-health | Yes | ADMIN | DB, latency, sessions |
| GET | /api/v1/admin/role-permissions | Yes | ADMIN | RBAC map (read-only) |

---

**Swagger (OpenAPI):** `GET /api/docs` when the API is running.
