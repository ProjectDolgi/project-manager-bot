import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { Services } from './index';
import { logger } from '../utils/logger';
import { getUserState } from '../middleware';

export function setupAICommands(bot: Telegraf<BotContext>, services: Services) {
  const { aiService, projectService, voiceService } = services;

  // Команда /ai - вопрос к ИИ
  bot.command('ai', async (ctx: any) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length === 0) {
        await ctx.reply(`
🤖 *Задайте вопрос ИИ помощнику*

Примеры вопросов:
• \`/ai что это за бот\`
• \`/ai как организовать daily standup\`
• \`/ai какие есть роли в команде\`
• \`/ai как добавить нового участника\`
• \`/ai дай совет по управлению проектом\`

💡 *Я знаю всё о нашем боте и команде!*
        `, { parse_mode: 'Markdown' });
        return;
      }

      const question = args.join(' ');
      await ctx.reply('🤖 Анализирую ваш вопрос с учетом контекста команды...');

      // Используем новый метод с полным контекстом
      const response = await aiService.processQuestionWithContext(question, projectService);
      
      await ctx.replyWithMarkdown(`🤖 ${response}`);

    } catch (error) {
      logger.error('Ошибка в команде /ai:', error);
      await ctx.reply('❌ Произошла ошибка при обработке запроса к ИИ.');
    }
  });

  // Команда /analyze - анализ команды
  bot.command('analyze', async (ctx: any) => {
    try {
      await ctx.reply('📊 Анализирую состояние команды с полным контекстом...');

      const statuses = await projectService.getTodayStatuses();
      
      if (statuses.length === 0) {
        await ctx.reply('Нет данных для анализа. Команда еще не отчиталась сегодня.');
        return;
      }

      const analysis = await aiService.analyzeTeamStatus(statuses, projectService);
      
      let message = '🔍 *Анализ команды*\n\n';
      message += `📝 *Резюме:* ${analysis.summary}\n\n`;
      
      if (analysis.recommendations.length > 0) {
        message += '*💡 Рекомендации:*\n';
        analysis.recommendations.forEach((rec, index) => {
          message += `${index + 1}. ${rec}\n`;
        });
        message += '\n';
      }
      
      if (analysis.risks.length > 0) {
        message += '*⚠️ Риски:*\n';
        analysis.risks.forEach((risk, index) => {
          message += `${index + 1}. ${risk}\n`;
        });
        message += '\n';
      }
      
      const moodEmoji = analysis.mood === 'positive' ? '😊' : 
                       analysis.mood === 'negative' ? '😞' : '😐';
      message += `${moodEmoji} *Общее настроение:* ${analysis.mood}`;

      await ctx.replyWithMarkdown(message);

    } catch (error) {
      logger.error('Ошибка в команде /analyze:', error);
      await ctx.reply('❌ Ошибка при анализе команды.');
    }
  });

  // Команда /summary - генерация отчета
  bot.command('summary', async (ctx: any) => {
    try {
      await ctx.reply('📋 Генерирую отчет с полным контекстом команды...');

      const summary = await projectService.getTeamSummary();
      const report = await aiService.generateSummary(summary, projectService);

      await ctx.replyWithMarkdown(report);

    } catch (error) {
      logger.error('Ошибка в команде /summary:', error);
      await ctx.reply('❌ Ошибка при генерации отчета.');
    }
  });

  // Обработка голосовых сообщений для AI
  bot.on('voice', async (ctx, next) => {
    try {
      const userId = ctx.from?.id.toString();
      if (!userId) return next();

      const userState = getUserState(userId);
      
      // Если пользователь НЕ в процессе standup, обрабатываем как AI запрос
      if (!userState?.waitingForStandup) {
        await ctx.reply('🎤 Получил голосовое сообщение! Расшифровываю и обрабатываю через ИИ...');
        
        const { text } = await voiceService.processVoiceMessage(ctx);
        
        // Обрабатываем расшифрованный текст через AI с контекстом
        const response = await aiService.processQuestionWithContext(text, projectService);
        
        await ctx.replyWithMarkdown(`
🎤➡️📝 *Расшифровка:* "${text}"

🤖 *Ответ ИИ:*
${response}
        `);
        
        return; // Не передаем дальше
      }
      
      return next(); // Передаем standup обработчику
      
    } catch (error) {
      logger.error('Ошибка при обработке голосового AI запроса:', error);
      await ctx.reply('❌ Произошла ошибка при обработке голосового сообщения. Попробуйте еще раз или используйте текстовый ввод.');
      return next();
    }
  });
} 