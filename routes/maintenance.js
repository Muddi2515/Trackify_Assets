const express = require('express');
const router  = express.Router();
const { poolPromise, sql } = require('../db');

router.get('/', async (req, res) => {
  try {
    const pool   = await poolPromise;
    const result = await pool.request().query(`
      SELECT m.MaintenanceID, m.AssetID, m.MaintenanceDate,
             m.Description, m.Cost, m.Status,
             a.AssetName
      FROM Maintenance m
      JOIN Assets a ON m.AssetID = a.AssetID
      ORDER BY m.MaintenanceID DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { AssetID, MaintenanceDate, Description, Cost, Status } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('AssetID',         sql.Int,      AssetID)
      .input('MaintenanceDate', sql.Date,     MaintenanceDate || null)
      .input('Description',     sql.NVarChar, Description || null)
      .input('Cost',            sql.Decimal,  Cost || null)
      .input('Status',          sql.NVarChar, Status || 'Pending')
      .query(`INSERT INTO Maintenance (AssetID, MaintenanceDate, Description, Cost, Status)
              OUTPUT INSERTED.*
              VALUES (@AssetID, @MaintenanceDate, @Description, @Cost, @Status)`);

    // Update asset status to Under Maintenance
    await pool.request()
      .input('id', sql.Int, AssetID)
      .query("UPDATE Assets SET Status='Under Maintenance' WHERE AssetID=@id");

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { AssetID, MaintenanceDate, Description, Cost, Status } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('id',              sql.Int,      req.params.id)
      .input('AssetID',         sql.Int,      AssetID)
      .input('MaintenanceDate', sql.Date,     MaintenanceDate || null)
      .input('Description',     sql.NVarChar, Description || null)
      .input('Cost',            sql.Decimal,  Cost || null)
      .input('Status',          sql.NVarChar, Status)
      .query(`UPDATE Maintenance
              SET AssetID=@AssetID, MaintenanceDate=@MaintenanceDate,
                  Description=@Description, Cost=@Cost, Status=@Status
              OUTPUT INSERTED.*
              WHERE MaintenanceID=@id`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Record not found' });

    // If maintenance is completed, return the asset to Available
    if (Status === 'Completed') {
      await pool.request()
        .input('id', sql.Int, AssetID)
        .query("UPDATE Assets SET Status='Available' WHERE AssetID=@id AND Status='Under Maintenance'");
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;

    // Fetch the associated asset before deleting
    const current = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT AssetID FROM Maintenance WHERE MaintenanceID=@id');

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Maintenance WHERE MaintenanceID=@id');

    if (current.recordset.length) {
      await pool.request()
        .input('id', sql.Int, current.recordset[0].AssetID)
        .query("UPDATE Assets SET Status='Available' WHERE AssetID=@id AND Status='Under Maintenance'");
    }

    res.json({ message: 'Maintenance record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
