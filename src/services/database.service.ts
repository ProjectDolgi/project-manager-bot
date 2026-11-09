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
  goal?: string;
  hypothesis?: string;
  target_audience?: string;
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
  zone: string;
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

export interface Subscription {
  id: number;
  user_id: number;
  plan: 'trial' | 'monthly' | 'yearly';
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  payment_method_id?: string;
  auto_renew: number; // 0 или 1 для SQLite
  created_at: string;
  updated_at: string;
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
          goal TEXT,
          hypothesis TEXT,
          target_audience TEXT,
          start_date DATE,
          end_date DATE,
          status TEXT DEFAULT 'active',
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
          zone TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
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

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
          plan TEXT DEFAULT 'trial',
          status TEXT DEFAULT 'trial',
          start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          end_date DATETIME,
          payment_method_id TEXT,
          auto_renew INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // МИГРАЦИИ ДЛЯ ОБНОВЛЕНИЯ СУЩЕСТВУЮЩИХ ТАБЛИЦ
      await this.runMigrations();

      logger.info('Таблицы SQLite базы данных инициализированы');
    } catch (error) {
      logger.error('Ошибка при создании таблиц:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('База данных не подключена');
    
    try {
      // Проверяем и добавляем колонки в таблицу sprints
      const sprintColumns = await this.db.all("PRAGMA table_info(sprints)");
      const sprintColumnNames = sprintColumns.map((col: any) => col.name);
      
      if (!sprintColumnNames.includes('goal')) {
        await this.db.exec('ALTER TABLE sprints ADD COLUMN goal TEXT');
        logger.info('Добавлена колонка goal в таблицу sprints');
      }
      
      if (!sprintColumnNames.includes('hypothesis')) {
        await this.db.exec('ALTER TABLE sprints ADD COLUMN hypothesis TEXT');
        logger.info('Добавлена колонка hypothesis в таблицу sprints');
      }
      
      if (!sprintColumnNames.includes('target_audience')) {
        await this.db.exec('ALTER TABLE sprints ADD COLUMN target_audience TEXT');
        logger.info('Добавлена колонка target_audience в таблицу sprints');
      }

      // Проверяем и добавляем колонку zone в таблицу tasks
      const taskColumns = await this.db.all("PRAGMA table_info(tasks)");
      const taskColumnNames = taskColumns.map((col: any) => col.name);
      
      if (!taskColumnNames.includes('zone')) {
        await this.db.exec('ALTER TABLE tasks ADD COLUMN zone TEXT NOT NULL DEFAULT "разработка"');
        logger.info('Добавлена колонка zone в таблицу tasks');
      }

      logger.info('Миграции базы данных выполнены успешно');
    } catch (error) {
      logger.error('Ошибка при выполнении миграций:', error);
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

  // МЕТОДЫ ДЛЯ РАБОТЫ С ПОДПИСКАМИ

  async getSubscriptionByUserId(userId: number): Promise<Subscription | null> {
    if (!this.db) throw new Error('База данных не подключена');

    const subscription = await this.db.get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
    return subscription as Subscription || null;
  }

  async createTrialSubscription(userId: number, trialDays: number): Promise<Subscription> {
    if (!this.db) throw new Error('База данных не подключена');

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + trialDays);

    await this.db.run(`
      INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, auto_renew)
      VALUES (?, 'trial', 'trial', datetime('now'), datetime('now', '+${trialDays} days'), 1)
      ON CONFLICT(user_id) DO UPDATE SET
        plan = 'trial',
        status = 'trial',
        start_date = datetime('now'),
        end_date = datetime('now', '+${trialDays} days'),
        auto_renew = 1,
        updated_at = datetime('now')
    `, [userId]);

    const subscription = await this.db.get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
    return subscription as Subscription;
  }

  async activateSubscription(
    userId: number,
    plan: 'monthly' | 'yearly',
    days: number,
    paymentMethodId?: string
  ): Promise<Subscription> {
    if (!this.db) throw new Error('База данных не подключена');

    await this.db.run(`
      INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, payment_method_id, auto_renew)
      VALUES (?, ?, 'active', datetime('now'), datetime('now', '+${days} days'), ?, 1)
      ON CONFLICT(user_id) DO UPDATE SET
        plan = ?,
        status = 'active',
        start_date = datetime('now'),
        end_date = datetime('now', '+${days} days'),
        payment_method_id = COALESCE(?, payment_method_id),
        auto_renew = 1,
        updated_at = datetime('now')
    `, [userId, plan, paymentMethodId || null, plan, paymentMethodId || null]);

    const subscription = await this.db.get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
    return subscription as Subscription;
  }

  async extendSubscription(userId: number, days: number): Promise<Subscription> {
    if (!this.db) throw new Error('База данных не подключена');

    await this.db.run(`
      UPDATE subscriptions
      SET end_date = datetime(end_date, '+${days} days'),
          status = 'active',
          updated_at = datetime('now')
      WHERE user_id = ?
    `, [userId]);

    const subscription = await this.db.get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
    return subscription as Subscription;
  }

  async updateSubscriptionStatus(userId: number, status: 'trial' | 'active' | 'expired' | 'cancelled'): Promise<void> {
    if (!this.db) throw new Error('База данных не подключена');

    await this.db.run(`
      UPDATE subscriptions
      SET status = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `, [status, userId]);
  }

  async updatePaymentMethod(userId: number, paymentMethodId: string): Promise<void> {
    if (!this.db) throw new Error('База данных не подключена');

    await this.db.run(`
      UPDATE subscriptions
      SET payment_method_id = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `, [paymentMethodId, userId]);
  }

  async setAutoRenew(userId: number, autoRenew: boolean): Promise<void> {
    if (!this.db) throw new Error('База данных не подключена');

    await this.db.run(`
      UPDATE subscriptions
      SET auto_renew = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `, [autoRenew ? 1 : 0, userId]);
  }

  async getExpiringSubscriptions(withinHours: number = 24): Promise<Subscription[]> {
    if (!this.db) throw new Error('База данных не подключена');

    const subscriptions = await this.db.all(`
      SELECT s.*, u.telegram_id, u.name, u.username
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.auto_renew = 1
        AND s.status IN ('active', 'trial')
        AND s.end_date <= datetime('now', '+${withinHours} hours')
        AND s.end_date > datetime('now')
    `);

    return subscriptions as Subscription[];
  }

  async getExpiredSubscriptions(): Promise<Subscription[]> {
    if (!this.db) throw new Error('База данных не подключена');

    const subscriptions = await this.db.all(`
      SELECT s.*, u.telegram_id, u.name, u.username
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status IN ('active', 'trial')
        AND s.end_date <= datetime('now')
    `);

    return subscriptions as Subscription[];
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  // МЕТОДЫ ДЛЯ РАБОТЫ СО СПРИНТАМИ

  async createSprint(name: string, startDate: Date, endDate: Date): Promise<Sprint> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const result = await this.db.run(
      'INSERT INTO sprints (name, start_date, end_date, status) VALUES (?, ?, ?, ?)',
      [name, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], 'active']
    );
    
    const sprint = await this.db.get('SELECT * FROM sprints WHERE id = ?', [result.lastID]);
    return sprint as Sprint;
  }

  async getAllSprints(): Promise<Sprint[]> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const sprints = await this.db.all('SELECT * FROM sprints ORDER BY created_at DESC');
    return sprints as Sprint[];
  }

  async getCurrentSprint(): Promise<Sprint | null> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const sprint = await this.db.get('SELECT * FROM sprints WHERE status = ? ORDER BY created_at DESC LIMIT 1', ['active']);
    return sprint as Sprint || null;
  }

  async updateSprintGoal(sprintId: number, goal: string, hypothesis: string, targetAudience: string): Promise<Sprint | null> {
    if (!this.db) throw new Error('База данных не подключена');
    
    await this.db.run(
      'UPDATE sprints SET goal = ?, hypothesis = ?, target_audience = ? WHERE id = ?',
      [goal, hypothesis, targetAudience, sprintId]
    );
    
    const sprint = await this.db.get('SELECT * FROM sprints WHERE id = ?', [sprintId]);
    return sprint as Sprint || null;
  }

  // МЕТОДЫ ДЛЯ РАБОТЫ С ЗАДАЧАМИ

  async addSprintTask(sprintId: number, title: string, zone: string): Promise<Task> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const result = await this.db.run(
      'INSERT INTO tasks (sprint_id, title, zone, status) VALUES (?, ?, ?, ?)',
      [sprintId, title, zone, 'pending']
    );
    
    const task = await this.db.get('SELECT * FROM tasks WHERE id = ?', [result.lastID]);
    return task as Task;
  }

  async getSprintTasks(sprintId: number): Promise<Task[]> {
    if (!this.db) throw new Error('База данных не подключена');
    
    const tasks = await this.db.all('SELECT * FROM tasks WHERE sprint_id = ? ORDER BY created_at', [sprintId]);
    return tasks as Task[];
  }

  async updateTaskStatus(taskId: number, status: 'pending' | 'in_progress' | 'completed'): Promise<Task | null> {
    if (!this.db) throw new Error('База данных не подключена');
    
    await this.db.run(
      'UPDATE tasks SET status = ? WHERE id = ?',
      [status, taskId]
    );
    
    const task = await this.db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    return task as Task || null;
  }
} 