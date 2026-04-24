const express = require('express');
const router  = express.Router();
const { poolPromise, sql } = require('../db');

router.get('/', async (req, res) => {
  try {
    const pool   = await poolPromise;
    const result = await pool.request().query(`
      SELECT e.EmployeeID, e.Name, e.Email, e.Phone,
             d.DepartmentName, e.DepartmentID
      FROM Employees e
      LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
      ORDER BY e.EmployeeID DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Employees WHERE EmployeeID=@id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Employee not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { Name, Email, Phone, DepartmentID } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('Name',         sql.NVarChar, Name)
      .input('Email',        sql.NVarChar, Email)
      .input('Phone',        sql.NVarChar, Phone || null)
      .input('DepartmentID', sql.Int,      DepartmentID || null)
      .query(`INSERT INTO Employees (Name, Email, Phone, DepartmentID)
              OUTPUT INSERTED.*
              VALUES (@Name, @Email, @Phone, @DepartmentID)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { Name, Email, Phone, DepartmentID } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('id',           sql.Int,      req.params.id)
      .input('Name',         sql.NVarChar, Name)
      .input('Email',        sql.NVarChar, Email)
      .input('Phone',        sql.NVarChar, Phone || null)
      .input('DepartmentID', sql.Int,      DepartmentID || null)
      .query(`UPDATE Employees
              SET Name=@Name, Email=@Email, Phone=@Phone, DepartmentID=@DepartmentID
              OUTPUT INSERTED.*
              WHERE EmployeeID=@id`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Employee not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Employees WHERE EmployeeID=@id');
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
