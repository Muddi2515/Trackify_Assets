const express = require('express');
const router  = express.Router();
const { poolPromise, sql } = require('../db');

router.get('/', async (req, res) => {
  try {
    const pool   = await poolPromise;
    const result = await pool.request().query(`
      SELECT a2.AssignmentID, a2.AssetID, a2.EmployeeID,
             a2.AssignDate, a2.ReturnDate, a2.Notes,
             a.AssetName, e.Name AS EmployeeName
      FROM Assignments a2
      JOIN Assets    a ON a2.AssetID   = a.AssetID
      JOIN Employees e ON a2.EmployeeID = e.EmployeeID
      ORDER BY a2.AssignmentID DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { AssetID, EmployeeID, AssignDate, ReturnDate, Notes } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('AssetID',    sql.Int,      AssetID)
      .input('EmployeeID', sql.Int,      EmployeeID)
      .input('AssignDate', sql.Date,     AssignDate || null)
      .input('ReturnDate', sql.Date,     ReturnDate || null)
      .input('Notes',      sql.NVarChar, Notes || null)
      .query(`INSERT INTO Assignments (AssetID, EmployeeID, AssignDate, ReturnDate, Notes)
              OUTPUT INSERTED.*
              VALUES (@AssetID, @EmployeeID, @AssignDate, @ReturnDate, @Notes)`);

    // Also update asset status to Assigned
    await pool.request()
      .input('id', sql.Int, AssetID)
      .query("UPDATE Assets SET Status='Assigned' WHERE AssetID=@id");

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { AssetID, EmployeeID, AssignDate, ReturnDate, Notes } = req.body;
  try {
    const pool = await poolPromise;

    // Fetch current assignment to detect asset change
    const current = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT AssetID FROM Assignments WHERE AssignmentID=@id');
    if (!current.recordset.length) return res.status(404).json({ error: 'Assignment not found' });
    const prevAssetId = current.recordset[0].AssetID;

    const result = await pool.request()
      .input('id',         sql.Int,      req.params.id)
      .input('AssetID',    sql.Int,      AssetID)
      .input('EmployeeID', sql.Int,      EmployeeID)
      .input('AssignDate', sql.Date,     AssignDate || null)
      .input('ReturnDate', sql.Date,     ReturnDate || null)
      .input('Notes',      sql.NVarChar, Notes || null)
      .query(`UPDATE Assignments
              SET AssetID=@AssetID, EmployeeID=@EmployeeID,
                  AssignDate=@AssignDate, ReturnDate=@ReturnDate, Notes=@Notes
              OUTPUT INSERTED.*
              WHERE AssignmentID=@id`);

    if (parseInt(prevAssetId, 10) !== parseInt(AssetID, 10)) {
      // Release the previously assigned asset
      await pool.request()
        .input('id', sql.Int, prevAssetId)
        .query("UPDATE Assets SET Status='Available' WHERE AssetID=@id");
      // Mark the new asset as assigned
      await pool.request()
        .input('id', sql.Int, AssetID)
        .query("UPDATE Assets SET Status='Assigned' WHERE AssetID=@id");
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;

    // Fetch the asset being unassigned before deleting
    const current = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT AssetID FROM Assignments WHERE AssignmentID=@id');

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Assignments WHERE AssignmentID=@id');

    if (current.recordset.length) {
      await pool.request()
        .input('id', sql.Int, current.recordset[0].AssetID)
        .query("UPDATE Assets SET Status='Available' WHERE AssetID=@id");
    }

    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
