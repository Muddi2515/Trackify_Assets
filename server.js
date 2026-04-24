const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/assets',      require('./routes/assets'));
app.use('/api/employees',   require('./routes/employees'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/maintenance', require('./routes/maintenance'));

// Dashboard summary route
app.get('/api/dashboard', async (req, res) => {
  const { poolPromise, sql } = require('./db');
  try {
    const pool = await poolPromise;
    const assets     = await pool.request().query('SELECT COUNT(*) AS count FROM Assets');
    const employees  = await pool.request().query('SELECT COUNT(*) AS count FROM Employees');
    const assigned   = await pool.request().query("SELECT COUNT(*) AS count FROM Assets WHERE Status='Assigned'");
    const maintenance= await pool.request().query("SELECT COUNT(*) AS count FROM Assets WHERE Status='Under Maintenance'");
    res.json({
      totalAssets:    assets.recordset[0].count,
      totalEmployees: employees.recordset[0].count,
      assignedAssets: assigned.recordset[0].count,
      underMaintenance: maintenance.recordset[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));