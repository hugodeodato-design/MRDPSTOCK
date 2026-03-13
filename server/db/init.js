// db/init.js — Initialisation et schéma SQLite
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || './data/mrdpstock.db';

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user','viewer')),
      color       TEXT NOT NULL DEFAULT '#00875A',
      password_hash TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      last_login  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      is_active   INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at  TEXT NOT NULL,
      last_seen   TEXT NOT NULL DEFAULT (datetime('now')),
      ip_address  TEXT,
      user_agent  TEXT
    );
    CREATE TABLE IF NOT EXISTS bases (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      created_by  TEXT REFERENCES users(id),
      is_active   INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS items (
      id            TEXT PRIMARY KEY,
      base_id       TEXT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
      reference     TEXT NOT NULL,
      designation   TEXT NOT NULL,
      categorie     TEXT,
      emplacement   TEXT,
      quantite      INTEGER NOT NULL DEFAULT 0,
      seuil         INTEGER DEFAULT 0,
      etat          TEXT NOT NULL DEFAULT 'en_stock' CHECK(etat IN ('en_stock','sorti','maintenance','rebut')),
      date_entree   TEXT,
      date_sortie   TEXT,
      autres_infos  TEXT,
      photo         TEXT,
      custom_fields TEXT DEFAULT '{}',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      created_by    TEXT REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS history (
      id          TEXT PRIMARY KEY,
      user_id     TEXT REFERENCES users(id),
      user_name   TEXT NOT NULL,
      action      TEXT NOT NULL,
      detail      TEXT,
      base_id     TEXT REFERENCES bases(id),
      item_id     TEXT,
      ip_address  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS columns_config (
      base_id     TEXT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
      config      TEXT NOT NULL DEFAULT '[]',
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (base_id)
    );
    CREATE INDEX IF NOT EXISTS idx_items_base_id   ON items(base_id);
    CREATE INDEX IF NOT EXISTS idx_items_etat      ON items(etat);
    CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_token  ON sessions(token_hash);
  `);

  // Paramètres par défaut
  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const [k, v] of Object.entries({
    companyName: 'M.R.D.P.S 27', lowStockAlert: 'true',
    dateFormat: 'DD/MM/YYYY', currency: '€', language: 'fr', theme: 'dark',
  })) insertSetting.run(k, v);

  // Créer ou réinitialiser l'admin
  const hash = bcrypt.hashSync('admin1234', 12);
  const existingAdmin = db.prepare(`SELECT id FROM users WHERE name = 'Admin' LIMIT 1`).get();

  if (!existingAdmin) {
    db.prepare(`INSERT INTO users (id, name, role, color, password_hash, must_change_password) VALUES (?, 'Admin', 'admin', '#00875A', ?, 1)`)
      .run(uuidv4(), hash);
    console.log('✅ Admin créé (login: Admin / mdp: admin1234)');
  } else if (process.env.RESET_ADMIN === 'true') {
    db.prepare(`UPDATE users SET password_hash = ?, must_change_password = 1, is_active = 1 WHERE name = 'Admin'`)
      .run(hash);
    console.log('✅ Mot de passe Admin réinitialisé à admin1234');
  }

  db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
  console.log(`✅ Base de données initialisée : ${DB_PATH}`);
  return db;
}

module.exports = { getDb, initDb };
