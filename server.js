
// --- server.js with PostgreSQL support ---

const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Create tables if they don't exist
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGINT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      start DATE NOT NULL,
      end DATE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      event_id BIGINT REFERENCES events(id),
      name TEXT NOT NULL,
      hotel TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status TEXT NOT NULL,
      comments TEXT
    );
  `);
})();

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

// API: Get events
app.get("/api/events", async (req, res) => {
  const result = await pool.query("SELECT * FROM events ORDER BY start ASC");
  res.json(result.rows);
});

// API: Add event
app.post("/api/events", async (req, res) => {
  const { name, location, start, end } = req.body;
  const id = Date.now();
  await pool.query(
    "INSERT INTO events (id, name, location, start, end) VALUES ($1, $2, $3, $4, $5)",
    [id, name, location, start, end]
  );
  res.json({ id, name, location, start, end });
});

// API: Edit event
app.put("/api/events/:id", async (req, res) => {
  const { name, location, start, end } = req.body;
  const id = parseInt(req.params.id);
  await pool.query(
    "UPDATE events SET name=$1, location=$2, start=$3, end=$4 WHERE id=$5",
    [name, location, start, end, id]
  );
  res.json({ success: true });
});

// API: Delete event
app.delete("/api/events/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await pool.query("DELETE FROM bookings WHERE event_id = $1", [id]);
  await pool.query("DELETE FROM events WHERE id = $1", [id]);
  res.sendStatus(204);
});

// API: Get bookings for event
app.get("/api/bookings/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const result = await pool.query("SELECT * FROM bookings WHERE event_id = $1 ORDER BY id ASC", [eventId]);
  res.json(result.rows);
});

// API: Add booking
app.post("/api/bookings/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const { name, hotel, startDate, endDate, status, comments } = req.body;
  await pool.query(
    `INSERT INTO bookings (event_id, name, hotel, start_date, end_date, status, comments)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [eventId, name, hotel, startDate, endDate, status, comments]
  );
  res.json({ success: true });
});

// API: Edit booking
app.put("/api/bookings/:eventId/:bookingId", async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  const { name, hotel, startDate, endDate, status, comments } = req.body;
  await pool.query(
    `UPDATE bookings SET name=$1, hotel=$2, start_date=$3, end_date=$4, status=$5, comments=$6
     WHERE id=$7`,
    [name, hotel, startDate, endDate, status, comments, bookingId]
  );
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
