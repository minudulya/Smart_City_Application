const router = require('express').Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

function normalizeTimes(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean);
      }
    } catch {
      // fall back to comma-separated values
    }

    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

function serializeTimes(value) {
  return JSON.stringify(normalizeTimes(value));
}

function mapRow(row) {
  const departureTimes = normalizeTimes(row.departure_times);
  const arrivalTimes = normalizeTimes(row.arrival_times);
  return {
    id: row.id,
    route: row.route,
    time: departureTimes[0] || row.time || '',
    departure_times: departureTimes,
    arrival_times: arrivalTimes,
  };
}

// ── GET /api/timetable ─────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM timetable ORDER BY mode, id');
    const timetable = { train: [], bus: [] };
    for (const row of rows) {
      timetable[row.mode].push(mapRow(row));
    }
    res.json(timetable);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch timetable.' });
  }
});

// ── POST /api/timetable/update ─────────────────────────────────────────────
// Replaces the full train/bus schedule with the submitted entries.
router.post('/update', authenticateToken, requireRole('admin'), async (req, res) => {
  const { train, bus } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (Array.isArray(train)) {
      await conn.query("DELETE FROM timetable WHERE mode = 'train'");
      for (const entry of train) {
        const departureTimes = normalizeTimes(entry.departure_times);
        const arrivalTimes = normalizeTimes(entry.arrival_times);
        await conn.query(
          "INSERT INTO timetable (mode, route, time, departure_times, arrival_times) VALUES ('train', ?, ?, ?, ?)",
          [entry.route, departureTimes[0] || '', serializeTimes(departureTimes), serializeTimes(arrivalTimes)]
        );
      }
    }

    if (Array.isArray(bus)) {
      await conn.query("DELETE FROM timetable WHERE mode = 'bus'");
      for (const entry of bus) {
        const departureTimes = normalizeTimes(entry.departure_times);
        const arrivalTimes = normalizeTimes(entry.arrival_times);
        await conn.query(
          "INSERT INTO timetable (mode, route, time, departure_times, arrival_times) VALUES ('bus', ?, ?, ?, ?)",
          [entry.route, departureTimes[0] || '', serializeTimes(departureTimes), serializeTimes(arrivalTimes)]
        );
      }
    }

    await conn.commit();

    const [rows] = await conn.query('SELECT * FROM timetable ORDER BY mode, id');
    const timetable = { train: [], bus: [] };
    for (const row of rows) {
      timetable[row.mode].push(mapRow(row));
    }
    res.json(timetable);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to update timetable.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
