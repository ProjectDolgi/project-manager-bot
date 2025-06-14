import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { DatabaseService } from '../services/database.service';
import { logger } from '../utils/logger';

// Хранилище состояний пользователей
const userStates = new Map<string, any>();

export function setupMiddleware(bot: Telegraf<BotContext>, dbService: DatabaseService) {
  // Middleware для логирования
  bot.use(async (ctx, next) => {
    const start = Date.now();
    const user = ctx.from;
    
    let messageInfo = 'неизвестный тип';
    if (ctx.message && 'text' in ctx.message) {
      messageInfo = ctx.message.text;
    } else if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      messageInfo = `callback: ${ctx.callbackQuery.data}`;
    } else if (ctx.message && 'voice' in ctx.message) {
      messageInfo = 'голосовое сообщение';
    } else if (ctx.message && 'photo' in ctx.message) {
      messageInfo = 'фото';
    }
    
    logger.info(`Получено сообщение от ${user?.first_name} (${user?.id}): ${messageInfo}`);
    
    await next();
    
    const ms = Date.now() - start;
    logger.info(`Обработано за ${ms}ms`);
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
      } catch (error) {
        logger.error('Ошибка при получении пользователя:', error);
      }
    }
    
    await next();
  });

  // Middleware для обработки ошибок
  bot.catch((err, ctx) => {
    logger.error('Ошибка в боте:', err);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  });
}

// Функции для работы с состояниями пользователей
export function setUserState(userId: string, state: any) {
  userStates.set(userId, state);
}

export function getUserState(userId: string) {
  return userStates.get(userId);
}

export function clearUserState(userId: string) {
  userStates.delete(userId);
} 