import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { Services } from './index';
import { logger } from '../utils/logger';

export function setupProjectCommands(bot: Telegraf<BotContext>, services: Services) {
  const { projectService } = services;

  // Команда /projects - список проектов
  bot.command('projects', async (ctx: any) => {
    try {
      const projects = await projectService.getActiveProjects();
      
      if (projects.length === 0) {
        await ctx.reply('Активных проектов пока нет. Создайте новый проект командой /project <название>');
        return;
      }

      let message = '🚀 *Активные проекты*\n\n';
      
      projects.forEach((project, index) => {
        message += `${index + 1}. *${project.name}*\n`;
        if (project.description) {
          message += `   ${project.description}\n`;
        }
        message += `   Создан: ${new Date(project.created_at).toLocaleDateString('ru-RU')}\n\n`;
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
        await ctx.reply('Укажите название проекта: /project <название>');
        return;
      }

      const projectName = args.join(' ');
      
      // Проверяем, не существует ли уже такой проект
      const existingProjects = await projectService.getActiveProjects();
      const exists = existingProjects.some(p => p.name.toLowerCase() === projectName.toLowerCase());
      
      if (exists) {
        await ctx.reply(`Проект "${projectName}" уже существует.`);
        return;
      }

      const project = await projectService.createProject(projectName, '');
      
      await ctx.replyWithMarkdown(`✅ Проект *${project.name}* успешно создан!`);

    } catch (error) {
      logger.error('Ошибка в команде /project:', error);
      await ctx.reply('Ошибка при создании проекта.');
    }
  });
} 