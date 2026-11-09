import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { Services } from './index';
import { logger } from '../utils/logger';
import { escapeMarkdown } from '../utils/escapeMarkdown';

export function setupAdminCommands(bot: Telegraf<BotContext>, services: Services) {
  const { projectService } = services;

  // Команда /setrole - изменение роли пользователя
  bot.command('setrole', async (ctx: any) => {
    try {
      // Проверяем права администратора
      const currentUser = await projectService.getUserByTelegramId(ctx.from?.id.toString() || '');
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'project_manager')) {
        await ctx.reply('❌ У вас нет прав для изменения ролей. Только администраторы и проджект менеджеры могут использовать эту команду.');
        return;
      }

      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length !== 2) {
        await ctx.reply(`
📝 *Использование команды /setrole*

Формат: \`/setrole @username роль\`

*Доступные роли:*
• \`admin\` - администратор
• \`project_manager\` - проджект менеджер
• \`frontend_developer\` - фронтенд-разработчик
• \`backend_developer\` - бэкэнд-разработчик
• \`designer\` - дизайнер
• \`marketer\` - маркетолог
• \`producer\` - продюсер
• \`psychologist\` - психолог

*Примеры:* 
\`/setrole @dmitriishamanaev frontend_developer\`
\`/setrole DmitriiShamanaev designer\`

💡 *Совет:* Используйте username (никнейм) из Telegram, а не отображаемое имя.
Посмотреть всех участников: /team
        `, { parse_mode: 'Markdown' });
        return;
      }

      let username = args[0];
      const newRole = args[1];

      // Убираем @ если есть
      if (username.startsWith('@')) {
        username = username.substring(1);
      }

      // Получаем всех пользователей для поиска по имени
      const allUsers = await projectService.getAllUsers();
      const targetUser = allUsers.find(user => {
        const userName = user.name.toLowerCase();
        const userUsername = user.username?.toLowerCase() || '';
        const searchName = username.toLowerCase();
        
        return (
          // Поиск по username (основной способ)
          userUsername === searchName ||
          // Точное совпадение имени
          userName === searchName ||
          // Имя без пробелов
          userName.replace(/\s+/g, '') === searchName ||
          // Поиск по части имени
          userName.includes(searchName) ||
          // Поиск с заменой пробелов на подчеркивания
          userName.replace(/\s+/g, '_') === searchName ||
          // Поиск по telegram_id если передан ID
          user.telegram_id === username
        );
      });

      if (!targetUser) {
        await ctx.reply(`❌ Пользователь "${username}" не найден в команде.\n\nИспользуйте /team для просмотра всех участников.`);
        return;
      }

      // Проверяем, что не пытаемся изменить роль самому себе на более низкую
      if (targetUser.telegram_id === ctx.from?.id.toString() && newRole !== 'admin' && currentUser.role === 'admin') {
        await ctx.reply('⚠️ Вы не можете понизить свою собственную роль администратора.');
        return;
      }

      const updatedUser = await projectService.updateUserRole(targetUser.telegram_id, newRole);

      if (updatedUser) {
        const roleEmoji = getRoleEmoji(newRole);
        await ctx.replyWithMarkdown(`
✅ *Роль успешно изменена!*

👤 *Пользователь:* ${escapeMarkdown(updatedUser.name)}
${roleEmoji} *Новая роль:* \`${escapeMarkdown(newRole)}\`

Изменения вступили в силу немедленно.
        `);

        // Уведомляем пользователя о смене роли (если это не тот же человек)
        if (targetUser.telegram_id !== ctx.from?.id.toString()) {
          try {
            await bot.telegram.sendMessage(
              targetUser.telegram_id,
              `🔄 *Ваша роль в команде изменена*\n\n${roleEmoji} *Новая роль:* \`${escapeMarkdown(newRole)}\`\n\nИзменил: ${escapeMarkdown(currentUser.name)}`,
              { parse_mode: 'Markdown' }
            );
          } catch (error) {
            logger.warn('Не удалось отправить уведомление пользователю о смене роли:', error);
          }
        }
      } else {
        await ctx.reply('❌ Ошибка при изменении роли. Попробуйте позже.');
      }

    } catch (error) {
      logger.error('Ошибка в команде /setrole:', error);
      
      if (error instanceof Error && error.message.includes('Недопустимая роль')) {
        await ctx.reply(`❌ ${error.message}`);
      } else {
        await ctx.reply('❌ Произошла ошибка при изменении роли.');
      }
    }
  });

  // Команда /promote - быстрое повышение до админа
  bot.command('promote', async (ctx: any) => {
    try {
      const currentUser = await projectService.getUserByTelegramId(ctx.from?.id.toString() || '');
      
      if (!currentUser || currentUser.role !== 'admin') {
        await ctx.reply('❌ Только администраторы могут использовать команду /promote.');
        return;
      }

      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length !== 1) {
        await ctx.reply('📝 Использование: `/promote @username`\n\nПовышает пользователя до роли администратора.', { parse_mode: 'Markdown' });
        return;
      }

      let username = args[0];
      if (username.startsWith('@')) {
        username = username.substring(1);
      }

      const allUsers = await projectService.getAllUsers();
      const targetUser = allUsers.find(user => {
        const userName = user.name.toLowerCase();
        const userUsername = user.username?.toLowerCase() || '';
        const searchName = username.toLowerCase();
        
        return (
          // Поиск по username (основной способ)
          userUsername === searchName ||
          // Поиск по имени
          userName.replace(/\s+/g, '_') === searchName ||
          userName.includes(searchName)
        );
      });

      if (!targetUser) {
        await ctx.reply(`❌ Пользователь "${username}" не найден.`);
        return;
      }

      if (targetUser.role === 'admin') {
        await ctx.reply(`ℹ️ Пользователь ${targetUser.name} уже является администратором.`);
        return;
      }

      const updatedUser = await projectService.updateUserRole(targetUser.telegram_id, 'admin');

      if (updatedUser) {
        await ctx.replyWithMarkdown(`
🎉 *Пользователь повышен до администратора!*

👤 *Пользователь:* ${escapeMarkdown(updatedUser.name)}
👑 *Новая роль:* \`admin\`

Теперь ${escapeMarkdown(updatedUser.name)} может управлять ролями других пользователей.
        `);

        // Уведомляем пользователя
        try {
          await bot.telegram.sendMessage(
            targetUser.telegram_id,
            `🎉 *Поздравляем!*\n\nВы повышены до роли администратора!\n👑 Теперь вы можете управлять командой.\n\nПовысил: ${escapeMarkdown(currentUser.name)}`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          logger.warn('Не удалось отправить уведомление о повышении:', error);
        }
      }

    } catch (error) {
      logger.error('Ошибка в команде /promote:', error);
      await ctx.reply('❌ Произошла ошибка при повышении пользователя.');
    }
  });

  // Команда /roles - просмотр ролей всех пользователей
  bot.command('roles', async (ctx: any) => {
    try {
      const currentUser = await projectService.getUserByTelegramId(ctx.from?.id.toString() || '');
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'project_manager')) {
        await ctx.reply('❌ У вас нет прав для просмотра ролей.');
        return;
      }

      const users = await projectService.getAllUsers();
      
      if (users.length === 0) {
        await ctx.reply('В команде пока никого нет.');
        return;
      }

      let message = '👥 *Роли участников команды*\n\n';
      
      // Группируем по ролям
      const roleGroups: { [key: string]: typeof users } = {};
      users.forEach(user => {
        if (!roleGroups[user.role]) {
          roleGroups[user.role] = [];
        }
        roleGroups[user.role].push(user);
      });

      // Порядок отображения ролей
      const roleOrder = [
        'admin', 
        'project_manager', 
        'frontend_developer', 
        'backend_developer', 
        'designer', 
        'marketer', 
        'producer', 
        'psychologist'
      ];
      
      roleOrder.forEach(role => {
        if (roleGroups[role] && roleGroups[role].length > 0) {
          const roleEmoji = getRoleEmoji(role);
          message += `${roleEmoji} *${escapeMarkdown(role)}* (${roleGroups[role].length}):\n`;
          
          roleGroups[role].forEach(user => {
            const usernameDisplay = user.username ? `@${escapeMarkdown(user.username)}` : 'без username';
            message += `  • ${escapeMarkdown(user.name)} (${usernameDisplay})\n`;
          });
          message += '\n';
        }
      });

      message += `*Всего участников:* ${users.length}`;

      await ctx.replyWithMarkdown(message);

    } catch (error) {
      logger.error('Ошибка в команде /roles:', error);
      await ctx.reply('❌ Ошибка при получении списка ролей.');
    }
  });
}

function getRoleEmoji(role: string): string {
  const roleEmojis: { [key: string]: string } = {
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
