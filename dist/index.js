"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const config_1 = require("./config/config");
const database_service_1 = require("./services/database.service");
const ai_service_1 = require("./services/ai.service");
const project_service_1 = require("./services/project.service");
const voice_service_1 = require("./services/voice.service");
const subscription_service_1 = require("./services/subscription.service");
const payment_service_1 = require("./services/payment.service");
const commands_1 = require("./commands");
const middleware_1 = require("./middleware");
const cron_1 = require("./cron");
const logger_1 = require("./utils/logger");
// Список команд для автокомплита
const BOT_COMMANDS = [
    { command: 'start', description: '🚀 Начать работу с ботом' },
    { command: 'help', description: '❓ Справка по всем командам' },
    { command: 'subscribe', description: '💳 Оформить подписку' },
    { command: 'subscription', description: '📋 Моя подписка' },
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
class ProjectManagerBot {
    constructor() {
        this.bot = new telegraf_1.Telegraf(config_1.config.BOT_TOKEN);
        this.dbService = new database_service_1.DatabaseService();
        this.aiService = new ai_service_1.AIService();
        this.projectService = new project_service_1.ProjectService(this.dbService);
        this.voiceService = new voice_service_1.VoiceService();
        this.subscriptionService = new subscription_service_1.SubscriptionService(this.dbService);
        this.paymentService = new payment_service_1.PaymentService(this.dbService, this.subscriptionService);
    }
    async setupBotCommands() {
        try {
            await this.bot.telegram.setMyCommands(BOT_COMMANDS);
            logger_1.logger.info(`✅ Настроено ${BOT_COMMANDS.length} команд для автокомплита`);
        }
        catch (error) {
            logger_1.logger.warn('⚠️ Не удалось настроить команды автокомплита:', error);
        }
    }
    async initialize() {
        try {
            // Инициализация базы данных
            await this.dbService.connect();
            logger_1.logger.info('База данных подключена');
            // Настройка middleware
            (0, middleware_1.setupMiddleware)(this.bot, this.dbService, this.subscriptionService);
            // Настройка команд
            (0, commands_1.setupCommands)(this.bot, {
                dbService: this.dbService,
                aiService: this.aiService,
                projectService: this.projectService,
                voiceService: this.voiceService,
                subscriptionService: this.subscriptionService,
                paymentService: this.paymentService
            });
            // Настройка cron задач
            (0, cron_1.setupCronJobs)(this.bot, this.dbService, this.subscriptionService, this.paymentService);
            // Настройка команд автокомплита
            await this.setupBotCommands();
            // Запуск бота
            if (config_1.config.NODE_ENV === 'production' && config_1.config.WEBHOOK_URL) {
                // Production: webhook (только если задан WEBHOOK_URL)
                await this.bot.launch({
                    webhook: {
                        domain: config_1.config.WEBHOOK_URL,
                        port: config_1.config.PORT
                    }
                });
                logger_1.logger.info(`🚀 Проджект менеджер бот запущен в webhook режиме на ${config_1.config.WEBHOOK_URL}`);
            }
            else {
                // Development или production без WEBHOOK_URL: polling
                await this.bot.launch();
                logger_1.logger.info('🚀 Проджект менеджер бот запущен в polling режиме');
            }
            // Graceful shutdown
            process.once('SIGINT', () => this.bot.stop('SIGINT'));
            process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
        }
        catch (error) {
            logger_1.logger.error('Ошибка при запуске бота:', error);
            process.exit(1);
        }
    }
}
// Запуск приложения
const bot = new ProjectManagerBot();
bot.initialize();
//# sourceMappingURL=index.js.map