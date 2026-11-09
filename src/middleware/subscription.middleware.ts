import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { SubscriptionService } from '../services/subscription.service';
import { logger } from '../utils/logger';

const ALLOWED_COMMANDS = ['/start', '/subscribe', '/subscription', '/help'];

export function setupSubscriptionMiddleware(
  bot: Telegraf<BotContext>,
  subscriptionService: SubscriptionService
) {
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
        await ctx.reply(
          '❌ Доступ заблокирован.\n\nДля использования бота оформите подписку: /subscribe\n\n🎁 Пробный период 1 сутки предоставляется автоматически при регистрации.'
        );
        return;
      }

      return next();
    } catch (error) {
      logger.error('Ошибка в middleware подписки:', error);
      return next();
    }
  });
}
