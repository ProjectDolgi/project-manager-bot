import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../index';
import { Services } from './index';
import { logger } from '../utils/logger';
import { setUserState, getUserState, clearUserState } from '../middleware';

export function setupStandupCommands(bot: Telegraf<BotContext>, services: Services) {
  const { projectService } = services;

  // Команда /standup - запуск daily standup
  bot.command('standup', async (ctx) => {
    try {
      const users = await projectService.getAllUsers();
      
      if (users.length === 0) {
        await ctx.reply('В команде пока никого нет. Добавьте участников командой /start');
        return;
      }

      // Тегаем всех пользователей по username если есть
      const userTags = users.map(user => {
        if (user.username) {
          return `@${user.username}`;
        }
        return user.name;
      }).join(' ');
      
      const standupMessage = `
🌅 *Daily Standup*

${userTags}

Время для ежедневного стендапа! Пожалуйста, ответьте на вопросы:

1️⃣ *Что вы делали вчера?*
2️⃣ *Что планируете сегодня?*  
3️⃣ *Есть ли блокеры?*

Можете ответить текстом или голосовым сообщением 🎤

Для быстрого ответа используйте кнопки ⬇️
      `;

      await ctx.replyWithMarkdown(standupMessage,
        Markup.inlineKeyboard([
          [Markup.button.callback('📝 Ответить текстом', 'standup_text')],
          [Markup.button.callback('🎤 Голосовой ответ', 'standup_voice')],
          [Markup.button.callback('📊 Посмотреть статусы', 'standup_status')]
        ])
      );

    } catch (error) {
      logger.error('Ошибка в команде /standup:', error);
      await ctx.reply('Ошибка при запуске standup.');
    }
  });

  // Команда /mystatus - мой статус
  bot.command('mystatus', async (ctx) => {
    try {
      const user = await projectService.getUserByTelegramId(ctx.from?.id.toString() || '');
      
      if (!user) {
        await ctx.reply('Пользователь не найден. Используйте /start для регистрации.');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const statuses = await projectService.getStatusesByDate(today);
      const myStatus = statuses.find((s: any) => s.user_id === user.id);

      if (!myStatus) {
        await ctx.reply('Вы еще не отчитались сегодня. Используйте /standup для участия в daily standup.');
        return;
      }

      const statusMessage = `
📊 *Ваш статус на сегодня*

✅ *Вчера:* ${myStatus.yesterday}
🎯 *Сегодня:* ${myStatus.today}
${myStatus.blockers ? `🚫 *Блокеры:* ${myStatus.blockers}` : ''}
😊 *Настроение:* ${myStatus.mood_score}/10
      `;

      await ctx.replyWithMarkdown(statusMessage);

    } catch (error) {
      logger.error('Ошибка в команде /mystatus:', error);
      await ctx.reply('Ошибка при получении статуса.');
    }
  });

  // Команда /teamstatus - статус команды
  bot.command('teamstatus', async (ctx) => {
    try {
      const statuses = await projectService.getTodayStatuses();
      const message = projectService.formatDailyStatusMessage(statuses);
      
      await ctx.replyWithMarkdown(message);

    } catch (error) {
      logger.error('Ошибка в команде /teamstatus:', error);
      await ctx.reply('Ошибка при получении статуса команды.');
    }
  });

  // Обработка callback кнопок
  bot.action('standup_text', async (ctx) => {
    await ctx.answerCbQuery();
    
    const userId = ctx.from?.id.toString();
    if (userId) {
      setUserState(userId, {
        waitingForStandup: true,
        standupStep: 'yesterday',
        standupData: {}
      });
    }

    await ctx.reply('📝 *Что вы делали вчера?*\n\nОтправьте ваш ответ следующим сообщением.', { parse_mode: 'Markdown' });
  });

  bot.action('standup_voice', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🎤 Отправьте голосовое сообщение с вашим daily standup отчетом. ИИ автоматически разберет ваш ответ на составляющие.');
  });

  bot.action('standup_status', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
      const statuses = await projectService.getTodayStatuses();
      const message = projectService.formatDailyStatusMessage(statuses);
      
      await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.reply('Ошибка при получении статусов.');
    }
  });

  // Обработка текстовых ответов для standup
  bot.on('text', async (ctx, next) => {
    const userId = ctx.from?.id.toString();
    if (!userId) return next();

    const userState = getUserState(userId);
    if (!userState?.waitingForStandup) return next();

    try {
      const text = ctx.message.text;
      
      switch (userState.standupStep) {
        case 'yesterday':
          userState.standupData.yesterday = text;
          userState.standupStep = 'today';
          setUserState(userId, userState);
          await ctx.reply('🎯 *Что планируете делать сегодня?*', { parse_mode: 'Markdown' });
          break;
          
        case 'today':
          userState.standupData.today = text;
          userState.standupStep = 'blockers';
          setUserState(userId, userState);
          await ctx.reply('🚫 *Есть ли блокеры?* (напишите "нет" если блокеров нет)', { parse_mode: 'Markdown' });
          break;
          
        case 'blockers':
          userState.standupData.blockers = text === 'нет' ? '' : text;
          
          // Сохраняем в базу данных
          const user = await projectService.getUserByTelegramId(userId);
          if (user) {
            await projectService.saveDailyStatus(
              user.id,
              userState.standupData.yesterday,
              userState.standupData.today,
              userState.standupData.blockers,
              7 // Настроение по умолчанию
            );
            
            await ctx.reply('✅ *Спасибо! Ваш daily standup сохранен.*\n\nИспользуйте /teamstatus чтобы посмотреть статус всей команды.', { parse_mode: 'Markdown' });
          }
          
          clearUserState(userId);
          break;
      }
    } catch (error) {
      logger.error('Ошибка при обработке standup ответа:', error);
      clearUserState(userId);
      await ctx.reply('Произошла ошибка. Попробуйте снова с /standup');
    }
  });
} 