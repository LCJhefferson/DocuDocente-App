import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from './schema';

const DB_NAME = 'docudocente.db';
const expoDb = SQLite.openDatabaseSync(DB_NAME);

expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });

/////PARA LIMPIAR TABLAS ANTIGUAS./////////


// export const dropAndRecreateDatabaseDev = async (): Promise<void> => {
//   try {
//     expoDb.execSync(`
//       DROP TABLE IF EXISTS evidencias;
//       DROP TABLE IF EXISTS actividades;
//       DROP TABLE IF EXISTS resultados_unidad;
//       DROP TABLE IF EXISTS informes;
//       DROP TABLE IF EXISTS plantillas;
//       DROP TABLE IF EXISTS perfiles_docente;
//       DROP TABLE IF EXISTS cuentas_autenticacion;
      
//       -- Limpiar tablas antiguas con nombres en inglés
//       DROP TABLE IF EXISTS evidences;
//       DROP TABLE IF EXISTS activities;
//       DROP TABLE IF EXISTS unit_results;
//       DROP TABLE IF EXISTS reports;
//       DROP TABLE IF EXISTS templates;
//       DROP TABLE IF EXISTS teacher_profiles;
//       DROP TABLE IF EXISTS auth_accounts;
//       DROP TABLE IF EXISTS users;
//     `);
//     console.log('[DB DEV] Tablas antiguas eliminadas.');
    
//     // Recrea las tablas con el esquema nuevo en español
//     await initDatabase();
//   } catch (error) {
//     console.error('[DB DEV Error] Error al reiniciar base de datos:', error);
//   }
// };


////////////////////////////////////////////

export const initDatabase = async (): Promise<void> => {
  try {
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS cuentas_autenticacion (
        id TEXT PRIMARY KEY NOT NULL,
        correo_electronico TEXT UNIQUE NOT NULL,
        contrasena_hash TEXT NOT NULL,
        es_activo INTEGER NOT NULL DEFAULT 1,
        creado_en TEXT NOT NULL,
        actualizado_en TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS perfiles_docente (
        id TEXT PRIMARY KEY NOT NULL,
        cuenta_id TEXT UNIQUE NOT NULL REFERENCES cuentas_autenticacion(id) ON DELETE CASCADE,
        nombre_completo TEXT NOT NULL,
        grado_academico TEXT NOT NULL DEFAULT 'Mg.',
        facultad TEXT NOT NULL,
        departamento TEXT,
        codigo_institucional TEXT,
        avatar_uri TEXT,
        creado_en TEXT NOT NULL,
        actualizado_en TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plantillas (
        id TEXT PRIMARY KEY NOT NULL,
        nombre_institucion TEXT NOT NULL,
        nombre_facultad TEXT,
        logo_uri TEXT,
        titulo_ano_encabezado TEXT NOT NULL,
        es_predeterminada INTEGER NOT NULL DEFAULT 0,
        creado_en TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS informes (
        id TEXT PRIMARY KEY NOT NULL,
        perfil_docente_id TEXT REFERENCES perfiles_docente(id) ON DELETE SET NULL,
        plantilla_id TEXT REFERENCES plantillas(id) ON DELETE SET NULL,
        numero_informe TEXT NOT NULL,
        dirigido_a_nombre TEXT NOT NULL,
        dirigido_a_cargo TEXT NOT NULL,
        remitente_nombre TEXT NOT NULL,
        asunto TEXT NOT NULL,
        fecha_str TEXT NOT NULL,
        nombre_curso TEXT NOT NULL,
        ciclo TEXT NOT NULL,
        semestre TEXT NOT NULL,
        total_estudiantes INTEGER NOT NULL,
        estado TEXT NOT NULL DEFAULT 'BORRADOR',
        creado_en TEXT NOT NULL,
        actualizado_en TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS resultados_unidad (
        id TEXT PRIMARY KEY NOT NULL,
        informe_id TEXT NOT NULL REFERENCES informes(id) ON DELETE CASCADE,
        nombre_unidad TEXT NOT NULL,
        cantidad_aprobados INTEGER NOT NULL,
        cantidad_desaprobados INTEGER NOT NULL,
        porcentaje_aprobados REAL NOT NULL,
        porcentaje_desaprobados REAL NOT NULL,
        texto_interpretacion TEXT
      );

      CREATE TABLE IF NOT EXISTS actividades (
        id TEXT PRIMARY KEY NOT NULL,
        informe_id TEXT NOT NULL REFERENCES informes(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        categoria TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evidencias (
        id TEXT PRIMARY KEY NOT NULL,
        actividad_id TEXT NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
        ruta_archivo_local TEXT NOT NULL,
        url_remota TEXT,
        leyenda TEXT,
        creado_en TEXT NOT NULL
      );
    `);
    console.log('[DB] Tablas SQLite inicializadas correctamente en español.');
  } catch (error) {
    console.error('[DB Error] Error al inicializar tablas:', error);
    throw error;
  }
};