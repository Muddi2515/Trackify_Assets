const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

// GET all departments
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Departments ORDER BY DepartmentName');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET department by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Departments WHERE DepartmentID = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Department not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create department
router.post('/', async (req, res) => {
  const { DepartmentName } = req.body;
  if (!DepartmentName) return res.status(400).json({ error: 'DepartmentName is required' });
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('DepartmentName', sql.NVarChar(100), DepartmentName)
      .query(`INSERT INTO Departments (DepartmentName) OUTPUT INSERTED.* VALUES (@DepartmentName)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update department
router.put('/:id', async (req, res) => {
  const { DepartmentName } = req.body;
  if (!DepartmentName) return res.status(400).json({ error: 'DepartmentName is required' });
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('DepartmentName', sql.NVarChar(100), DepartmentName)
      .query(`UPDATE Departments SET DepartmentName = @DepartmentName OUTPUT INSERTED.* WHERE DepartmentID = @id`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Department not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE department
router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Departments OUTPUT DELETED.DepartmentID WHERE DepartmentID = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department deleted', id: result.recordset[0].DepartmentID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
