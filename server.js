const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;

// PostgreSQL connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://booking_db_eda0_user:yuqNOd0AZxLn7I68ZJliRihWC5p5Zdc4@dpg-d1lvvp6mcj7s73b0ofog-a.oregon-postgres.render.com/booking_db_eda0",
  ssl: { rejectUnauthorized: false },
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Create tables if they don’t exist
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id BIGINT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        start DATE NOT NULL,
        "end" DATE NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id BIGSERIAL PRIMARY KEY,
        event_id BIGINT REFERENCES events(id),
        name TEXT NOT NULL,
        hotel TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status TEXT,
        comments TEXT
      );
    `);
    console.log("✅ Tables ensured.");
  } catch (err) {
    console.error("❌ Error initializing DB:", err);
  }
}

// Get all events
app.get("/api/events", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM events ORDER BY start");
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/events error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Create a new event
app.post("/api/events", async (req, res) => {
  try {
    const { id, name, location, start, end } = req.body;
    await pool.query(
      `INSERT INTO events (id, name, location, start, "end") VALUES ($1, $2, $3, $4, $5)`,
      [id, name, location, start, end]
    );
    res.status(201).send("Event created");
  } catch (err) {
    console.error("POST /api/events error:", err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Get bookings for a specific event
app.get("/api/bookings/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await pool.query(
      `SELECT * FROM bookings WHERE event_id = $1 ORDER BY start_date`,
      [eventId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Add booking to an event
app.post("/api/bookings/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, hotel, startDate, endDate, status, comments } = req.body;
    await pool.query(
      `INSERT INTO bookings (event_id, name, hotel, start_date, end_date, status, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [eventId, name, hotel, startDate, endDate, status, comments]
    );
    res.status(201).send("Booking added");
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    res.status(500).json({ error: "Failed to save booking" });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await initDB();
});

