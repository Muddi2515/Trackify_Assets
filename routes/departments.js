const express = require('express');
const router  = express.Router();
const { poolPromise, sql } = require('../db');

router.get('/', async (req, res) => {
  try {
    const pool   = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Departments ORDER BY DepartmentName');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { DepartmentName } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('DepartmentName', sql.NVarChar, DepartmentName)
      .query(`INSERT INTO Departments (DepartmentName)
              OUTPUT INSERTED.*
              VALUES (@DepartmentName)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { DepartmentName } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('id',             sql.Int,      req.params.id)
      .input('DepartmentName', sql.NVarChar, DepartmentName)
      .query(`UPDATE Departments SET DepartmentName=@DepartmentName
              OUTPUT INSERTED.*
              WHERE DepartmentID=@id`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Department not found' });
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
      .query('DELETE FROM Departments WHERE DepartmentID=@id');
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
