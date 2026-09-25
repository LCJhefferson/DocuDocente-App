import * as SQLite from 'expo-sqlite';

export const initDatabase = async (): Promise<void> => {
  const db = await SQLite.openDatabaseAsync('docudocente.db');

  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Tabla de Usuario / Perfil Docente
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      school_name TEXT NOT NULL,
      is_logged_in INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabla de Evidencias
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS evidences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      student_or_group TEXT NOT NULL,
      observation TEXT NOT NULL,
      image_uri TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabla de Actividades Extracurriculares
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS extracurricular_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
};