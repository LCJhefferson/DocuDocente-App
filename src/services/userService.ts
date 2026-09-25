import * as SQLite from 'expo-sqlite';
import { UserProfile } from '../models/User';

export const saveOrUpdateUser = async (user: Omit<UserProfile, 'id' | 'createdAt' | 'isLoggedIn'>): Promise<void> => {
  const db = await SQLite.openDatabaseAsync('docudocente.db');

  // Limpia sesiones previas y registra al usuario activo
  await db.runAsync('DELETE FROM users;');
  await db.runAsync(
    'INSERT INTO users (full_name, email, school_name, is_logged_in) VALUES (?, ?, ?, 1);',
    [user.fullName, user.email, user.schoolName]
  );
};

export const getActiveUser = async (): Promise<UserProfile | null> => {
  const db = await SQLite.openDatabaseAsync('docudocente.db');
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM users WHERE is_logged_in = 1 LIMIT 1;'
  );

  if (!result) return null;

  return {
    id: result.id,
    fullName: result.full_name,
    email: result.email,
    schoolName: result.school_name,
    isLoggedIn: result.is_logged_in === 1,
    createdAt: result.created_at,
  };
};

export const logoutUser = async (): Promise<void> => {
  const db = await SQLite.openDatabaseAsync('docudocente.db');
  await db.runAsync('UPDATE users SET is_logged_in = 0;');
};