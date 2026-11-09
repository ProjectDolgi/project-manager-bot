import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { DatabaseService } from '../services/database.service';
import { SubscriptionService } from '../services/subscription.service';
import { logger } from '../utils/logger';

// Хранилище состояний пользователей
const userStates = new Map<string, any>();

const ALLOWED_COMMANDS = ['/start', '/subscribe', '/subscription', '/help'];

export function setupMiddleware(
  bot: Telegraf<BotContext>,
  dbService: DatabaseService,
  subscriptionService?: SubscriptionService
) {
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

  // Middleware для проверки пользователя, подписки и состояний
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      try {
        const user = await dbService.getUserByTelegramId(ctx.from.id.toString());
        ctx.user = user;

        // Проверяем подписку для команд
        if (subscriptionService && user && ctx.message && 'text' in ctx.message) {
          const text = ctx.message.text;

          if (text.startsWith('/')) {
            const command = text.split(' ')[0].toLowerCase();

            if (!ALLOWED_COMMANDS.includes(command)) {
              const hasActive = await subscriptionService.hasActiveSubscription(user.id);

              if (!hasActive) {
                await ctx.reply(
                  '❌ Доступ заблокирован.\n\nДля использования бота оформите подписку: /subscribe\n\n🎁 Пробный период 1 сутки предоставляется автоматически при регистрации.'
                );
                return;
              }
            }
          }
        }

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