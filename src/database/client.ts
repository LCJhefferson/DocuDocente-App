import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from './schema';

const DB_NAME = 'docudocente.db';
const expoDb = SQLite.openDatabaseSync(DB_NAME);

// Habilitar claves foráneas en SQLite
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });

/**
 * Función auxiliar de desarrollo para resetear la base de datos
 */
export const dropAndRecreateDatabaseDev = async (): Promise<void> => {
  try {
    expoDb.execSync(`
      DROP TABLE IF EXISTS evidencias;
      DROP TABLE IF EXISTS actividades;
      DROP TABLE IF EXISTS resultados_unidad;
      DROP TABLE IF EXISTS informes;
      DROP TABLE IF EXISTS plantillas;
      DROP TABLE IF EXISTS cursos;
      DROP TABLE IF EXISTS perfiles_docente;
      DROP TABLE IF EXISTS cuentas_autenticacion;
    `);
    console.log('[DB DEV] Tablas eliminadas correctamente.');
    await initDatabase();
  } catch (error) {
    console.error('[DB DEV Error] Error al reiniciar base de datos:', error);
  }
};

/**
 * BD creadas con la versión anterior: resultados_unidad tenía informe_id NOT NULL
 * y sin curso_id / tipo_grafico. SQLite no permite quitar un NOT NULL con ALTER,
 * así que se reconstruye la tabla conservando los datos.
 * También limpia los informes BORRADOR automáticos que creaba el módulo de notas.
 */
const migrarResultadosUnidad = () => {
  const columnas = expoDb.getAllSync<{ name: string; notnull: number }>('PRAGMA table_info(resultados_unidad);');
  const informeId = columnas.find((c) => c.name === 'informe_id');
  if (!informeId || informeId.notnull === 0) return; // ya está actualizada

  const tiene = (nombre: string) => columnas.some((c) => c.name === nombre);

  expoDb.execSync(`
    ALTER TABLE resultados_unidad RENAME TO resultados_unidad_old;
    CREATE TABLE resultados_unidad (
      id TEXT PRIMARY KEY NOT NULL,
      curso_id TEXT REFERENCES cursos(id) ON DELETE CASCADE,
      informe_id TEXT REFERENCES informes(id) ON DELETE CASCADE,
      nombre_unidad TEXT NOT NULL,
      cantidad_aprobados INTEGER NOT NULL,
      cantidad_desaprobados INTEGER NOT NULL,
      porcentaje_aprobados REAL NOT NULL,
      porcentaje_desaprobados REAL NOT NULL,
      tipo_grafico TEXT DEFAULT 'pastel',
      texto_interpretacion TEXT
    );
    INSERT INTO resultados_unidad
    SELECT id,
      ${tiene('curso_id') ? 'CASE WHEN curso_id IN (SELECT id FROM cursos) THEN curso_id END' : 'NULL'},
      CASE WHEN informe_id IN (SELECT id FROM informes WHERE estado <> 'BORRADOR') THEN informe_id END,
      nombre_unidad, cantidad_aprobados, cantidad_desaprobados,
      porcentaje_aprobados, porcentaje_desaprobados,
      ${tiene('tipo_grafico') ? 'tipo_grafico' : "'pastel'"},
      texto_interpretacion
    FROM resultados_unidad_old;
    DROP TABLE resultados_unidad_old;
    DELETE FROM informes WHERE estado = 'BORRADOR';
  `);
  console.log('[DB] resultados_unidad migrada.');
};

/**
 * Inicialización de las tablas de SQLite y siembra de datos base
 */
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

      CREATE TABLE IF NOT EXISTS cursos (
        id TEXT PRIMARY KEY NOT NULL,
        perfil_docente_id TEXT NOT NULL REFERENCES perfiles_docente(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        codigo TEXT,
        ciclo TEXT NOT NULL,
        semestre TEXT NOT NULL,
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
        curso_id TEXT REFERENCES cursos(id) ON DELETE CASCADE,
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
        curso_id TEXT REFERENCES cursos(id) ON DELETE CASCADE,
        informe_id TEXT REFERENCES informes(id) ON DELETE CASCADE,
        nombre_unidad TEXT NOT NULL,
        cantidad_aprobados INTEGER NOT NULL,
        cantidad_desaprobados INTEGER NOT NULL,
        porcentaje_aprobados REAL NOT NULL,
        porcentaje_desaprobados REAL NOT NULL,
        tipo_grafico TEXT DEFAULT 'pastel',
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
        tipo_general TEXT NOT NULL DEFAULT 'ACADEMICA',
        curso_id TEXT REFERENCES cursos(id) ON DELETE CASCADE,
        actividad_id TEXT REFERENCES actividades(id) ON DELETE CASCADE,
        nombre_actividad TEXT NOT NULL,
        descripcion TEXT,
        unidad TEXT,
        tipo_actividad TEXT,
        ruta_archivo_local TEXT,
        url_remota TEXT,
        tipo_archivo TEXT DEFAULT 'IMAGE',
        leyenda TEXT,
        creado_en TEXT NOT NULL,
        actualizado_en TEXT NOT NULL
      );
    `);

    migrarResultadosUnidad();

    // AUTO-SIEMBRA: Garantiza que la cuenta y perfil por defecto existan en SQLite
    const perfiles = expoDb.getAllSync('SELECT id FROM perfiles_docente LIMIT 1;');
    if (perfiles.length === 0) {
      const ahora = new Date().toISOString();
      expoDb.execSync(`
        INSERT OR IGNORE INTO cuentas_autenticacion (id, correo_electronico, contrasena_hash, es_activo, creado_en, actualizado_en)
        VALUES ('cuenta_default', 'docente@ejemplo.com', '123456', 1, '${ahora}', '${ahora}');

        INSERT OR IGNORE INTO perfiles_docente (id, cuenta_id, nombre_completo, grado_academico, facultad, creado_en, actualizado_en)
        VALUES ('perfil_default', 'cuenta_default', 'Docente General', 'Mg.', 'Ingeniería', '${ahora}', '${ahora}');
      `);
      console.log('[DB] Perfil docente por defecto creado en SQLite.');
    }

    console.log('[DB] Tablas SQLite inicializadas correctamente.');
  } catch (error) {
    console.error('[DB Error] Error al inicializar tablas:', error);
    throw error;
  }
};