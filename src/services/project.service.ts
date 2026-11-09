import { DatabaseService, User, Project, Sprint, Task, DailyStatus } from './database.service';
import { logger } from '../utils/logger';
import { escapeMarkdown } from '../utils/escapeMarkdown';

export class ProjectService {
  constructor(private dbService: DatabaseService) {}

  async createProject(name: string, description: string): Promise<Project> {
    try {
      const project = await this.dbService.createProject(name, description);
      logger.info(`Создан новый проект: ${name}`);
      return project;
    } catch (error) {
      logger.error('Ошибка при создании проекта:', error);
      throw error;
    }
  }

  async getActiveProjects(): Promise<Project[]> {
    return await this.dbService.getActiveProjects();
  }

  async registerUser(telegramId: string, name: string, username?: string, role: string = 'project_manager'): Promise<User> {
    try {
      // Проверяем, существует ли пользователь
      const existingUser = await this.dbService.getUserByTelegramId(telegramId);
      if (existingUser) {
        return existingUser;
      }

      const user = await this.dbService.createUser(telegramId, name, username, role);
      logger.info(`Зарегистрирован новый пользователь: ${name} (@${username || 'без username'}) (${role})`);
      return user;
    } catch (error) {
      logger.error('Ошибка при регистрации пользователя:', error);
      throw error;
    }
  }

  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    return await this.dbService.getUserByTelegramId(telegramId);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.dbService.getAllUsers();
  }

  async updateUserRole(telegramId: string, newRole: string): Promise<User | null> {
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
        logger.info(`Роль пользователя ${user.name} изменена на ${newRole}`);
      }
      
      return user;
    } catch (error) {
      logger.error('Ошибка при изменении роли пользователя:', error);
      throw error;
    }
  }

  async saveDailyStatus(
    userId: number, 
    yesterday: string, 
    today: string, 
    blockers: string, 
    moodScore: number = 5
  ): Promise<DailyStatus> {
    try {
      const status = await this.dbService.saveDailyStatus(userId, yesterday, today, blockers, moodScore);
      logger.info(`Сохранен daily status для пользователя ${userId}`);
      return status;
    } catch (error) {
      logger.error('Ошибка при сохранении daily status:', error);
      throw error;
    }
  }

  async getTodayStatuses(): Promise<DailyStatus[]> {
    const today = new Date().toISOString().split('T')[0];
    return await this.dbService.getDailyStatusByDate(today);
  }

  async getStatusesByDate(date: string): Promise<any[]> {
    return await this.dbService.getDailyStatusByDate(date);
  }

  async getTeamSummary(): Promise<any> {
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
    } catch (error) {
      logger.error('Ошибка при получении сводки команды:', error);
      throw error;
    }
  }

  formatDailyStatusMessage(statuses: DailyStatus[]): string {
    if (statuses.length === 0) {
      return '📊 *Daily Standup*\n\nПока никто не отчитался сегодня.';
    }

    let message = '📊 *Daily Standup - Сводка дня*\n\n';
    
    statuses.forEach((status: any, index) => {
      const moodEmoji = this.getMoodEmoji(status.mood_score);
      message += `👤 *${escapeMarkdown(status.name)}* (${escapeMarkdown(status.role)}) ${moodEmoji}\n`;
      message += `✅ *Вчера:* ${escapeMarkdown(status.yesterday)}\n`;
      message += `🎯 *Сегодня:* ${escapeMarkdown(status.today)}\n`;
      
      if (status.blockers && status.blockers.trim()) {
        message += `🚫 *Блокеры:* ${escapeMarkdown(status.blockers)}\n`;
      }
      
      if (index < statuses.length - 1) {
        message += '\n---\n\n';
      }
    });

    return message;
  }

  private getMoodEmoji(score: number): string {
    if (score >= 8) return '😊';
    if (score >= 6) return '😐';
    if (score >= 4) return '😕';
    return '😞';
  }

  formatTeamSummary(summary: any): string {
    let message = '📈 *Сводка по команде*\n\n';
    message += `👥 Всего участников: ${summary.totalUsers}\n`;
    message += `✅ Отчитались сегодня: ${summary.activeUsers}\n`;
    message += `🚀 Активных проектов: ${summary.activeProjects}\n\n`;

    if (summary.activeProjects > 0) {
      message += '*Активные проекты:*\n';
      summary.projects.forEach((project: Project) => {
        message += `• ${escapeMarkdown(project.name)}\n`;
      });
      message += '\n';
    }

    const avgMood = summary.statuses.length > 0 
      ? summary.statuses.reduce((sum: number, s: any) => sum + s.mood_score, 0) / summary.statuses.length 
      : 0;
    
    if (avgMood > 0) {
      message += `😊 Средний уровень настроения: ${avgMood.toFixed(1)}/10\n`;
    }

    return message;
  }

  // МЕТОДЫ ДЛЯ РАБОТЫ СО СПРИНТАМИ

  async createSprint(name: string): Promise<Sprint> {
    try {
      // Создаем спринт на неделю (с понедельника по воскресенье)
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now);
      endDate.setDate(startDate.getDate() + 7);

      const sprint = await this.dbService.createSprint(name, startDate, endDate);
      logger.info(`Создан новый спринт: ${name}`);
      return sprint;
    } catch (error) {
      logger.error('Ошибка при создании спринта:', error);
      throw error;
    }
  }

  async getAllSprints(): Promise<Sprint[]> {
    return await this.dbService.getAllSprints();
  }

  async getCurrentSprint(): Promise<Sprint | null> {
    return await this.dbService.getCurrentSprint();
  }

  async getSprintTasks(sprintId: number): Promise<Task[]> {
    return await this.dbService.getSprintTasks(sprintId);
  }

  async addSprintTask(sprintId: number, title: string, zone: string): Promise<Task> {
    try {
      const task = await this.dbService.addSprintTask(sprintId, title, zone);
      logger.info(`Добавлена задача к спринту ${sprintId}: ${title} (${zone})`);
      return task;
    } catch (error) {
      logger.error('Ошибка при добавлении задачи к спринту:', error);
      throw error;
    }
  }

  async updateSprintGoal(sprintId: number, goal: string, hypothesis: string, targetAudience: string): Promise<Sprint | null> {
    try {
      const sprint = await this.dbService.updateSprintGoal(sprintId, goal, hypothesis, targetAudience);
      if (sprint) {
        logger.info(`Обновлена цель спринта ${sprintId}`);
      }
      return sprint;
    } catch (error) {
      logger.error('Ошибка при обновлении цели спринта:', error);
      throw error;
    }
  }

  async updateTaskStatus(taskId: number, status: 'pending' | 'in_progress' | 'completed'): Promise<Task | null> {
    try {
      const task = await this.dbService.updateTaskStatus(taskId, status);
      if (task) {
        logger.info(`Обновлен статус задачи ${taskId}: ${status}`);
      }
      return task;
    } catch (error) {
      logger.error('Ошибка при обновлении статуса задачи:', error);
      throw error;
    }
  }

  async getSprintProgress(sprintId: number): Promise<any> {
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
    } catch (error) {
      logger.error('Ошибка при получении прогресса спринта:', error);
      throw error;
    }
  }
}