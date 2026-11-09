"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBasicCommands = setupBasicCommands;
const telegraf_1 = require("telegraf");
const logger_1 = require("../utils/logger");
const escapeMarkdown_1 = require("../utils/escapeMarkdown");
function setupBasicCommands(bot, services) {
    const { projectService, aiService, voiceService, subscriptionService } = services;
    // Команда /start
    bot.start(async (ctx) => {
        try {
            const user = ctx.from;
            if (!user)
                return;
            // Регистрируем пользователя
            const dbUser = await projectService.registerUser(user.id.toString(), user.first_name + (user.last_name ? ` ${user.last_name}` : ''), user.username, 'project_manager');
            // Создаём пробную подписку
            if (subscriptionService) {
                await subscriptionService.ensureTrialSubscription(dbUser.id);
            }
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
            await ctx.replyWithMarkdown(welcomeMessage, telegraf_1.Markup.keyboard([
                ['📊 Daily Standup', '🚀 Проекты'],
                ['🏃‍♂️ Спринты', '👥 Команда'],
                ['📈 Отчеты', '🤖 AI Помощник'],
                ['⚙️ Настройки']
            ]).resize());
        }
        catch (error) {
            logger_1.logger.error('Ошибка в команде /start:', error);
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
/subscribe - оформить подписку
/subscription - моя подписка
/status - текущий статус

*💳 Подписка:*
🎁 Пробный период 1 сутки при регистрации
💳 Месячная подписка — 390 ₽
⭐ Годовая подписка — 3500 ₽

*🚀 Проекты:*
/projects - список проектов
/project <название> - создать проект
/tasks - мои задачи

*🏃‍♂️ Спринты (Agile):*
/sprint <название> - создать новый спринт
/sprints - список всех спринтов
/currentsprint - текущий активный спринт
/sprintgoal - добавить цель и гипотезу
/sprinttasks - управление задачами спринта
/addtask <зона> <описание> - добавить задачу

*📝 Управление задачами:*
/mytasks - мои задачи в текущем спринте
/starttask <ID> - начать работу над задачей
/completetask <ID> - отметить задачу выполненной
/pausetask <ID> - поставить задачу на паузу

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
        }
        catch (error) {
            logger_1.logger.error('Ошибка в команде /profile:', error);
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
                const usernameDisplay = user.username ? `@${(0, escapeMarkdown_1.escapeMarkdown)(user.username)}` : 'без username';
                teamMessage += `${index + 1}. *${(0, escapeMarkdown_1.escapeMarkdown)(user.name)}* (${usernameDisplay}) - ${(0, escapeMarkdown_1.escapeMarkdown)(user.role)}\n`;
            });
            teamMessage += `\n*Всего участников:* ${users.length}`;
            await ctx.replyWithMarkdown(teamMessage);
        }
        catch (error) {
            logger_1.logger.error('Ошибка в команде /team:', error);
            await ctx.reply('Ошибка при получении списка команды.');
        }
    });
    // ВРЕМЕННАЯ команда для получения Chat ID
    bot.command('chatid', async (ctx) => {
        try {
            const chatId = ctx.chat.id;
            const chatType = ctx.chat.type;
            const chatTitle = 'title' in ctx.chat ? ctx.chat.title : 'Личный чат';
            const message = `
🆔 *Информация о чате*

*Chat ID:* \`${chatId}\`
*Тип чата:* ${chatType}
*Название:* ${chatTitle}

📋 *Скопируйте Chat ID и добавьте в .env файл:*
\`ADMIN_CHAT_ID=${chatId}\`
      `;
            await ctx.replyWithMarkdown(message);
        }
        catch (error) {
            logger_1.logger.error('Ошибка в команде /chatid:', error);
            await ctx.reply('Ошибка при получении Chat ID.');
        }
    });
    // Обработка кнопок меню - СРАЗУ ВЫПОЛНЯЕМ ДЕЙСТВИЯ
    // Daily Standup - сразу запускаем standup
    bot.hears('📊 Daily Standup', async (ctx) => {
        try {
            const users = await projectService.getAllUsers();
            if (users.length === 0) {
                await ctx.reply('В команде пока никого нет. Добавьте участников командой /start');
                return;
            }
            const userTags = users.map(user => {
                if (user.username) {
                    return `@${user.username}`;
                }
                return user.name;
            }).join(' ');
            const standupMessage = `
🌅 <b>Daily Standup</b>

${userTags}

Время для ежедневного стендапа! Пожалуйста, ответьте на вопросы:

1️⃣ <b>Что вы делали вчера?</b>
2️⃣ <b>Что планируете сегодня?</b>  
3️⃣ <b>Есть ли блокеры?</b>

Можете ответить текстом или голосовым сообщением 🎤

Для быстрого ответа используйте кнопки ⬇️
      `;
            await ctx.replyWithHTML(standupMessage, telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('📝 Ответить текстом', 'standup_text')],
                [telegraf_1.Markup.button.callback('🎤 Голосовой ответ', 'standup_voice')],
                [telegraf_1.Markup.button.callback('📊 Посмотреть статусы', 'standup_status')]
            ]));
        }
        catch (error) {
            logger_1.logger.error('Ошибка при запуске standup через кнопку:', error);
            await ctx.reply('Ошибка при запуске standup.');
        }
    });
    // Проекты - показываем список проектов
    bot.hears('🚀 Проекты', async (ctx) => {
        try {
            const projects = await projectService.getActiveProjects();
            if (projects.length === 0) {
                await ctx.reply('Активных проектов пока нет.\n\nИспользуйте /project <название> для создания нового проекта.');
                return;
            }
            let message = '🚀 *Активные проекты*\n\n';
            projects.forEach((project, index) => {
                message += `${index + 1}. *${project.name}*\n`;
                message += `   📝 ${project.description}\n`;
                message += `   📅 Создан: ${new Date(project.created_at).toLocaleDateString('ru-RU')}\n\n`;
            });
            await ctx.replyWithMarkdown(message);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при получении проектов через кнопку:', error);
            await ctx.reply('Ошибка при получении списка проектов.');
        }
    });
    // Спринты - показываем текущий спринт
    bot.hears('🏃‍♂️ Спринты', async (ctx) => {
        try {
            const sprint = await projectService.getCurrentSprint();
            if (!sprint) {
                await ctx.reply(`
🏃‍♂️ *Спринты*

Активных спринтов пока нет.

*Команды для работы со спринтами:*
• \`/sprint <название>\` - создать новый спринт
• \`/sprints\` - посмотреть все спринты

*Пример:*
\`/sprint Тестирование гипотезы о молодой аудитории\`
        `, { parse_mode: 'Markdown' });
                return;
            }
            const tasks = await projectService.getSprintTasks(sprint.id);
            let message = `🏃‍♂️ *Текущий спринт: ${sprint.name}*\n\n`;
            message += `📅 *Период:* ${new Date(sprint.start_date).toLocaleDateString('ru-RU')} - ${new Date(sprint.end_date).toLocaleDateString('ru-RU')}\n\n`;
            if (sprint.goal) {
                message += `🎯 *Цель:*\n${sprint.goal}\n\n`;
            }
            if (sprint.hypothesis) {
                message += `🔬 *Гипотеза:*\n${sprint.hypothesis}\n\n`;
            }
            if (sprint.target_audience) {
                message += `👥 *Целевая аудитория:*\n${sprint.target_audience}\n\n`;
            }
            // Показываем задачи по зонам ответственности
            if (tasks.length > 0) {
                message += '*📋 Задачи по зонам ответственности:*\n\n';
                const zones = ['маркетинг', 'психология', 'разработка', 'дизайн', 'продакшн'];
                zones.forEach(zone => {
                    const zoneTasks = tasks.filter((task) => task.zone === zone);
                    if (zoneTasks.length > 0) {
                        const zoneEmoji = getZoneEmoji(zone);
                        message += `${zoneEmoji} *${zone.charAt(0).toUpperCase() + zone.slice(1)}:*\n`;
                        zoneTasks.forEach((task) => {
                            const statusEmoji = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
                            message += `  ${statusEmoji} ${task.title}\n`;
                        });
                        message += '\n';
                    }
                });
            }
            message += '*Команды:*\n';
            message += '• `/sprintgoal` - изменить цель\n';
            message += '• `/sprinttasks` - управление задачами\n';
            message += '• `/addtask <зона> <описание>` - добавить задачу';
            await ctx.replyWithMarkdown(message);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при получении спринтов через кнопку:', error);
            await ctx.reply('Ошибка при получении информации о спринтах.');
        }
    });
    // Команда - показываем состав команды
    bot.hears('👥 Команда', async (ctx) => {
        try {
            const users = await projectService.getAllUsers();
            if (users.length === 0) {
                await ctx.reply('В команде пока никого нет.');
                return;
            }
            let teamMessage = '👥 *Состав команды*\n\n';
            users.forEach((user, index) => {
                const usernameDisplay = user.username ? `@${(0, escapeMarkdown_1.escapeMarkdown)(user.username)}` : 'без username';
                const roleEmoji = getRoleEmoji(user.role);
                teamMessage += `${index + 1}. *${(0, escapeMarkdown_1.escapeMarkdown)(user.name)}* (${usernameDisplay})\n   ${roleEmoji} ${(0, escapeMarkdown_1.escapeMarkdown)(user.role)}\n\n`;
            });
            teamMessage += `*Всего участников:* ${users.length}`;
            await ctx.replyWithMarkdown(teamMessage);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при получении команды:', error);
            await ctx.reply('Ошибка при получении списка команды.');
        }
    });
    // Отчеты - генерируем отчет
    bot.hears('📈 Отчеты', async (ctx) => {
        try {
            await ctx.reply('📋 Генерирую отчет с полным контекстом команды...');
            const summary = await projectService.getTeamSummary();
            const report = await aiService.generateSummary(summary, projectService);
            await ctx.replyWithMarkdown(report);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при генерации отчета:', error);
            await ctx.reply('❌ Ошибка при генерации отчета.');
        }
    });
    // AI Помощник - активируем режим ожидания вопроса
    bot.hears('🤖 AI Помощник', async (ctx) => {
        const userId = ctx.from?.id.toString();
        if (userId) {
            // Устанавливаем состояние ожидания AI вопроса
            const { setUserState } = require('../middleware');
            setUserState(userId, {
                waitingForAI: true
            });
        }
        await ctx.reply('🤖 *AI Помощник активирован*\n\nЗадайте ваш вопрос текстом или голосовым сообщением. Я знаю всё о нашем боте и команде!', {
            parse_mode: 'Markdown',
            reply_markup: {
                force_reply: true,
                input_field_placeholder: 'Задайте вопрос ИИ помощнику...'
            }
        });
    });
    // Настройки - показываем профиль
    bot.hears('⚙️ Настройки', async (ctx) => {
        try {
            const user = await projectService.getUserByTelegramId(ctx.from?.id.toString() || '');
            if (!user) {
                await ctx.reply('Пользователь не найден. Используйте /start для регистрации.');
                return;
            }
            const roleEmoji = getRoleEmoji(user.role);
            const profileMessage = `
⚙️ *Настройки профиля*

👤 *Имя:* ${user.name}
${roleEmoji} *Роль:* ${user.role}
🌍 *Часовой пояс:* ${user.timezone}
📅 *Дата регистрации:* ${new Date(user.created_at).toLocaleDateString('ru-RU')}

*Доступные команды:*
• Изменить роль: обратитесь к администратору
• Изменить часовой пояс: /settimezone <зона>
      `;
            await ctx.replyWithMarkdown(profileMessage);
        }
        catch (error) {
            logger_1.logger.error('Ошибка в настройках:', error);
            await ctx.reply('Ошибка при получении настроек.');
        }
    });
}
function getRoleEmoji(role) {
    const roleEmojis = {
        'admin': '👑',
        'project_manager': '📊',
        'frontend_developer': '🎨',
        'backend_developer': '⚙️',
        'designer': '🎭',
        'marketer': '📈',
        'producer': '🎬',
        'psychologist': '🧠'
    };
    return roleEmojis[role] || '👤';
}
function getZoneEmoji(zone) {
    const zoneEmojis = {
        'маркетинг': '📈',
        'психология': '🧠',
        'разработка': '⚙️',
        'дизайн': '🎨',
        'продакшн': '🎬'
    };
    return zoneEmojis[zone] || '👤';
}
//# sourceMappingURL=basic.commands.js.map