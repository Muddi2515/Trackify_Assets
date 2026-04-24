-- =============================================================
-- Trackify Assets - SQL Server Schema
-- Run this script against the TrackifyDB database
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Departments
-- ---------------------------------------------------------------
IF OBJECT_ID('dbo.Departments', 'U') IS NULL
BEGIN
  CREATE TABLE Departments (
    DepartmentID   INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentName NVARCHAR(100) NOT NULL UNIQUE
  );
END;

-- ---------------------------------------------------------------
-- 2. Employees
-- ---------------------------------------------------------------
IF OBJECT_ID('dbo.Employees', 'U') IS NULL
BEGIN
  CREATE TABLE Employees (
    EmployeeID   INT IDENTITY(1,1) PRIMARY KEY,
    FirstName    NVARCHAR(50)  NOT NULL,
    LastName     NVARCHAR(50)  NOT NULL,
    Email        NVARCHAR(100) NOT NULL UNIQUE,
    JobTitle     NVARCHAR(100) NULL,
    DepartmentID INT           NULL REFERENCES Departments(DepartmentID) ON DELETE SET NULL
  );
END;

-- ---------------------------------------------------------------
-- 3. Assets
-- ---------------------------------------------------------------
IF OBJECT_ID('dbo.Assets', 'U') IS NULL
BEGIN
  CREATE TABLE Assets (
    AssetID       INT IDENTITY(1,1) PRIMARY KEY,
    AssetName     NVARCHAR(100)  NOT NULL,
    AssetType     NVARCHAR(50)   NULL,
    SerialNumber  NVARCHAR(100)  NULL UNIQUE,
    PurchaseDate  DATE           NULL,
    PurchasePrice DECIMAL(10,2)  NULL,
    Status        NVARCHAR(30)   NOT NULL DEFAULT 'Available'
                    CHECK (Status IN ('Available','Assigned','Under Maintenance','Retired')),
    DepartmentID  INT            NULL REFERENCES Departments(DepartmentID) ON DELETE SET NULL
  );
END;

-- ---------------------------------------------------------------
-- 4. Assignments
-- ---------------------------------------------------------------
IF OBJECT_ID('dbo.Assignments', 'U') IS NULL
BEGIN
  CREATE TABLE Assignments (
    AssignmentID   INT IDENTITY(1,1) PRIMARY KEY,
    AssetID        INT  NOT NULL REFERENCES Assets(AssetID)    ON DELETE CASCADE,
    EmployeeID     INT  NOT NULL REFERENCES Employees(EmployeeID) ON DELETE CASCADE,
    AssignedDate   DATE NOT NULL,
    ReturnDate     DATE NULL,
    Notes          NVARCHAR(500) NULL
  );
END;

-- ---------------------------------------------------------------
-- 5. Maintenance
-- ---------------------------------------------------------------
IF OBJECT_ID('dbo.Maintenance', 'U') IS NULL
BEGIN
  CREATE TABLE Maintenance (
    MaintenanceID   INT IDENTITY(1,1) PRIMARY KEY,
    AssetID         INT           NOT NULL REFERENCES Assets(AssetID) ON DELETE CASCADE,
    MaintenanceDate DATE          NOT NULL,
    Description     NVARCHAR(500) NULL,
    Cost            DECIMAL(10,2) NULL,
    Status          NVARCHAR(30)  NOT NULL DEFAULT 'Scheduled'
                      CHECK (Status IN ('Scheduled','In Progress','Completed'))
  );
END;

-- ---------------------------------------------------------------
-- Seed data (safe to re-run - skips if rows already exist)
-- ---------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Departments)
BEGIN
  INSERT INTO Departments (DepartmentName) VALUES
    ('IT'),
    ('HR'),
    ('Finance'),
    ('Operations'),
    ('Marketing');
END;

IF NOT EXISTS (SELECT 1 FROM Employees)
BEGIN
  INSERT INTO Employees (FirstName, LastName, Email, JobTitle, DepartmentID) VALUES
    ('Alice',   'Smith',   'alice.smith@company.com',   'IT Manager',       1),
    ('Bob',     'Johnson', 'bob.johnson@company.com',   'HR Specialist',    2),
    ('Carol',   'Williams','carol.williams@company.com','Financial Analyst', 3),
    ('David',   'Brown',   'david.brown@company.com',   'Operations Lead',  4),
    ('Eve',     'Davis',   'eve.davis@company.com',     'Marketing Manager',5);
END;

IF NOT EXISTS (SELECT 1 FROM Assets)
BEGIN
  INSERT INTO Assets (AssetName, AssetType, SerialNumber, PurchaseDate, PurchasePrice, Status, DepartmentID) VALUES
    ('Dell Laptop 001',    'Laptop',   'SN-DELL-001', '2023-01-15', 1200.00, 'Assigned',           1),
    ('HP Laptop 002',      'Laptop',   'SN-HP-002',   '2023-02-20', 1100.00, 'Available',          1),
    ('iPhone 14 001',      'Phone',    'SN-IP14-001', '2023-03-10',  900.00, 'Assigned',           2),
    ('Office Desk 001',    'Furniture','SN-DESK-001', '2022-06-01',  350.00, 'Assigned',           3),
    ('Canon Printer 001',  'Printer',  'SN-CAN-001',  '2022-11-05',  450.00, 'Under Maintenance',  4);
END;

IF NOT EXISTS (SELECT 1 FROM Assignments)
BEGIN
  INSERT INTO Assignments (AssetID, EmployeeID, AssignedDate, ReturnDate, Notes) VALUES
    (1, 1, '2023-01-20', NULL,         'Primary work laptop'),
    (3, 2, '2023-03-15', NULL,         'Company phone'),
    (4, 3, '2022-06-05', NULL,         'Office desk assignment');
END;

IF NOT EXISTS (SELECT 1 FROM Maintenance)
BEGIN
  INSERT INTO Maintenance (AssetID, MaintenanceDate, Description, Cost, Status) VALUES
    (5, '2024-01-10', 'Routine servicing and paper jam fix', 80.00, 'Completed'),
    (5, '2024-06-20', 'Replacement of ink cartridges',       45.00, 'In Progress');
END;
