const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

// GET all employees (with department name)
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT e.*, d.DepartmentName
      FROM Employees e
      LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
      ORDER BY e.LastName, e.FirstName
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET employee by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT e.*, d.DepartmentName
        FROM Employees e
        LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
        WHERE e.EmployeeID = @id
      `);
    if (!result.recordset.length) return res.status(404).json({ error: 'Employee not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create employee
router.post('/', async (req, res) => {
  const { FirstName, LastName, Email, JobTitle, DepartmentID } = req.body;
  if (!FirstName || !LastName || !Email) {
    return res.status(400).json({ error: 'FirstName, LastName, and Email are required' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('FirstName',    sql.NVarChar(50),  FirstName)
      .input('LastName',     sql.NVarChar(50),  LastName)
      .input('Email',        sql.NVarChar(100), Email)
      .input('JobTitle',     sql.NVarChar(100), JobTitle   || null)
      .input('DepartmentID', sql.Int,           DepartmentID || null)
      .query(`
        INSERT INTO Employees (FirstName, LastName, Email, JobTitle, DepartmentID)
        OUTPUT INSERTED.*
        VALUES (@FirstName, @LastName, @Email, @JobTitle, @DepartmentID)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update employee
router.put('/:id', async (req, res) => {
  const { FirstName, LastName, Email, JobTitle, DepartmentID } = req.body;
  if (!FirstName || !LastName || !Email) {
    return res.status(400).json({ error: 'FirstName, LastName, and Email are required' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id',           sql.Int,           req.params.id)
      .input('FirstName',    sql.NVarChar(50),  FirstName)
      .input('LastName',     sql.NVarChar(50),  LastName)
      .input('Email',        sql.NVarChar(100), Email)
      .input('JobTitle',     sql.NVarChar(100), JobTitle   || null)
      .input('DepartmentID', sql.Int,           DepartmentID || null)
      .query(`
        UPDATE Employees
        SET FirstName = @FirstName, LastName = @LastName, Email = @Email,
            JobTitle = @JobTitle, DepartmentID = @DepartmentID
        OUTPUT INSERTED.*
        WHERE EmployeeID = @id
      `);
    if (!result.recordset.length) return res.status(404).json({ error: 'Employee not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Employees OUTPUT DELETED.EmployeeID WHERE EmployeeID = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted', id: result.recordset[0].EmployeeID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
