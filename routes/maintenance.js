const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

// GET all maintenance records (with asset name)
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT m.*, a.AssetName, a.SerialNumber
      FROM Maintenance m
      JOIN Assets a ON m.AssetID = a.AssetID
      ORDER BY m.MaintenanceDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET maintenance record by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT m.*, a.AssetName, a.SerialNumber
        FROM Maintenance m
        JOIN Assets a ON m.AssetID = a.AssetID
        WHERE m.MaintenanceID = @id
      `);
    if (!result.recordset.length) return res.status(404).json({ error: 'Maintenance record not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create maintenance record (also marks asset as Under Maintenance)
router.post('/', async (req, res) => {
  const { AssetID, MaintenanceDate, Description, Cost, Status } = req.body;
  if (!AssetID || !MaintenanceDate) {
    return res.status(400).json({ error: 'AssetID and MaintenanceDate are required' });
  }
  const maintenanceStatus = Status || 'Scheduled';
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();
    try {
      const result = await tx.request()
        .input('AssetID',          sql.Int,           AssetID)
        .input('MaintenanceDate',  sql.Date,           MaintenanceDate)
        .input('Description',      sql.NVarChar(500),  Description || null)
        .input('Cost',             sql.Decimal(10,2),  Cost        || null)
        .input('Status',           sql.NVarChar(30),   maintenanceStatus)
        .query(`
          INSERT INTO Maintenance (AssetID, MaintenanceDate, Description, Cost, Status)
          OUTPUT INSERTED.*
          VALUES (@AssetID, @MaintenanceDate, @Description, @Cost, @Status)
        `);
      if (maintenanceStatus !== 'Completed') {
        // Only move asset to 'Under Maintenance' if it is currently Available
        await tx.request()
          .input('AssetID', sql.Int, AssetID)
          .query("UPDATE Assets SET Status = 'Under Maintenance' WHERE AssetID = @AssetID AND Status = 'Available'");
      }
      await tx.commit();
      res.status(201).json(result.recordset[0]);
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update maintenance record
router.put('/:id', async (req, res) => {
  const { AssetID, MaintenanceDate, Description, Cost, Status } = req.body;
  if (!AssetID || !MaintenanceDate) {
    return res.status(400).json({ error: 'AssetID and MaintenanceDate are required' });
  }
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();
    try {
      const result = await tx.request()
        .input('id',               sql.Int,           req.params.id)
        .input('AssetID',          sql.Int,           AssetID)
        .input('MaintenanceDate',  sql.Date,           MaintenanceDate)
        .input('Description',      sql.NVarChar(500),  Description || null)
        .input('Cost',             sql.Decimal(10,2),  Cost        || null)
        .input('Status',           sql.NVarChar(30),   Status      || 'Scheduled')
        .query(`
          UPDATE Maintenance
          SET AssetID = @AssetID, MaintenanceDate = @MaintenanceDate,
              Description = @Description, Cost = @Cost, Status = @Status
          OUTPUT INSERTED.*
          WHERE MaintenanceID = @id
        `);
      if (!result.recordset.length) {
        await tx.rollback();
        return res.status(404).json({ error: 'Maintenance record not found' });
      }
      // If completed, mark asset as Available (only if currently Under Maintenance)
      // If not completed, mark as Under Maintenance only if currently Available
      if (Status === 'Completed') {
        await tx.request()
          .input('AssetID', sql.Int, AssetID)
          .query("UPDATE Assets SET Status = 'Available' WHERE AssetID = @AssetID AND Status = 'Under Maintenance'");
      } else {
        await tx.request()
          .input('AssetID', sql.Int, AssetID)
          .query("UPDATE Assets SET Status = 'Under Maintenance' WHERE AssetID = @AssetID AND Status = 'Available'");
      }
      await tx.commit();
      res.json(result.recordset[0]);
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE maintenance record
router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Maintenance OUTPUT DELETED.MaintenanceID WHERE MaintenanceID = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Maintenance record not found' });
    res.json({ message: 'Maintenance record deleted', id: result.recordset[0].MaintenanceID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
