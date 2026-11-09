"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
class DatabaseService {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DATABASE_PATH || path_1.default.join(process.cwd(), 'data', 'bot.db');
    }
    async connect() {
        try {
            // Создаем директорию для базы данных если не существует
            const dbDir = path_1.default.dirname(this.dbPath);
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            this.db = await (0, sqlite_1.open)({
                filename: this.dbPath,
                driver: sqlite3_1.default.Database
            });
            await this.initializeTables();
            logger_1.logger.info('SQLite база данных успешно подключена');
        }
        catch (error) {
            logger_1.logger.error('Ошибка подключения к SQLite базе данных:', error);
            throw error;
        }
    }
    async initializeTables() {
        if (!this.db)
            throw new Error('База данных не подключена');
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
            logger_1.logger.info('Таблицы SQLite базы данных инициализированы');
        }
        catch (error) {
            logger_1.logger.error('Ошибка при создании таблиц:', error);
            throw error;
        }
    }
    async runMigrations() {
        if (!this.db)
            throw new Error('База данных не подключена');
        try {
            // Проверяем и добавляем колонки в таблицу sprints
            const sprintColumns = await this.db.all("PRAGMA table_info(sprints)");
            const sprintColumnNames = sprintColumns.map((col) => col.name);
            if (!sprintColumnNames.includes('goal')) {
                await this.db.exec('ALTER TABLE sprints ADD COLUMN goal TEXT');
                logger_1.logger.info('Добавлена колонка goal в таблицу sprints');
            }
            if (!sprintColumnNames.includes('hypothesis')) {
                await this.db.exec('ALTER TABLE sprints ADD COLUMN hypothesis TEXT');
                logger_1.logger.info('Добавлена колонка hypothesis в таблицу sprints');
            }
            if (!sprintColumnNames.includes('target_audience')) {
                await this.db.exec('ALTER TABLE sprints ADD COLUMN target_audience TEXT');
                logger_1.logger.info('Добавлена колонка target_audience в таблицу sprints');
            }
            // Проверяем и добавляем колонку zone в таблицу tasks
            const taskColumns = await this.db.all("PRAGMA table_info(tasks)");
            const taskColumnNames = taskColumns.map((col) => col.name);
            if (!taskColumnNames.includes('zone')) {
                await this.db.exec('ALTER TABLE tasks ADD COLUMN zone TEXT NOT NULL DEFAULT "разработка"');
                logger_1.logger.info('Добавлена колонка zone в таблицу tasks');
            }
            logger_1.logger.info('Миграции базы данных выполнены успешно');
        }
        catch (error) {
            logger_1.logger.error('Ошибка при выполнении миграций:', error);
            throw error;
        }
    }
    // Методы для работы с пользователями
    async createUser(telegramId, name, username, role = 'project_manager') {
        if (!this.db)
            throw new Error('База данных не подключена');
        const result = await this.db.run('INSERT INTO users (telegram_id, name, username, role) VALUES (?, ?, ?, ?)', [telegramId, name, username || null, role]);
        const user = await this.db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
        return user;
    }
    async getUserByTelegramId(telegramId) {
        if (!this.db)
            throw new Error('База данных не подключена');
        const user = await this.db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        return user || null;
    }
    async getAllUsers() {
        if (!this.db)
            throw new Error('База данных не подключена');
        const users = await this.db.all('SELECT * FROM users ORDER BY created_at');
        return users;
    }
    async updateUserRole(telegramId, newRole) {
        if (!this.db)
            throw new Error('База данных не подключена');
        await this.db.run('UPDATE users SET role = ? WHERE telegram_id = ?', [newRole, telegramId]);
        const user = await this.db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        return user || null;
    }
    // Методы для работы с проектами
    async createProject(name, description) {
        if (!this.db)
            throw new Error('База данных не подключена');
        const result = await this.db.run('INSERT INTO projects (name, description) VALUES (?, ?)', [name, description]);
        const project = await this.db.get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
        return project;
    }
    async getActiveProjects() {
        if (!this.db)
            throw new Error('База данных не подключена');
        const projects = await this.db.all('SELECT * FROM projects WHERE status = ?', ['active']);
        return projects;
    }
    // Методы для работы с daily status
    async saveDailyStatus(userId, yesterday, today, blockers, moodScore = 5) {
        if (!this.db)
            throw new Error('База данных не подключена');
        await this.db.run(`
      INSERT OR REPLACE INTO daily_status (user_id, yesterday, today, blockers, mood_score, date)
      VALUES (?, ?, ?, ?, ?, date('now'))
    `, [userId, yesterday, today, blockers, moodScore]);
        const status = await this.db.get(`
      SELECT * FROM daily_status 
      WHERE user_id = ? AND date = date('now')
    `, [userId]);
        return status;
    }
    async getDailyStatusByDate(date) {
        if (!this.db)
            throw new Error('База данных не подключена');
        const statuses = await this.db.all(`
      SELECT ds.*, u.name, u.role 
      FROM daily_status ds 
      JOIN users u ON ds.user_id = u.id 
      WHERE ds.date = ?
    `, [date]);
        return statuses;
    }
    // МЕТОДЫ ДЛЯ РАБОТЫ С ПОДПИСКАМИ
    async getSubscriptionByUserId(userId) {
        if (!this.db)
            throw new Error('База данных не подключена');
        const subscription = await this.db.get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
        return subscription || null;
    }
    async createTrialSubscription(userId, trialDays) {
        if (!this.db)
            throw new Error('База данных не подключена');
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
        return subscription;
    }
    async activateSubscription(userId, plan, days, paymentMethodId) {
        if (!this.db)
            throw new Error('База данных не подключена');
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
        return subscription;
    }
    async extendSubscription(userId, days) {
        if (!this.db)
            throw new Error('База данных не подключена');
        await this.db.run(`
      UPDATE subscriptions
      SET end_date = datetime(end_date, '+${days} days'),
          status = 'active',
          updated_at = datetime('now')
      WHERE user_id = ?
    `, [userId]);
        const subscription = await this.db.get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
        return subscription;
    }
    async updateSubscriptionStatus(userId, status) {
        if (!this.db)
            throw new Error('База данных не подключена');
        await this.db.run(`
      UPDATE subscriptions
      SET status = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `, [status, userId]);
    }
    async updatePaymentMethod(userId, paymentMethodId) {
        if (!this.db)
            throw new Error('База данных не подключена');
        await this.db.run(`
      UPDATE subscriptions
      SET payment_method_id = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `, [paymentMethodId, userId]);
    }
    async setAutoRenew(userId, autoRenew) {
        if (!this.db)
            throw new Error('База данных не подключена');
        await this.db.run(`
      UPDATE subscriptions
      SET auto_renew = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `, [autoRenew ? 1 : 0, userId]);
    }
    async getExpiringSubscriptions(withinHours = 24) {
        if (!this.db)
            throw new Error('База данных не подключена');
        const subscriptions = await this.db.all(`
      SELECT s.*, u.telegram_id, u.name, u.username
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.auto_renew = 1
        AND s.status IN ('active', 'trial')
        AND s.end_date <= datetime('now', '+${withinHours} hours')
        AND s.end_date > datetime('now')
    `);
        return subscriptions;
    }
    async getExpiredSubscriptions() {
        if (!this.db)
            throw new Error('База данных не подключена');
        const subscriptions = await this.db.all(`
      SELECT s.*, u.telegram_id, u.name, u.username
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status IN ('active', 'trial')
        AND s.end_date <= datetime('now')
    `);
        return subscriptions;
    }
    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
    }
    // МЕТОДЫ ДЛЯ РАБОТЫ СО СПРИНТАМИ
    async createSprint(name, startDate, endDate) {
        if (!this.db)
            throw new Error('База данных не подключена');
        const result = await this.db.run('INSERT INTO sprints (name, start_date, end_date, status) VALUES (?, ?, ?, ?)', [name, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], 'active']);
        const sprint = await this.db.get('SELECT * FROM sprints WHERE id = ?', [result.lastID]);
        return sprint;
    }
    async getAllSprints() {
        if (!this.db)
            throw new Error('База данных не подключена');
        const sprints = await this.db.all('SELECT * FROM sprints ORDER BY created_at DESC');
        return sprints;
    }
    async getCurrentSprint() {
        if (!this.db)
            throw new Error('База данных не подключена');
        const sprint = await this.db.get('SELECT * FROM sprints WHERE status = ? ORDER BY created_at DESC LIMIT 1', ['active']);
        return sprint || null;
    }
    async updateSprintGoal(sprintId, goal, hypothesis, targetAudience) {
        if (!this.db)
            throw new Error('База данных не подключена');
        await this.db.run('UPDATE sprints SET goal = ?, hypothesis = ?, target_audience = ? WHERE id = ?', [goal, hypothesis, targetAudience, sprintId]);
        const sprint = await this.db.get('SELECT * FROM sprints WHERE id = ?', [sprintId]);
        return sprint || null;
    }
    // МЕТОДЫ ДЛЯ РАБОТЫ С ЗАДАЧАМИ
    async addSprintTask(sprintId, title, zone) {
        if (!this.db)
            throw new Error('База данных не подключена');
        const result = await this.db.run('INSERT INTO tasks (sprint_id, title, zone, status) VALUES (?, ?, ?, ?)', [sprintId, title, zone, 'pending']);
        const task = await this.db.get('SELECT * FROM tasks WHERE id = ?', [result.lastID]);
        return task;
    }
    async getSprintTasks(sprintId) {
        if (!this.db)
            throw new Error('База данных не подключена');
        const tasks = await this.db.all('SELECT * FROM tasks WHERE sprint_id = ? ORDER BY created_at', [sprintId]);
        return tasks;
    }
    async updateTaskStatus(taskId, status) {
        if (!this.db)
            throw new Error('База данных не подключена');
        await this.db.run('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
        const task = await this.db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
        return task || null;
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.service.js.map