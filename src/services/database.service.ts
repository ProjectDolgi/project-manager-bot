import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { logger } from '../utils/logger';
import path from 'path';

export interface User {
  id: number;
  telegram_id: string;
  name: string;
  username?: string; // Telegram username (@username)
  role: string;
  timezone: string;
  preferences: string; // JSON string for SQLite
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export interface Sprint {
  id: number;
  project_id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface Task {
  id: number;
  sprint_id: number;
  assignee_id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimated_hours: number;
}

export interface DailyStatus {
  id: number;
  user_id: number;
  date: string;
  yesterday: string;
  today: string;
  blockers: string;
  mood_score: number;
}

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bot.db');
  }

  async connect(): Promise<void> {
    try {
      // Создаем директорию для базы данных если не существует
      const dbDir = path.dirname(this.dbPath);
      const fs = await import('fs');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      await this.initializeTables();
      logger.info('SQLite база данных успешно подключена');
    } catch (error) {
      logger.error('Ошибка подключения к SQLite базе данных:', error);
      throw error;
    }
  }

  private async initializeTables(): Promise<void> {
    if (!this.db) throw new Error('База данных не подключена');
    
    try {
      // Создание таблиц
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          username TEXT,
          role TEXT DEFAULT 'project_manager',
          timezone TEXT DEFAULT 'Europe/Moscow',
          preferences TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS sprints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER REFERENCES projects(id),
          name TEXT NOT NULL,
          start_date DATE,
          end_date DATE,
          status TEXT DEFAULT 'planning',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sprint_id INTEGER REFERENCES sprints(id),
          assignee_id INTEGER REFERENCES users(id),
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'todo',
          priority TEXT DEFAULT 'medium',
          estimated_hours INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS daily_status (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id),
          date DATE DEFAULT (date('now')),
          yesterday TEXT,
          today TEXT,
          blockers TEXT,
          mood_score INTEGER DEFAULT 5,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, date)
        );
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS blockers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER REFERENCES tasks(id),
          description TEXT NOT NULL,
          severity TEXT DEFAULT 'medium',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME
        );
      `);

      logger.info('Таблицы SQLite базы данных инициализированы');
    } catch (error) {
      logger.error('Ошибка при создании таблиц:', error);
      throw error;
    }
  }

  // Методы для работы с пользователями
  async createUser(telegramId: string, name: string, username?: string, role: string = 'project_manager'): Promise<User> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const result = await this.db.run(
      'INSERT INTO users (telegram_id, name, username, role) VALUES (?, ?, ?, ?)',
      [telegramId, name, username || null, role]
    );
    
    const user = await this.db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    return user as User;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const user = await this.db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    return user as User || null;
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const users = await this.db.all('SELECT * FROM users ORDER BY created_at');
    return users as User[];
  }

  async updateUserRole(telegramId: string, newRole: string): Promise<User | null> {
    if (!this.db) throw new Error('База данных не подключена');
    
    await this.db.run(
      'UPDATE users SET role = ? WHERE telegram_id = ?',
      [newRole, telegramId]
    );
    
    const user = await this.db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    return user as User || null;
  }

  // Методы для работы с проектами
  async createProject(name: string, description: string): Promise<Project> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const result = await this.db.run(
      'INSERT INTO projects (name, description) VALUES (?, ?)',
      [name, description]
    );
    
    const project = await this.db.get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    return project as Project;
  }

  async getActiveProjects(): Promise<Project[]> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const projects = await this.db.all('SELECT * FROM projects WHERE status = ?', ['active']);
    return projects as Project[];
  }

  // Методы для работы с daily status
  async saveDailyStatus(userId: number, yesterday: string, today: string, blockers: string, moodScore: number = 5): Promise<DailyStatus> {
    if (!this.db) throw new Error('База данных не подключена');
    
    await this.db.run(`
      INSERT OR REPLACE INTO daily_status (user_id, yesterday, today, blockers, mood_score, date)
      VALUES (?, ?, ?, ?, ?, date('now'))
    `, [userId, yesterday, today, blockers, moodScore]);
    
    const status = await this.db.get(`
      SELECT * FROM daily_status 
      WHERE user_id = ? AND date = date('now')
    `, [userId]);
    
    return status as DailyStatus;
  }

  async getDailyStatusByDate(date: string): Promise<any[]> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const statuses = await this.db.all(`
      SELECT ds.*, u.name, u.role 
      FROM daily_status ds 
      JOIN users u ON ds.user_id = u.id 
      WHERE ds.date = ?
    `, [date]);
    
    return statuses;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
} 