# Trackify Assets

A Node.js / Express REST API for tracking company assets, employee assignments, and maintenance records backed by SQL Server.

---

## Tech Stack

| Layer    | Technology                    |
|----------|-------------------------------|
| Runtime  | Node.js                       |
| Framework| Express 5                     |
| Database | Microsoft SQL Server (mssql)  |
| Config   | dotenv                        |

---

## Prerequisites

- Node.js 18+
- SQL Server (local or remote instance)

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables

Copy `.env` and fill in your SQL Server credentials:

```env
DB_SERVER=localhost
DB_USER=trackify_user
DB_PASSWORD=Trackify@123
DB_DATABASE=TrackifyDB
DB_PORT=1433
PORT=5000
```

### 3. Create the database schema

Run `schema.sql` against your SQL Server instance to create all tables and seed demo data:

```bash
sqlcmd -S localhost -U trackify_user -P Trackify@123 -d TrackifyDB -i schema.sql
```

### 4. Start the server

```bash
# Production
npm start

# Development (auto-restart on change)
npm run dev
```

---

## API Reference

All routes are prefixed with `/api`.

### Dashboard

| Method | Endpoint         | Description                               |
|--------|------------------|-------------------------------------------|
| GET    | `/api/dashboard` | Summary counts (assets, employees, etc.)  |

### Departments `/api/departments`

| Method | Endpoint                  | Description           |
|--------|---------------------------|-----------------------|
| GET    | `/api/departments`        | List all departments  |
| GET    | `/api/departments/:id`    | Get department by ID  |
| POST   | `/api/departments`        | Create department     |
| PUT    | `/api/departments/:id`    | Update department     |
| DELETE | `/api/departments/:id`    | Delete department     |

**Body fields:** `DepartmentName` (required)

### Employees `/api/employees`

| Method | Endpoint               | Description        |
|--------|------------------------|--------------------|
| GET    | `/api/employees`       | List all employees |
| GET    | `/api/employees/:id`   | Get employee by ID |
| POST   | `/api/employees`       | Create employee    |
| PUT    | `/api/employees/:id`   | Update employee    |
| DELETE | `/api/employees/:id`   | Delete employee    |

**Body fields:** `FirstName`, `LastName`, `Email` (required); `JobTitle`, `DepartmentID` (optional)

### Assets `/api/assets`

| Method | Endpoint            | Description     |
|--------|---------------------|-----------------|
| GET    | `/api/assets`       | List all assets |
| GET    | `/api/assets/:id`   | Get asset by ID |
| POST   | `/api/assets`       | Create asset    |
| PUT    | `/api/assets/:id`   | Update asset    |
| DELETE | `/api/assets/:id`   | Delete asset    |

**Body fields:** `AssetName` (required); `AssetType`, `SerialNumber`, `PurchaseDate`, `PurchasePrice`, `Status` (`Available` | `Assigned` | `Under Maintenance` | `Retired`), `DepartmentID` (optional)

### Assignments `/api/assignments`

| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/assignments`        | List all assignments     |
| GET    | `/api/assignments/:id`    | Get assignment by ID     |
| POST   | `/api/assignments`        | Create assignment        |
| PUT    | `/api/assignments/:id`    | Update assignment        |
| DELETE | `/api/assignments/:id`    | Delete assignment        |

**Body fields:** `AssetID`, `EmployeeID`, `AssignedDate` (required); `ReturnDate`, `Notes` (optional)

> Creating an assignment automatically sets the asset status to **Assigned**.  
> Deleting an assignment automatically sets the asset status back to **Available**.

### Maintenance `/api/maintenance`

| Method | Endpoint                  | Description                  |
|--------|---------------------------|------------------------------|
| GET    | `/api/maintenance`        | List all maintenance records |
| GET    | `/api/maintenance/:id`    | Get record by ID             |
| POST   | `/api/maintenance`        | Create maintenance record    |
| PUT    | `/api/maintenance/:id`    | Update maintenance record    |
| DELETE | `/api/maintenance/:id`    | Delete maintenance record    |

**Body fields:** `AssetID`, `MaintenanceDate` (required); `Description`, `Cost`, `Status` (`Scheduled` | `In Progress` | `Completed`) (optional)

> Creating a maintenance record (status ≠ Completed) sets the asset to **Under Maintenance**.  
> Updating a record to **Completed** sets the asset back to **Available**.

---

## Database Schema

```
Departments  ──< Employees
Departments  ──< Assets
Assets       ──< Assignments >── Employees
Assets       ──< Maintenance
```