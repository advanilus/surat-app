import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Buat tabel letters jika belum ada
db.exec(`
  CREATE TABLE IF NOT EXISTS letters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('MASUK', 'KELUAR')) NOT NULL,
    letter_number TEXT,
    subject TEXT,
    sender TEXT,
    recipient TEXT,
    letter_date DATE DEFAULT (DATE('now')),
    file_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Auto-migration: Tambah kolom file_path jika belum ada di DB yang dibuat sebelumnya
try {
  db.exec(`ALTER TABLE letters ADD COLUMN file_path TEXT;`);
} catch {
  // Kolom file_path sudah ada
}

export default db;