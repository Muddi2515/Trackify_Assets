const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

// GET all assignments (with asset and employee details)
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        a.AssignmentID,
        a.AssetID,       ast.AssetName,  ast.SerialNumber,
        a.EmployeeID,    e.FirstName,    e.LastName,   e.Email,
        a.AssignedDate,  a.ReturnDate,   a.Notes
      FROM Assignments a
      JOIN Assets     ast ON a.AssetID     = ast.AssetID
      JOIN Employees  e   ON a.EmployeeID  = e.EmployeeID
      ORDER BY a.AssignedDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET assignment by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT
          a.AssignmentID,
          a.AssetID,       ast.AssetName,  ast.SerialNumber,
          a.EmployeeID,    e.FirstName,    e.LastName,   e.Email,
          a.AssignedDate,  a.ReturnDate,   a.Notes
        FROM Assignments a
        JOIN Assets     ast ON a.AssetID     = ast.AssetID
        JOIN Employees  e   ON a.EmployeeID  = e.EmployeeID
        WHERE a.AssignmentID = @id
      `);
    if (!result.recordset.length) return res.status(404).json({ error: 'Assignment not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create assignment (also marks asset as Assigned)
router.post('/', async (req, res) => {
  const { AssetID, EmployeeID, AssignedDate, ReturnDate, Notes } = req.body;
  if (!AssetID || !EmployeeID || !AssignedDate) {
    return res.status(400).json({ error: 'AssetID, EmployeeID, and AssignedDate are required' });
  }
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();
    try {
      // Verify asset is Available before assigning
      const assetCheck = await tx.request()
        .input('AssetID', sql.Int, AssetID)
        .query('SELECT Status FROM Assets WHERE AssetID = @AssetID');
      if (!assetCheck.recordset.length) {
        await tx.rollback();
        return res.status(404).json({ error: 'Asset not found' });
      }
      const currentStatus = assetCheck.recordset[0].Status;
      if (currentStatus !== 'Available') {
        await tx.rollback();
        return res.status(409).json({ error: `Asset is not available for assignment (current status: ${currentStatus})` });
      }
      const result = await tx.request()
        .input('AssetID',      sql.Int,          AssetID)
        .input('EmployeeID',   sql.Int,          EmployeeID)
        .input('AssignedDate', sql.Date,         AssignedDate)
        .input('ReturnDate',   sql.Date,         ReturnDate || null)
        .input('Notes',        sql.NVarChar(500), Notes     || null)
        .query(`
          INSERT INTO Assignments (AssetID, EmployeeID, AssignedDate, ReturnDate, Notes)
          OUTPUT INSERTED.*
          VALUES (@AssetID, @EmployeeID, @AssignedDate, @ReturnDate, @Notes)
        `);
      await tx.request()
        .input('AssetID', sql.Int, AssetID)
        .query("UPDATE Assets SET Status = 'Assigned' WHERE AssetID = @AssetID");
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

// PUT update assignment
router.put('/:id', async (req, res) => {
  const { AssetID, EmployeeID, AssignedDate, ReturnDate, Notes } = req.body;
  if (!AssetID || !EmployeeID || !AssignedDate) {
    return res.status(400).json({ error: 'AssetID, EmployeeID, and AssignedDate are required' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id',           sql.Int,           req.params.id)
      .input('AssetID',      sql.Int,           AssetID)
      .input('EmployeeID',   sql.Int,           EmployeeID)
      .input('AssignedDate', sql.Date,          AssignedDate)
      .input('ReturnDate',   sql.Date,          ReturnDate || null)
      .input('Notes',        sql.NVarChar(500), Notes      || null)
      .query(`
        UPDATE Assignments
        SET AssetID = @AssetID, EmployeeID = @EmployeeID,
            AssignedDate = @AssignedDate, ReturnDate = @ReturnDate, Notes = @Notes
        OUTPUT INSERTED.*
        WHERE AssignmentID = @id
      `);
    if (!result.recordset.length) return res.status(404).json({ error: 'Assignment not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE assignment (also marks asset as Available)
router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();
    try {
      const result = await tx.request()
        .input('id', sql.Int, req.params.id)
        .query('DELETE FROM Assignments OUTPUT DELETED.* WHERE AssignmentID = @id');
      if (!result.recordset.length) {
        await tx.rollback();
        return res.status(404).json({ error: 'Assignment not found' });
      }
      const { AssetID } = result.recordset[0];
      await tx.request()
        .input('AssetID', sql.Int, AssetID)
        .query("UPDATE Assets SET Status = 'Available' WHERE AssetID = @AssetID");
      await tx.commit();
      res.json({ message: 'Assignment deleted', id: req.params.id });
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
