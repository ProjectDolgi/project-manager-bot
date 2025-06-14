import * as cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { DatabaseService } from '../services/database.service';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export function setupCronJobs(bot: Telegraf<BotContext>, dbService: DatabaseService) {
  
  // Daily Standup напоминание (каждый день в указанное время)
  cron.schedule('0 9 * * 1-5', async () => {
    try {
      logger.info('Запуск автоматического Daily Standup');
      
      const users = await dbService.getAllUsers();
      
      if (users.length === 0) {
        return;
      }

      // Отправляем напоминание в основной чат (если настроен)
      if (config.ADMIN_CHAT_ID) {
        const userTags = users.map(user => `@${user.name.replace(/\s+/g, '_')}`).join(' ');
        
        const message = `
🌅 *Автоматический Daily Standup*

${userTags}

Доброе утро, команда! Время для ежедневного стендапа.

Пожалуйста, ответьте на вопросы:
1️⃣ Что вы делали вчера?
2️⃣ Что планируете сегодня?
3️⃣ Есть ли блокеры?

Используйте /standup для участия.
        `;

        await bot.telegram.sendMessage(config.ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
      }

    } catch (error) {
      logger.error('Ошибка в cron задаче Daily Standup:', error);
    }
  });

  // Еженедельный отчет (каждую пятницу в 17:00)
  cron.schedule('0 17 * * 5', async () => {
    try {
      logger.info('Генерация еженедельного отчета');
      
      if (!config.SUMMARY_CHAT_ID) {
        return;
      }

      // Получаем статистику за неделю
      const users = await dbService.getAllUsers();
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      let weeklyReport = '📊 *Еженедельный отчет*\n\n';
      weeklyReport += `📅 Период: ${weekAgo.toLocaleDateString('ru-RU')} - ${today.toLocaleDateString('ru-RU')}\n`;
      weeklyReport += `👥 Участников в команде: ${users.length}\n\n`;
      
      // Здесь можно добавить более детальную статистику
      weeklyReport += '*Основные достижения недели будут добавлены в следующих версиях*\n\n';
      weeklyReport += 'Хорошей работы на следующей неделе! 💪';

      await bot.telegram.sendMessage(config.SUMMARY_CHAT_ID, weeklyReport, { parse_mode: 'Markdown' });

    } catch (error) {
      logger.error('Ошибка в cron задаче еженедельного отчета:', error);
    }
  });

  // Напоминание о незаполненных статусах (каждый день в 12:00)
  cron.schedule('0 12 * * 1-5', async () => {
    try {
      logger.info('Проверка незаполненных статусов');
      
      const users = await dbService.getAllUsers();
      const today = new Date().toISOString().split('T')[0];
      const todayStatuses = await dbService.getDailyStatusByDate(today);
      
      const usersWithoutStatus = users.filter(user => 
        !todayStatuses.some((status: any) => status.user_id === user.id)
      );

      if (usersWithoutStatus.length > 0 && config.ADMIN_CHAT_ID) {
        const userTags = usersWithoutStatus.map(user => `@${user.name.replace(/\s+/g, '_')}`).join(' ');
        
        const message = `
⏰ *Напоминание о Daily Standup*

${userTags}

Вы еще не отчитались сегодня. Пожалуйста, заполните свой статус командой /standup

Это поможет команде быть в курсе прогресса! 📈
        `;

        await bot.telegram.sendMessage(config.ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
      }

    } catch (error) {
      logger.error('Ошибка в cron задаче напоминания:', error);
    }
  });

  logger.info('Cron задачи настроены');
} 