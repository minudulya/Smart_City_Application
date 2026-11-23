require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'smartcity_db',
  waitForConnections: true,
  connectionLimit: 10,
});

// Silently skips if the column already exists (ER_DUP_FIELDNAME)
async function addColumnIfNotExists(conn, table, column, definition) {
  try {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }
}

async function initDB() {
  const raw = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  await raw.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'smartcity_db'}\``);
  await raw.end();

  const conn = await pool.getConnection();
  try {
    // ── Users ──────────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        email         VARCHAR(255) UNIQUE NOT NULL,
        username      VARCHAR(100) UNIQUE NOT NULL,
        name          VARCHAR(255) NOT NULL,
        role          ENUM('admin','merchant','citizen') NOT NULL DEFAULT 'citizen',
        password_hash VARCHAR(255) NOT NULL,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Places ─────────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS places (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        name     VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        address  VARCHAR(255) NOT NULL,
        lat      DECIMAL(10,7) NOT NULL,
        lng      DECIMAL(10,7) NOT NULL,
        phone    VARCHAR(50)   DEFAULT '',
        icon     VARCHAR(20)   DEFAULT '📍',
        rating   DECIMAL(3,1)  DEFAULT 0.0,
        website  VARCHAR(255)  DEFAULT '',
        hours    VARCHAR(100)  DEFAULT '',
        image    MEDIUMTEXT    DEFAULT ''
      )
    `);
    // Migrations for databases created before the rich fields existed
    await addColumnIfNotExists(conn, 'places', 'phone',   "VARCHAR(50) DEFAULT ''");
    await addColumnIfNotExists(conn, 'places', 'icon',    "VARCHAR(20) DEFAULT '📍'");
    await addColumnIfNotExists(conn, 'places', 'rating',  'DECIMAL(3,1) DEFAULT 0.0');
    await addColumnIfNotExists(conn, 'places', 'website', "VARCHAR(255) DEFAULT ''");
    await addColumnIfNotExists(conn, 'places', 'hours',   "VARCHAR(100) DEFAULT ''");
    await addColumnIfNotExists(conn, 'places', 'image',   "MEDIUMTEXT DEFAULT ''");

    // ── Advertisements ─────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT          DEFAULT NULL,
        title       VARCHAR(255) NOT NULL,
        description TEXT,
        author      VARCHAR(255),
        category    VARCHAR(100) DEFAULT 'services',
        phone       VARCHAR(50)  DEFAULT '',
        image       MEDIUMTEXT   DEFAULT '',
        status      ENUM('Pending','Published','Unpublished') NOT NULL DEFAULT 'Pending',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Migrations for databases created before these columns existed
    await addColumnIfNotExists(conn, 'advertisements', 'user_id', 'INT DEFAULT NULL');
    await conn.query("ALTER TABLE advertisements MODIFY COLUMN image MEDIUMTEXT DEFAULT ''");

    // ── Announcements ──────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        message    TEXT NOT NULL,
        category   VARCHAR(100) NOT NULL DEFAULT 'event',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME DEFAULT NULL
      )
    `);
    await addColumnIfNotExists(conn, 'announcements', 'category', "VARCHAR(100) NOT NULL DEFAULT 'event'");

    // ── Issues ─────────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        issue      TEXT NOT NULL,
        location   VARCHAR(255) NOT NULL,
        category   VARCHAR(100) DEFAULT 'general',
        status     ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
        note       TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Requests ───────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        user_id      INT          DEFAULT NULL,
        name         VARCHAR(255) NOT NULL,
        request_type VARCHAR(255) NOT NULL,
        details      TEXT NOT NULL,
        status       ENUM('Pending','Responded') NOT NULL DEFAULT 'Pending',
        response     TEXT DEFAULT NULL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await addColumnIfNotExists(conn, 'requests', 'user_id', 'INT DEFAULT NULL');

    // ── Timetable ──────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS timetable (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        mode            ENUM('train','bus') NOT NULL,
        route           VARCHAR(255) NOT NULL,
        time            VARCHAR(10) DEFAULT '',
        departure_times TEXT DEFAULT '[]',
        arrival_times   TEXT DEFAULT '[]'
      )
    `);
    await addColumnIfNotExists(conn, 'timetable', 'departure_times', "TEXT DEFAULT '[]'");
    await addColumnIfNotExists(conn, 'timetable', 'arrival_times',   "TEXT DEFAULT '[]'");

    // ── Seed: demo users ───────────────────────────────────────────────────
    const [existingUsers] = await conn.query('SELECT COUNT(*) AS cnt FROM users');
    if (existingUsers[0].cnt === 0) {
      const demoUsers = [
        { email: 'admin@smartcity.lk',    username: 'admin1',    name: 'City Admin', role: 'admin',    password: 'admin123' },
        { email: 'merchant@smartcity.lk', username: 'merchant1', name: 'Merchant',   role: 'merchant', password: 'merch123' },
        { email: 'user@smartcity.lk',     username: 'user1',     name: 'Nimal',      role: 'citizen',  password: 'user123'  },
      ];
      for (const u of demoUsers) {
        const hash = await bcrypt.hash(u.password, 10);
        await conn.query(
          'INSERT INTO users (email, username, name, role, password_hash) VALUES (?,?,?,?,?)',
          [u.email, u.username, u.name, u.role, hash]
        );
      }
      console.log('✅ Demo users seeded.');
    }

    // ── Seed: places ───────────────────────────────────────────────────────
    const [existingPlaces] = await conn.query('SELECT COUNT(*) AS cnt FROM places');
    if (existingPlaces[0].cnt === 0) {
      const seedPlaces = [
        { name: 'City Central Bank (BOC)',     category: 'bank',       address: '1, Bank of Ceylon Mawatha, Colombo 01',              lat: 6.9331, lng: 79.8430, phone: '011-2446790', icon: '🏦', rating: 4.5, website: 'www.boc.lk',              hours: 'Mon–Fri 9am–3pm'    },
        { name: "People's Bank",               category: 'bank',       address: '75, Sir Chittampalam A. Gardiner Mawatha, Colombo 02',lat: 6.9260, lng: 79.8478, phone: '011-2481413', icon: '🏦', rating: 4.2, website: 'www.peoplesbank.lk',      hours: 'Mon–Fri 8:30am–4pm' },
        { name: 'Hatton National Bank (HNB)',  category: 'bank',       address: '16, Janadhipathi Mawatha, Colombo 01',               lat: 6.9335, lng: 79.8425, phone: '011-2421466', icon: '🏦', rating: 4.3, website: 'www.hnb.net',             hours: 'Mon–Fri 9am–3pm'    },
        { name: 'Fort Railway Station',        category: 'station',    address: 'Station Road, Fort, Colombo 01',                     lat: 6.9319, lng: 79.8481, phone: '011-2434215', icon: '🚉', rating: 4.7, website: 'www.railway.gov.lk',       hours: '24/7'               },
        { name: 'Pettah Bus Terminal (NTC)',   category: 'station',    address: 'Pettah Junction, Colombo 11',                        lat: 6.9480, lng: 79.8610, phone: '011-2587372', icon: '🚌', rating: 3.9, website: 'www.ntc.gov.lk',           hours: '5am–11pm'           },
        { name: 'Maharagama Bus Stand',        category: 'station',    address: 'Maharagama Town, Colombo',                           lat: 6.8487, lng: 79.9267, phone: '011-2587372', icon: '🚌', rating: 3.8, website: 'www.ntc.gov.lk',           hours: '5am–10pm'           },
        { name: 'Police Headquarters',         category: 'police',     address: 'Chaithya Road, Fort, Colombo 02',                    lat: 6.9303, lng: 79.8479, phone: '011-2421111', icon: '🚔', rating: 4.0, website: 'www.police.lk',            hours: '24/7'               },
        { name: 'Fort Police Station',         category: 'police',     address: 'York Street, Fort, Colombo 01',                      lat: 6.9337, lng: 79.8463, phone: '011-2435555', icon: '🚔', rating: 4.1, website: 'www.police.lk',            hours: '24/7'               },
        { name: 'CPC Fuel Station – Kollupitiya', category: 'gas',    address: 'Galle Road, Kollupitiya, Colombo 03',                lat: 6.8958, lng: 79.8535, phone: '011-2421111', icon: '⛽', rating: 4.3, website: 'www.ceypetco.gov.lk',      hours: '6am–10pm'           },
        { name: 'Lanka IOC – Borella',         category: 'gas',        address: 'Borella Junction, Colombo 08',                       lat: 6.9138, lng: 79.8715, phone: '011-2697777', icon: '⛽', rating: 4.0, website: 'www.lankaioc.com',          hours: '24/7'               },
        { name: 'National Hospital of Sri Lanka', category: 'hospital',address: 'Regent Street, Colombo 10',                         lat: 6.9217, lng: 79.8760, phone: '011-2691111', icon: '🏥', rating: 4.6, website: 'nhsl.health.gov.lk',        hours: '24/7'               },
        { name: 'Colombo General Hospital',    category: 'hospital',   address: 'Kynsey Road, Colombo 08',                            lat: 6.9138, lng: 79.8768, phone: '011-2691111', icon: '🏥', rating: 4.4, website: 'nhsl.health.gov.lk',        hours: '24/7'               },
        { name: 'Colombo Municipal Council',   category: 'government', address: 'Town Hall, Colombo 07',                              lat: 6.9108, lng: 79.8660, phone: '011-2691191', icon: '🏛️', rating: 3.7, website: 'www.colombo.mc.gov.lk',    hours: 'Mon–Fri 8:30am–4pm' },
        { name: 'Dept. of Motor Traffic',      category: 'government', address: '341, Elvitigala Mawatha, Colombo 05',                lat: 6.8988, lng: 79.8711, phone: '011-2694331', icon: '🏛️', rating: 3.5, website: 'www.motortraffic.gov.lk',  hours: 'Mon–Fri 8:30am–3:30pm' },
      ];
      for (const p of seedPlaces) {
        await conn.query(
          'INSERT INTO places (name, category, address, lat, lng, phone, icon, rating, website, hours) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [p.name, p.category, p.address, p.lat, p.lng, p.phone, p.icon, p.rating, p.website, p.hours]
        );
      }
      console.log('✅ Places seeded.');
    }

    // ── Seed: timetable ────────────────────────────────────────────────────
    const [existingTT] = await conn.query('SELECT COUNT(*) AS cnt FROM timetable');
    if (existingTT[0].cnt === 0) {
      const seedTT = [
        ['train', 'City Center → Eastside',   '08:15'],
        ['train', 'North Station → Downtown', '09:00'],
        ['bus',   'Airport → Central Park',   '08:00'],
        ['bus',   'West End → City Hall',     '08:30'],
      ];
      for (const [mode, route, time] of seedTT) {
        await conn.query(
          'INSERT INTO timetable (mode, route, time) VALUES (?,?,?)',
          [mode, route, time]
        );
      }
      console.log('✅ Timetable seeded.');
    }

    // ── Seed: sample announcement ──────────────────────────────────────────
    const [existingAnn] = await conn.query('SELECT COUNT(*) AS cnt FROM announcements');
    if (existingAnn[0].cnt === 0) {
      await conn.query(
        'INSERT INTO announcements (title, message) VALUES (?,?)',
        ['City Water Supply Update', 'Water maintenance scheduled for Saturday from 8am to 2pm.']
      );
      console.log('✅ Sample announcement seeded.');
    }

    // ── Seed: sample ad ────────────────────────────────────────────────────
    const [existingAds] = await conn.query('SELECT COUNT(*) AS cnt FROM advertisements');
    if (existingAds[0].cnt === 0) {
      await conn.query(
        'INSERT INTO advertisements (title, description, author, category, status) VALUES (?,?,?,?,?)',
        ['Fresh bakery deals', 'Breads and pastries from Main Street Bakery.', 'Merchant', 'food', 'Published']
      );
      console.log('✅ Sample ad seeded.');
    }

    console.log('✅ Database initialized successfully.');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
