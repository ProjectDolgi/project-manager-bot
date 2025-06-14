import { DatabaseService, User, Project, Sprint, Task, DailyStatus } from './database.service';
import { logger } from '../utils/logger';

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
      message += `👤 *${status.name}* (${status.role}) ${moodEmoji}\n`;
      message += `✅ *Вчера:* ${status.yesterday}\n`;
      message += `🎯 *Сегодня:* ${status.today}\n`;
      
      if (status.blockers && status.blockers.trim()) {
        message += `🚫 *Блокеры:* ${status.blockers}\n`;
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
        message += `• ${project.name}\n`;
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
}