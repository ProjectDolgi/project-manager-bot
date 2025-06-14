import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../index';
import { Services } from './index';
import { logger } from '../utils/logger';

export function setupProjectCommands(bot: Telegraf<BotContext>, services: Services) {
  const { projectService } = services;

  // Команда /projects - список проектов
  bot.command('projects', async (ctx) => {
    try {
      const projects = await projectService.getActiveProjects();
      
      if (projects.length === 0) {
        await ctx.reply('Активных проектов пока нет.\n\nИспользуйте /project <название> для создания нового проекта.');
        return;
      }

      let message = '🚀 *Активные проекты*\n\n';
      projects.forEach((project: any, index: number) => {
        message += `${index + 1}. *${project.name}*\n`;
        message += `   📝 ${project.description}\n`;
        message += `   📅 Создан: ${new Date(project.created_at).toLocaleDateString('ru-RU')}\n\n`;
      });

      await ctx.replyWithMarkdown(message);

    } catch (error) {
      logger.error('Ошибка в команде /projects:', error);
      await ctx.reply('Ошибка при получении списка проектов.');
    }
  });

  // Команда /project - создание проекта
  bot.command('project', async (ctx: any) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length === 0) {
        await ctx.reply('Укажите название проекта.\n\nПример: `/project Новое приложение`', { parse_mode: 'Markdown' });
        return;
      }

      const projectName = args.join(' ');
      const project = await projectService.createProject(projectName, 'Описание будет добавлено позже');

      await ctx.replyWithMarkdown(`✅ *Проект создан!*\n\n📁 *Название:* ${project.name}\n📅 *Дата создания:* ${new Date(project.created_at).toLocaleDateString('ru-RU')}`);

    } catch (error) {
      logger.error('Ошибка в команде /project:', error);
      await ctx.reply('Ошибка при создании проекта.');
    }
  });

  // НОВЫЕ КОМАНДЫ ДЛЯ СПРИНТОВ

  // Команда /sprint - создание нового спринта
  bot.command('sprint', async (ctx: any) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length === 0) {
        await ctx.reply(`
🏃‍♂️ *Создание нового спринта*

Использование: \`/sprint <название>\`

Пример: \`/sprint Тестирование гипотезы о молодой аудитории\`

После создания спринта вы сможете:
• Добавить цель и гипотезу
• Назначить задачи по зонам ответственности
• Отслеживать прогресс
        `, { parse_mode: 'Markdown' });
        return;
      }

      const sprintName = args.join(' ');
      const sprint = await projectService.createSprint(sprintName);

      await ctx.replyWithMarkdown(`
✅ *Спринт создан!*

🏃‍♂️ *Название:* ${sprint.name}
📅 *Период:* ${new Date(sprint.start_date).toLocaleDateString('ru-RU')} - ${new Date(sprint.end_date).toLocaleDateString('ru-RU')}

*Следующие шаги:*
• \`/sprintgoal\` - добавить цель и гипотезу
• \`/sprinttasks\` - добавить задачи по зонам
• \`/sprints\` - посмотреть все спринты
      `);

    } catch (error) {
      logger.error('Ошибка в команде /sprint:', error);
      await ctx.reply('Ошибка при создании спринта.');
    }
  });

  // Команда /sprints - список всех спринтов
  bot.command('sprints', async (ctx) => {
    try {
      const sprints = await projectService.getAllSprints();
      
      if (sprints.length === 0) {
        await ctx.reply('Спринтов пока нет.\n\nИспользуйте /sprint <название> для создания нового спринта.');
        return;
      }

      let message = '🏃‍♂️ *Все спринты*\n\n';
      
      sprints.forEach((sprint: any, index: number) => {
        const status = sprint.status === 'active' ? '🟢 Активный' : 
                     sprint.status === 'completed' ? '✅ Завершен' : '⏸ Планируется';
        
        message += `${index + 1}. *${sprint.name}* ${status}\n`;
        message += `   📅 ${new Date(sprint.start_date).toLocaleDateString('ru-RU')} - ${new Date(sprint.end_date).toLocaleDateString('ru-RU')}\n`;
        
        if (sprint.goal) {
          message += `   🎯 ${sprint.goal.substring(0, 50)}${sprint.goal.length > 50 ? '...' : ''}\n`;
        }
        
        message += '\n';
      });

      message += '*Команды:*\n';
      message += '• `/sprint <название>` - создать новый спринт\n';
      message += '• `/currentsprint` - текущий активный спринт\n';
      message += '• `/sprintgoal` - добавить цель к спринту';

      await ctx.replyWithMarkdown(message);

    } catch (error) {
      logger.error('Ошибка в команде /sprints:', error);
      await ctx.reply('Ошибка при получении списка спринтов.');
    }
  });

  // Команда /currentsprint - текущий активный спринт
  bot.command('currentsprint', async (ctx) => {
    try {
      const sprint = await projectService.getCurrentSprint();
      
      if (!sprint) {
        await ctx.reply('Нет активного спринта.\n\nИспользуйте /sprint <название> для создания нового спринта.');
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
          const zoneTasks = tasks.filter((task: any) => task.zone === zone);
          if (zoneTasks.length > 0) {
            const zoneEmoji = getZoneEmoji(zone);
            message += `${zoneEmoji} *${zone.charAt(0).toUpperCase() + zone.slice(1)}:*\n`;
            zoneTasks.forEach((task: any) => {
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
      message += '• `/sprintprogress` - прогресс спринта';

      await ctx.replyWithMarkdown(message);

    } catch (error) {
      logger.error('Ошибка в команде /currentsprint:', error);
      await ctx.reply('Ошибка при получении текущего спринта.');
    }
  });

  // Команда /sprintgoal - добавление цели и гипотезы к спринту
  bot.command('sprintgoal', async (ctx: any) => {
    try {
      const sprint = await projectService.getCurrentSprint();
      
      if (!sprint) {
        await ctx.reply('Нет активного спринта. Создайте спринт командой /sprint <название>');
        return;
      }

      await ctx.reply(`
🎯 *Настройка цели спринта: ${sprint.name}*

Отправьте цель и гипотезу в следующем формате:

\`\`\`
ЦЕЛЬ: Описание цели спринта

ГИПОТЕЗА: Наша гипотеза о пользователях

АУДИТОРИЯ: Описание целевого сегмента
\`\`\`

*Пример:*
\`\`\`
ЦЕЛЬ: Протестировать новую систему онбординга для повышения конверсии

ГИПОТЕЗА: Молодые пользователи 18-25 лет предпочитают интерактивный онбординг с геймификацией

АУДИТОРИЯ: Студенты и молодые специалисты, активные пользователи соцсетей
\`\`\`
      `, { 
        parse_mode: 'Markdown',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'ЦЕЛЬ: ... ГИПОТЕЗА: ... АУДИТОРИЯ: ...'
        }
      });

      // Устанавливаем состояние ожидания цели спринта
      const { setUserState } = require('../middleware');
      const userId = ctx.from?.id.toString();
      if (userId) {
        setUserState(userId, {
          waitingForSprintGoal: true,
          sprintId: sprint.id
        });
      }

    } catch (error) {
      logger.error('Ошибка в команде /sprintgoal:', error);
      await ctx.reply('Ошибка при настройке цели спринта.');
    }
  });

  // Команда /sprinttasks - управление задачами спринта
  bot.command('sprinttasks', async (ctx) => {
    try {
      const sprint = await projectService.getCurrentSprint();
      
      if (!sprint) {
        await ctx.reply('Нет активного спринта. Создайте спринт командой /sprint <название>');
        return;
      }

      await ctx.replyWithMarkdown(`
📋 *Управление задачами спринта: ${sprint.name}*

*Зоны ответственности:*
🎯 Маркетинг - привлечение и удержание пользователей
🧠 Психология - исследование поведения пользователей  
⚙️ Разработка - техническая реализация
🎨 Дизайн - пользовательский интерфейс
🎬 Продакшн - создание видеоконтента

*Команды для добавления задач:*
• \`/addtask маркетинг <описание>\`
• \`/addtask психология <описание>\`
• \`/addtask разработка <описание>\`
• \`/addtask дизайн <описание>\`
• \`/addtask продакшн <описание>\`

*Пример:*
\`/addtask маркетинг Создать рекламную кампанию для тестирования гипотезы\`
      `, 
        Markup.inlineKeyboard([
          [Markup.button.callback('📊 Посмотреть задачи', 'view_sprint_tasks')],
          [Markup.button.callback('📈 Прогресс спринта', 'sprint_progress')]
        ])
      );

    } catch (error) {
      logger.error('Ошибка в команде /sprinttasks:', error);
      await ctx.reply('Ошибка при управлении задачами спринта.');
    }
  });

  // Команда /addtask - добавление задачи к спринту
  bot.command('addtask', async (ctx: any) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length < 2) {
        await ctx.reply(`
📝 *Добавление задачи к спринту*

Использование: \`/addtask <зона> <описание>\`

*Доступные зоны:*
• маркетинг
• психология  
• разработка
• дизайн
• продакшн

*Пример:*
\`/addtask маркетинг Создать A/B тест для лендинга\`
        `, { parse_mode: 'Markdown' });
        return;
      }

      const zone = args[0].toLowerCase();
      const taskTitle = args.slice(1).join(' ');
      
      const validZones = ['маркетинг', 'психология', 'разработка', 'дизайн', 'продакшн'];
      if (!validZones.includes(zone)) {
        await ctx.reply(`❌ Неверная зона ответственности. Доступные зоны: ${validZones.join(', ')}`);
        return;
      }

      const sprint = await projectService.getCurrentSprint();
      if (!sprint) {
        await ctx.reply('Нет активного спринта. Создайте спринт командой /sprint <название>');
        return;
      }

      const task = await projectService.addSprintTask(sprint.id, taskTitle, zone);
      const zoneEmoji = getZoneEmoji(zone);

      await ctx.replyWithMarkdown(`
✅ *Задача добавлена к спринту!*

${zoneEmoji} *Зона:* ${zone}
📝 *Задача:* ${task.title}
📅 *Спринт:* ${sprint.name}

Используйте /currentsprint чтобы посмотреть все задачи спринта.
      `);

    } catch (error) {
      logger.error('Ошибка в команде /addtask:', error);
      await ctx.reply('Ошибка при добавлении задачи.');
    }
  });

  // Команда /mytasks - мои задачи в текущем спринте
  bot.command('mytasks', async (ctx) => {
    try {
      const sprint = await projectService.getCurrentSprint();
      if (!sprint) {
        await ctx.reply('Нет активного спринта.');
        return;
      }

      const tasks = await projectService.getSprintTasks(sprint.id);
      
      if (tasks.length === 0) {
        await ctx.reply('В текущем спринте нет задач.');
        return;
      }

      let message = `📋 *Мои задачи в спринте: ${sprint.name}*\n\n`;
      
      const zones = ['маркетинг', 'психология', 'разработка', 'дизайн', 'продакшн'];
      let hasAnyTasks = false;
      
      zones.forEach(zone => {
        const zoneTasks = tasks.filter((task: any) => task.zone === zone);
        if (zoneTasks.length > 0) {
          hasAnyTasks = true;
          const zoneEmoji = getZoneEmoji(zone);
          message += `${zoneEmoji} *${zone.charAt(0).toUpperCase() + zone.slice(1)}:*\n`;
          zoneTasks.forEach((task: any) => {
            const statusEmoji = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
            message += `  ${statusEmoji} ${task.title} (ID: ${task.id})\n`;
          });
          message += '\n';
        }
      });

      if (!hasAnyTasks) {
        message += 'У вас нет задач в текущем спринте.\n\n';
      }

      message += '*Команды для управления задачами:*\n';
      message += '• `/starttask <ID>` - начать работу над задачей\n';
      message += '• `/completetask <ID>` - отметить задачу выполненной\n';
      message += '• `/pausetask <ID>` - поставить задачу на паузу';

      await ctx.replyWithMarkdown(message);

    } catch (error) {
      logger.error('Ошибка в команде /mytasks:', error);
      await ctx.reply('Ошибка при получении задач.');
    }
  });

  // Команда /completetask - отметить задачу выполненной
  bot.command('completetask', async (ctx: any) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length === 0) {
        await ctx.reply(`
✅ *Отметить задачу выполненной*

Использование: \`/completetask <ID задачи>\`

Чтобы узнать ID задачи, используйте \`/mytasks\`

*Пример:*
\`/completetask 15\`
        `, { parse_mode: 'Markdown' });
        return;
      }

      const taskId = parseInt(args[0]);
      if (isNaN(taskId)) {
        await ctx.reply('❌ Неверный ID задачи. Используйте число.');
        return;
      }

      const updatedTask = await projectService.updateTaskStatus(taskId, 'completed');
      
      if (!updatedTask) {
        await ctx.reply('❌ Задача не найдена.');
        return;
      }

      const zoneEmoji = getZoneEmoji(updatedTask.zone);
      await ctx.replyWithMarkdown(`
✅ *Задача отмечена как выполненная!*

${zoneEmoji} *Зона:* ${updatedTask.zone}
📝 *Задача:* ${updatedTask.title}
🎉 *Статус:* Выполнена

Отличная работа! 🎉
      `);

    } catch (error) {
      logger.error('Ошибка в команде /completetask:', error);
      await ctx.reply('Ошибка при обновлении статуса задачи.');
    }
  });

  // Команда /starttask - начать работу над задачей
  bot.command('starttask', async (ctx: any) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length === 0) {
        await ctx.reply(`
🔄 *Начать работу над задачей*

Использование: \`/starttask <ID задачи>\`

Чтобы узнать ID задачи, используйте \`/mytasks\`

*Пример:*
\`/starttask 15\`
        `, { parse_mode: 'Markdown' });
        return;
      }

      const taskId = parseInt(args[0]);
      if (isNaN(taskId)) {
        await ctx.reply('❌ Неверный ID задачи. Используйте число.');
        return;
      }

      const updatedTask = await projectService.updateTaskStatus(taskId, 'in_progress');
      
      if (!updatedTask) {
        await ctx.reply('❌ Задача не найдена.');
        return;
      }

      const zoneEmoji = getZoneEmoji(updatedTask.zone);
      await ctx.replyWithMarkdown(`
🔄 *Задача взята в работу!*

${zoneEmoji} *Зона:* ${updatedTask.zone}
📝 *Задача:* ${updatedTask.title}
⚡ *Статус:* В работе

Удачи в выполнении! 💪
      `);

    } catch (error) {
      logger.error('Ошибка в команде /starttask:', error);
      await ctx.reply('Ошибка при обновлении статуса задачи.');
    }
  });

  // Команда /pausetask - поставить задачу на паузу
  bot.command('pausetask', async (ctx: any) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length === 0) {
        await ctx.reply(`
⏸ *Поставить задачу на паузу*

Использование: \`/pausetask <ID задачи>\`

Чтобы узнать ID задачи, используйте \`/mytasks\`

*Пример:*
\`/pausetask 15\`
        `, { parse_mode: 'Markdown' });
        return;
      }

      const taskId = parseInt(args[0]);
      if (isNaN(taskId)) {
        await ctx.reply('❌ Неверный ID задачи. Используйте число.');
        return;
      }

      const updatedTask = await projectService.updateTaskStatus(taskId, 'pending');
      
      if (!updatedTask) {
        await ctx.reply('❌ Задача не найдена.');
        return;
      }

      const zoneEmoji = getZoneEmoji(updatedTask.zone);
      await ctx.replyWithMarkdown(`
⏸ *Задача поставлена на паузу*

${zoneEmoji} *Зона:* ${updatedTask.zone}
📝 *Задача:* ${updatedTask.title}
⏳ *Статус:* Ожидает

Можете вернуться к ней позже с помощью \`/starttask ${taskId}\`
      `);

    } catch (error) {
      logger.error('Ошибка в команде /pausetask:', error);
      await ctx.reply('Ошибка при обновлении статуса задачи.');
    }
  });

  // ОБРАБОТЧИКИ CALLBACK КНОПОК

  // Просмотр задач спринта
  bot.action('view_sprint_tasks', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
      const sprint = await projectService.getCurrentSprint();
      if (!sprint) {
        await ctx.reply('Нет активного спринта.');
        return;
      }

      const tasks = await projectService.getSprintTasks(sprint.id);
      
      if (tasks.length === 0) {
        await ctx.editMessageText(`
📋 *Задачи спринта: ${sprint.name}*

Задач пока нет. Добавьте задачи командой:
\`/addtask <зона> <описание>\`
        `, { parse_mode: 'Markdown' });
        return;
      }

      let message = `📋 *Задачи спринта: ${sprint.name}*\n\n`;
      
      const zones = ['маркетинг', 'психология', 'разработка', 'дизайн', 'продакшн'];
      zones.forEach(zone => {
        const zoneTasks = tasks.filter((task: any) => task.zone === zone);
        if (zoneTasks.length > 0) {
          const zoneEmoji = getZoneEmoji(zone);
          message += `${zoneEmoji} *${zone.charAt(0).toUpperCase() + zone.slice(1)}:*\n`;
          zoneTasks.forEach((task: any) => {
            const statusEmoji = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
            message += `  ${statusEmoji} ${task.title}\n`;
          });
          message += '\n';
        }
      });

      await ctx.editMessageText(message, { parse_mode: 'Markdown' });

    } catch (error) {
      logger.error('Ошибка при просмотре задач спринта:', error);
      await ctx.reply('Ошибка при получении задач спринта.');
    }
  });

  // Прогресс спринта
  bot.action('sprint_progress', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
      const sprint = await projectService.getCurrentSprint();
      if (!sprint) {
        await ctx.reply('Нет активного спринта.');
        return;
      }

      const progress = await projectService.getSprintProgress(sprint.id);
      
      let message = `📈 *Прогресс спринта: ${sprint.name}*\n\n`;
      message += `📊 *Общий прогресс:* ${progress.progress}%\n\n`;
      message += `📝 *Всего задач:* ${progress.totalTasks}\n`;
      message += `✅ *Выполнено:* ${progress.completedTasks}\n`;
      message += `🔄 *В работе:* ${progress.inProgressTasks}\n`;
      message += `⏳ *Ожидает:* ${progress.pendingTasks}\n\n`;
      
      // Прогресс-бар
      const progressBar = '█'.repeat(Math.floor(progress.progress / 10)) + '░'.repeat(10 - Math.floor(progress.progress / 10));
      message += `${progressBar} ${progress.progress}%`;

      await ctx.editMessageText(message, { parse_mode: 'Markdown' });

    } catch (error) {
      logger.error('Ошибка при получении прогресса спринта:', error);
      await ctx.reply('Ошибка при получении прогресса спринта.');
    }
  });
}

// Вспомогательная функция для эмодзи зон
function getZoneEmoji(zone: string): string {
  const zoneEmojis: { [key: string]: string } = {
    'маркетинг': '🎯',
    'психология': '🧠',
    'разработка': '⚙️',
    'дизайн': '🎨',
    'продакшн': '🎬'
  };
  
  return zoneEmojis[zone] || '📝';
} 