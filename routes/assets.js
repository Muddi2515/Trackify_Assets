const express = require('express');
const router  = express.Router();
const { poolPromise, sql } = require('../db');

// GET all assets (with optional search & filter)
router.get('/', async (req, res) => {
  const { search = '', status = '', department = '' } = req.query;
  try {
    const pool    = await poolPromise;
    const request = pool.request();

    let query = `
      SELECT a.AssetID, a.AssetName, a.AssetType, a.SerialNumber,
             a.PurchaseDate, a.PurchaseCost, a.Status,
             d.DepartmentName
      FROM Assets a
      LEFT JOIN Departments d ON a.DepartmentID = d.DepartmentID
      WHERE 1=1
    `;

    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      query += ` AND (a.AssetName LIKE @search OR a.SerialNumber LIKE @search OR a.AssetType LIKE @search)`;
    }
    if (status) {
      request.input('status', sql.NVarChar, status);
      query += ` AND a.Status = @status`;
    }
    if (department) {
      const deptId = parseInt(department, 10);
      if (!isNaN(deptId)) {
        request.input('department', sql.Int, deptId);
        query += ` AND a.DepartmentID = @department`;
      }
    }

    query += ' ORDER BY a.AssetID DESC';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single asset
router.get('/:id', async (req, res) => {
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Assets WHERE AssetID = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Asset not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create asset
router.post('/', async (req, res) => {
  const { AssetName, AssetType, SerialNumber, PurchaseDate, PurchaseCost, Status, DepartmentID } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('AssetName',    sql.NVarChar, AssetName)
      .input('AssetType',    sql.NVarChar, AssetType)
      .input('SerialNumber', sql.NVarChar, SerialNumber)
      .input('PurchaseDate', sql.Date,     PurchaseDate || null)
      .input('PurchaseCost', sql.Decimal,  PurchaseCost || null)
      .input('Status',       sql.NVarChar, Status || 'Available')
      .input('DepartmentID', sql.Int,      DepartmentID || null)
      .query(`INSERT INTO Assets (AssetName, AssetType, SerialNumber, PurchaseDate, PurchaseCost, Status, DepartmentID)
              OUTPUT INSERTED.*
              VALUES (@AssetName, @AssetType, @SerialNumber, @PurchaseDate, @PurchaseCost, @Status, @DepartmentID)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update asset
router.put('/:id', async (req, res) => {
  const { AssetName, AssetType, SerialNumber, PurchaseDate, PurchaseCost, Status, DepartmentID } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('id',           sql.Int,      req.params.id)
      .input('AssetName',    sql.NVarChar, AssetName)
      .input('AssetType',    sql.NVarChar, AssetType)
      .input('SerialNumber', sql.NVarChar, SerialNumber)
      .input('PurchaseDate', sql.Date,     PurchaseDate || null)
      .input('PurchaseCost', sql.Decimal,  PurchaseCost || null)
      .input('Status',       sql.NVarChar, Status)
      .input('DepartmentID', sql.Int,      DepartmentID || null)
      .query(`UPDATE Assets
              SET AssetName=@AssetName, AssetType=@AssetType, SerialNumber=@SerialNumber,
                  PurchaseDate=@PurchaseDate, PurchaseCost=@PurchaseCost,
                  Status=@Status, DepartmentID=@DepartmentID
              OUTPUT INSERTED.*
              WHERE AssetID=@id`);
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
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Assets WHERE AssetID=@id');
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
