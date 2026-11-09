"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMiddleware = setupMiddleware;
exports.setUserState = setUserState;
exports.getUserState = getUserState;
exports.clearUserState = clearUserState;
const logger_1 = require("../utils/logger");
// Хранилище состояний пользователей
const userStates = new Map();
function setupMiddleware(bot, dbService) {
    // Middleware для логирования
    bot.use(async (ctx, next) => {
        const start = Date.now();
        const user = ctx.from;
        let messageInfo = 'неизвестный тип';
        if (ctx.message && 'text' in ctx.message) {
            messageInfo = ctx.message.text;
        }
        else if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
            messageInfo = `callback: ${ctx.callbackQuery.data}`;
        }
        else if (ctx.message && 'voice' in ctx.message) {
            messageInfo = 'голосовое сообщение';
        }
        else if (ctx.message && 'photo' in ctx.message) {
            messageInfo = 'фото';
        }
        logger_1.logger.info(`Получено сообщение от ${user?.first_name} (${user?.id}): ${messageInfo}`);
        await next();
        const ms = Date.now() - start;
        logger_1.logger.info(`Обработано за ${ms}ms`);
    });
    // Middleware для проверки пользователя и состояний
    bot.use(async (ctx, next) => {
        if (ctx.from) {
            try {
                const user = await dbService.getUserByTelegramId(ctx.from.id.toString());
                ctx.user = user;
                // Получаем состояние пользователя
                const userState = userStates.get(ctx.from.id.toString());
                if (userState) {
                    ctx.userState = userState;
                }
            }
            catch (error) {
                logger_1.logger.error('Ошибка при получении пользователя:', error);
            }
        }
        await next();
    });
    // Middleware для обработки ошибок
    bot.catch((err, ctx) => {
        logger_1.logger.error('Ошибка в боте:', err);
        ctx.reply('Произошла ошибка. Попробуйте позже.');
    });
}
// Функции для работы с состояниями пользователей
function setUserState(userId, state) {
    userStates.set(userId, state);
}
function getUserState(userId) {
    return userStates.get(userId);
}
function clearUserState(userId) {
    userStates.delete(userId);
}
//# sourceMappingURL=index.js.map