import { Telegraf, Context } from 'telegraf';
import { config } from './config/config';
import { DatabaseService } from './services/database.service';
import { AIService } from './services/ai.service';
import { ProjectService } from './services/project.service';
import { setupCommands } from './commands';
import { setupMiddleware } from './middleware';
import { setupCronJobs } from './cron';
import { logger } from './utils/logger';

// Список команд для автокомплита
const BOT_COMMANDS = [
  { command: 'start', description: '🚀 Начать работу с ботом' },
  { command: 'help', description: '❓ Справка по всем командам' },
  { command: 'profile', description: '👤 Настройки профиля' },
  { command: 'team', description: '👥 Состав команды' },
  { command: 'standup', description: '📊 Запуск daily standup' },
  { command: 'mystatus', description: '📝 Мой статус на сегодня' },
  { command: 'teamstatus', description: '📈 Статус всей команды' },
  { command: 'projects', description: '🚀 Управление проектами' },
  { command: 'project', description: '📁 Создать новый проект' },
  { command: 'ai', description: '🤖 Задать вопрос ИИ' },
  { command: 'analyze', description: '📊 Анализ состояния команды' },
  { command: 'summary', description: '📋 Генерация отчета' },
  { command: 'setrole', description: '👑 Изменить роль пользователя (админ)' },
  { command: 'promote', description: '⬆️ Повысить до администратора (админ)' },
  { command: 'roles', description: '👥 Просмотр ролей команды (админ)' }
];

export interface BotContext extends Context {
  user?: any;
  project?: any;
  userState?: any;
}

class ProjectManagerBot {
  private bot: Telegraf<BotContext>;
  private dbService: DatabaseService;
  private aiService: AIService;
  private projectService: ProjectService;

  constructor() {
    this.bot = new Telegraf<BotContext>(config.BOT_TOKEN);
    this.dbService = new DatabaseService();
    this.aiService = new AIService();
    this.projectService = new ProjectService(this.dbService);
  }

  private async setupBotCommands() {
    try {
      await this.bot.telegram.setMyCommands(BOT_COMMANDS);
      logger.info(`✅ Настроено ${BOT_COMMANDS.length} команд для автокомплита`);
    } catch (error) {
      logger.warn('⚠️ Не удалось настроить команды автокомплита:', error);
    }
  }

  async initialize() {
    try {
      // Инициализация базы данных
      await this.dbService.connect();
      logger.info('База данных подключена');

      // Настройка middleware
      setupMiddleware(this.bot, this.dbService);

      // Настройка команд
      setupCommands(this.bot, {
        dbService: this.dbService,
        aiService: this.aiService,
        projectService: this.projectService
      });

      // Настройка cron задач
      setupCronJobs(this.bot, this.dbService);

      // Настройка команд автокомплита
      await this.setupBotCommands();

      // Запуск бота
      if (config.NODE_ENV === 'production') {
        // Production: webhook
        await this.bot.launch({
          webhook: {
            domain: config.WEBHOOK_URL,
            port: config.PORT
          }
        });
      } else {
        // Development: polling
        await this.bot.launch();
      }

      logger.info('🚀 Проджект менеджер бот запущен!');

      // Graceful shutdown
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

    } catch (error) {
      logger.error('Ошибка при запуске бота:', error);
      process.exit(1);
    }
  }
}

// Запуск приложения
const bot = new ProjectManagerBot();
bot.initialize(); 