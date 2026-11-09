"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const logger_1 = require("../utils/logger");
const escapeMarkdown_1 = require("../utils/escapeMarkdown");
class ProjectService {
    constructor(dbService) {
        this.dbService = dbService;
    }
    async createProject(name, description) {
        try {
            const project = await this.dbService.createProject(name, description);
            logger_1.logger.info(`Создан новый проект: ${name}`);
            return project;
        }
        catch (error) {
            logger_1.logger.error('Ошибка при создании проекта:', error);
            throw error;
        }
    }
    async getActiveProjects() {
        return await this.dbService.getActiveProjects();
    }
    async registerUser(telegramId, name, username, role = 'project_manager') {
        try {
            // Проверяем, существует ли пользователь
            const existingUser = await this.dbService.getUserByTelegramId(telegramId);
            if (existingUser) {
                return existingUser;
            }
            const user = await this.dbService.createUser(telegramId, name, username, role);
            logger_1.logger.info(`Зарегистрирован новый пользователь: ${name} (@${username || 'без username'}) (${role})`);
            return user;
        }
        catch (error) {
            logger_1.logger.error('Ошибка при регистрации пользователя:', error);
            throw error;
        }
    }
    async getUserByTelegramId(telegramId) {
        return await this.dbService.getUserByTelegramId(telegramId);
    }
    async getAllUsers() {
        return await this.dbService.getAllUsers();
    }
    async updateUserRole(telegramId, newRole) {
        try {
            const validRoles = [
                'admin',
                'project_manager',
                'frontend_developer',
                'backend_developer',
                'designer',
                'marketer',
                'producer',
                'psychologist'
            ];
            if (!validRoles.includes(newRole)) {
                throw new Error(`Недопустимая роль. Доступные роли: ${validRoles.join(', ')}`);
            }
            const user = await this.dbService.updateUserRole(telegramId, newRole);
            if (user) {
                logger_1.logger.info(`Роль пользователя ${user.name} изменена на ${newRole}`);
            }
            return user;
        }
        catch (error) {
            logger_1.logger.error('Ошибка при изменении роли пользователя:', error);
            throw error;
        }
    }
    async saveDailyStatus(userId, yesterday, today, blockers, moodScore = 5) {
        try {
            const status = await this.dbService.saveDailyStatus(userId, yesterday, today, blockers, moodScore);
            logger_1.logger.info(`Сохранен daily status для пользователя ${userId}`);
            return status;
        }
        catch (error) {
            logger_1.logger.error('Ошибка при сохранении daily status:', error);
            throw error;
        }
    }
    async getTodayStatuses() {
        const today = new Date().toISOString().split('T')[0];
        return await this.dbService.getDailyStatusByDate(today);
    }
    async getStatusesByDate(date) {
        return await this.dbService.getDailyStatusByDate(date);
    }
    async getTeamSummary() {
        try {
            const users = await this.getAllUsers();
            const todayStatuses = await this.getTodayStatuses();
            const projects = await this.getActiveProjects();
            return {
                totalUsers: users.length,
                activeUsers: todayStatuses.length,
                activeProjects: projects.length,
                statuses: todayStatuses,
                users: users,
                projects: projects
            };
        }
        catch (error) {
            logger_1.logger.error('Ошибка при получении сводки команды:', error);
            throw error;
        }
    }
    formatDailyStatusMessage(statuses) {
        if (statuses.length === 0) {
            return '📊 *Daily Standup*\n\nПока никто не отчитался сегодня.';
        }
        let message = '📊 *Daily Standup - Сводка дня*\n\n';
        statuses.forEach((status, index) => {
            const moodEmoji = this.getMoodEmoji(status.mood_score);
            message += `👤 *${(0, escapeMarkdown_1.escapeMarkdown)(status.name)}* (${(0, escapeMarkdown_1.escapeMarkdown)(status.role)}) ${moodEmoji}\n`;
            message += `✅ *Вчера:* ${(0, escapeMarkdown_1.escapeMarkdown)(status.yesterday)}\n`;
            message += `🎯 *Сегодня:* ${(0, escapeMarkdown_1.escapeMarkdown)(status.today)}\n`;
            if (status.blockers && status.blockers.trim()) {
                message += `🚫 *Блокеры:* ${(0, escapeMarkdown_1.escapeMarkdown)(status.blockers)}\n`;
            }
            if (index < statuses.length - 1) {
                message += '\n---\n\n';
            }
        });
        return message;
    }
    getMoodEmoji(score) {
        if (score >= 8)
            return '😊';
        if (score >= 6)
            return '😐';
        if (score >= 4)
            return '😕';
        return '😞';
    }
    formatTeamSummary(summary) {
        let message = '📈 *Сводка по команде*\n\n';
        message += `👥 Всего участников: ${summary.totalUsers}\n`;
        message += `✅ Отчитались сегодня: ${summary.activeUsers}\n`;
        message += `🚀 Активных проектов: ${summary.activeProjects}\n\n`;
        if (summary.activeProjects > 0) {
            message += '*Активные проекты:*\n';
            summary.projects.forEach((project) => {
                message += `• ${(0, escapeMarkdown_1.escapeMarkdown)(project.name)}\n`;
            });
            message += '\n';
        }
        const avgMood = summary.statuses.length > 0
            ? summary.statuses.reduce((sum, s) => sum + s.mood_score, 0) / summary.statuses.length
            : 0;
        if (avgMood > 0) {
            message += `😊 Средний уровень настроения: ${avgMood.toFixed(1)}/10\n`;
        }
        return message;
    }
    // МЕТОДЫ ДЛЯ РАБОТЫ СО СПРИНТАМИ
    async createSprint(name) {
        try {
            // Создаем спринт на неделю (с понедельника по воскресенье)
            const now = new Date();
            const startDate = new Date(now);
            const endDate = new Date(now);
            endDate.setDate(startDate.getDate() + 7);
            const sprint = await this.dbService.createSprint(name, startDate, endDate);
            logger_1.logger.info(`Создан новый спринт: ${name}`);
            return sprint;
        }
        catch (error) {
            logger_1.logger.error('Ошибка при создании спринта:', error);
            throw error;
        }
    }
    async getAllSprints() {
        return await this.dbService.getAllSprints();
    }
    async getCurrentSprint() {
        return await this.dbService.getCurrentSprint();
    }
    async getSprintTasks(sprintId) {
        return await this.dbService.getSprintTasks(sprintId);
    }
    async addSprintTask(sprintId, title, zone) {
        try {
            const task = await this.dbService.addSprintTask(sprintId, title, zone);
            logger_1.logger.info(`Добавлена задача к спринту ${sprintId}: ${title} (${zone})`);
            return task;
        }
        catch (error) {
            logger_1.logger.error('Ошибка при добавлении задачи к спринту:', error);
            throw error;
        }
    }
    async updateSprintGoal(sprintId, goal, hypothesis, targetAudience) {
        try {
            const sprint = await this.dbService.updateSprintGoal(sprintId, goal, hypothesis, targetAudience);
            if (sprint) {
                logger_1.logger.info(`Обновлена цель спринта ${sprintId}`);
            }
            return sprint;
        }
        catch (error) {
            logger_1.logger.error('Ошибка при обновлении цели спринта:', error);
            throw error;
        }
    }
    async updateTaskStatus(taskId, status) {
        try {
            const task = await this.dbService.updateTaskStatus(taskId, status);
            if (task) {
                logger_1.logger.info(`Обновлен статус задачи ${taskId}: ${status}`);
            }
            return task;
        }
        catch (error) {
            logger_1.logger.error('Ошибка при обновлении статуса задачи:', error);
            throw error;
        }
    }
    async getSprintProgress(sprintId) {
        try {
            const tasks = await this.getSprintTasks(sprintId);
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(task => task.status === 'completed').length;
            const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
            const pendingTasks = tasks.filter(task => task.status === 'pending').length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            return {
                totalTasks,
                completedTasks,
                inProgressTasks,
                pendingTasks,
                progress,
                tasks
            };
        }
        catch (error) {
            logger_1.logger.error('Ошибка при получении прогресса спринта:', error);
            throw error;
        }
    }
}
exports.ProjectService = ProjectService;
//# sourceMappingURL=project.service.js.map