import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../index';
import { Services } from './index';
import { logger } from '../utils/logger';

export function setupBasicCommands(bot: Telegraf<BotContext>, services: Services) {
  const { projectService } = services;

  // Команда /start
  bot.start(async (ctx) => {
    try {
      const user = ctx.from;
      if (!user) return;

      // Регистрируем пользователя
      await projectService.registerUser(
        user.id.toString(),
        user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
        user.username,
        'project_manager'
      );

      const welcomeMessage = `
🚀 *Добро пожаловать в Проджект Менеджер Бот!*

Я помогу вашей команде эффективно работать по Agile методологии.

*Основные возможности:*
• 📊 Daily Standup автоматизация
• 🎯 Управление задачами и проектами  
• 🤖 ИИ анализ и рекомендации
• 📈 Отчеты и аналитика
• 🗣 Голосовые команды

*Начните с команд:*
/help - справка по всем командам
/profile - настройка профиля
/projects - управление проектами
/standup - запустить daily standup

Готовы к продуктивной работе? 💪
      `;

      await ctx.replyWithMarkdown(welcomeMessage, 
        Markup.keyboard([
          ['📊 Daily Standup', '🚀 Проекты'],
          ['👥 Команда', '📈 Отчеты'],
          ['🤖 AI Помощник', '⚙️ Настройки']
        ]).resize()
      );

    } catch (error) {
      logger.error('Ошибка в команде /start:', error);
      await ctx.reply('Произошла ошибка при регистрации. Попробуйте позже.');
    }
  });

  // Команда /help
  bot.help(async (ctx) => {
    const helpMessage = `
📚 *Справка по командам*

*🔧 Основные команды:*
/start - начать работу с ботом
/help - эта справка
/profile - настройка профиля
/status - текущий статус

*🚀 Проекты:*
/projects - список проектов
/project <название> - создать проект
/tasks - мои задачи

*📊 Daily Standup:*
/standup - запустить standup
/mystatus - мой статус на сегодня
/teamstatus - статус всей команды

*🤖 ИИ команды:*
/ai <вопрос> - задать вопрос ИИ
/analyze - анализ команды
/summary - сгенерировать отчет

*👥 Команда:*
/team - список участников
/invite - пригласить в команду

*📈 Отчеты:*
/report - ежедневный отчет
/weekly - еженедельный отчет

*🎤 Голосовые команды:*
Просто отправьте голосовое сообщение, и ИИ поймет что нужно сделать!

Для быстрого доступа используйте кнопки меню ⬇️
    `;

    await ctx.replyWithMarkdown(helpMessage);
  });

  // Команда /profile
  bot.command('profile', async (ctx) => {
    try {
      const user = await projectService.getUserByTelegramId(ctx.from?.id.toString() || '');
      
      if (!user) {
        await ctx.reply('Пользователь не найден. Используйте /start для регистрации.');
        return;
      }

      const profileMessage = `
👤 *Ваш профиль*

*Имя:* ${user.name}
*Роль:* ${user.role}
*Часовой пояс:* ${user.timezone}
*Дата регистрации:* ${new Date(user.created_at).toLocaleDateString('ru-RU')}

Для изменения профиля используйте команды:
/setrole <роль> - изменить роль
/settimezone <зона> - изменить часовой пояс
      `;

      await ctx.replyWithMarkdown(profileMessage);

    } catch (error) {
      logger.error('Ошибка в команде /profile:', error);
      await ctx.reply('Ошибка при получении профиля.');
    }
  });

  // Команда /team
  bot.command('team', async (ctx) => {
    try {
      const users = await projectService.getAllUsers();
      
      if (users.length === 0) {
        await ctx.reply('В команде пока никого нет.');
        return;
      }

      let teamMessage = '👥 *Состав команды*\n\n';
      
      users.forEach((user, index) => {
        const usernameDisplay = user.username ? `@${user.username}` : 'без username';
        teamMessage += `${index + 1}. *${user.name}* (${usernameDisplay}) - ${user.role}\n`;
      });

      teamMessage += `\n*Всего участников:* ${users.length}`;

      await ctx.replyWithMarkdown(teamMessage);

    } catch (error) {
      logger.error('Ошибка в команде /team:', error);
      await ctx.reply('Ошибка при получении списка команды.');
    }
  });

  // Обработка кнопок меню
  bot.hears('📊 Daily Standup', (ctx) => ctx.reply('Используйте /standup для запуска daily standup'));
  bot.hears('🚀 Проекты', (ctx) => ctx.reply('Используйте /projects для управления проектами'));
  bot.hears('👥 Команда', (ctx) => ctx.reply('Используйте /team для просмотра команды'));
  bot.hears('📈 Отчеты', (ctx) => ctx.reply('Используйте /report для получения отчетов'));
  bot.hears('🤖 AI Помощник', (ctx) => ctx.reply('Используйте /ai <вопрос> или отправьте голосовое сообщение'));
  bot.hears('⚙️ Настройки', (ctx) => ctx.reply('Используйте /profile для настройки профиля'));
} 