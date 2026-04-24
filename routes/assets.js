const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

// GET all assets (with department name)
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT a.*, d.DepartmentName
      FROM Assets a
      LEFT JOIN Departments d ON a.DepartmentID = d.DepartmentID
      ORDER BY a.AssetName
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET asset by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT a.*, d.DepartmentName
        FROM Assets a
        LEFT JOIN Departments d ON a.DepartmentID = d.DepartmentID
        WHERE a.AssetID = @id
      `);
    if (!result.recordset.length) return res.status(404).json({ error: 'Asset not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create asset
router.post('/', async (req, res) => {
  const { AssetName, AssetType, SerialNumber, PurchaseDate, PurchasePrice, Status, DepartmentID } = req.body;
  if (!AssetName) return res.status(400).json({ error: 'AssetName is required' });
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('AssetName',     sql.NVarChar(100), AssetName)
      .input('AssetType',     sql.NVarChar(50),  AssetType     || null)
      .input('SerialNumber',  sql.NVarChar(100), SerialNumber  || null)
      .input('PurchaseDate',  sql.Date,          PurchaseDate  || null)
      .input('PurchasePrice', sql.Decimal(10,2), PurchasePrice || null)
      .input('Status',        sql.NVarChar(30),  Status        || 'Available')
      .input('DepartmentID',  sql.Int,           DepartmentID  || null)
      .query(`
        INSERT INTO Assets (AssetName, AssetType, SerialNumber, PurchaseDate, PurchasePrice, Status, DepartmentID)
        OUTPUT INSERTED.*
        VALUES (@AssetName, @AssetType, @SerialNumber, @PurchaseDate, @PurchasePrice, @Status, @DepartmentID)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update asset
router.put('/:id', async (req, res) => {
  const { AssetName, AssetType, SerialNumber, PurchaseDate, PurchasePrice, Status, DepartmentID } = req.body;
  if (!AssetName) return res.status(400).json({ error: 'AssetName is required' });
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id',            sql.Int,           req.params.id)
      .input('AssetName',     sql.NVarChar(100), AssetName)
      .input('AssetType',     sql.NVarChar(50),  AssetType     || null)
      .input('SerialNumber',  sql.NVarChar(100), SerialNumber  || null)
      .input('PurchaseDate',  sql.Date,          PurchaseDate  || null)
      .input('PurchasePrice', sql.Decimal(10,2), PurchasePrice || null)
      .input('Status',        sql.NVarChar(30),  Status        || 'Available')
      .input('DepartmentID',  sql.Int,           DepartmentID  || null)
      .query(`
        UPDATE Assets
        SET AssetName = @AssetName, AssetType = @AssetType, SerialNumber = @SerialNumber,
            PurchaseDate = @PurchaseDate, PurchasePrice = @PurchasePrice,
            Status = @Status, DepartmentID = @DepartmentID
        OUTPUT INSERTED.*
        WHERE AssetID = @id
      `);
    if (!result.recordset.length) return res.status(404).json({ error: 'Asset not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE asset
router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Assets OUTPUT DELETED.AssetID WHERE AssetID = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Asset not found' });
    res.json({ message: 'Asset deleted', id: result.recordset[0].AssetID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
