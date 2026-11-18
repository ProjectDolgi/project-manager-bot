"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSubscriptionMiddleware = void 0;
const logger_1 = require("../utils/logger");
const ALLOWED_COMMANDS = ['/start', '/subscribe', '/subscription', '/help'];
function setupSubscriptionMiddleware(bot, subscriptionService) {
    bot.use(async (ctx, next) => {
        try {
            // Проверяем только текстовые сообщения с командами
            if (!ctx.message || !('text' in ctx.message)) {
                return next();
            }
            const text = ctx.message.text;
            const isCommand = text.startsWith('/');
            if (!isCommand) {
                return next();
            }
            // Разрешаем определённые команды всегда
            const command = text.split(' ')[0].toLowerCase();
            if (ALLOWED_COMMANDS.includes(command)) {
                return next();
            }
            const userId = ctx.from?.id;
            if (!userId) {
                return next();
            }
            // Проверяем подписку
            const hasActive = await subscriptionService.hasActiveSubscription(userId);
            if (!hasActive) {
                await ctx.reply('❌ Доступ заблокирован.\n\nДля использования бота оформите подписку: /subscribe\n\n🎁 Пробный период 1 сутки предоставляется автоматически при регистрации.');
                return;
            }
            return next();
        }
        catch (error) {
            logger_1.logger.error('Ошибка в middleware подписки:', error);
            return next();
        }
    });
}
exports.setupSubscriptionMiddleware = setupSubscriptionMiddleware;
