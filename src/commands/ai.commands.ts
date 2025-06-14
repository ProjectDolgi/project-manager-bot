import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { Services } from './index';
import { logger } from '../utils/logger';

export function setupAICommands(bot: Telegraf<BotContext>, services: Services) {
  const { aiService, projectService } = services;

  // Команда /ai - вопрос к ИИ
  bot.command('ai', async (ctx: any) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      
      if (args.length === 0) {
        await ctx.reply('Задайте вопрос: /ai <ваш вопрос>');
        return;
      }

      const question = args.join(' ');
      await ctx.reply('🤖 Обрабатываю ваш запрос...');

      const response = await aiService.processVoiceCommand(question);
      
      try {
        const parsed = JSON.parse(response);
        if (parsed.command === 'error') {
          await ctx.reply(`❌ ${parsed.params.message}`);
        } else {
          await ctx.reply(`🤖 Понял! Команда: ${parsed.command}\nПараметры: ${JSON.stringify(parsed.params, null, 2)}`);
        }
      } catch {
        await ctx.reply(`🤖 ${response}`);
      }

    } catch (error) {
      logger.error('Ошибка в команде /ai:', error);
      await ctx.reply('Ошибка при обработке запроса к ИИ.');
    }
  });

  // Команда /analyze - анализ команды
  bot.command('analyze', async (ctx: any) => {
    try {
      await ctx.reply('📊 Анализирую состояние команды...');

      const statuses = await projectService.getTodayStatuses();
      
      if (statuses.length === 0) {
        await ctx.reply('Нет данных для анализа. Команда еще не отчиталась сегодня.');
        return;
      }

      const analysis = await aiService.analyzeTeamStatus(statuses);
      
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
      await ctx.reply('Ошибка при анализе команды.');
    }
  });

  // Команда /summary - генерация отчета
  bot.command('summary', async (ctx: any) => {
    try {
      await ctx.reply('📋 Генерирую отчет...');

      const summary = await projectService.getTeamSummary();
      const report = await aiService.generateSummary(summary);

      await ctx.replyWithMarkdown(report);

    } catch (error) {
      logger.error('Ошибка в команде /summary:', error);
      await ctx.reply('Ошибка при генерации отчета.');
    }
  });

  // Обработка голосовых сообщений
  bot.on('voice', async (ctx: any) => {
    try {
      await ctx.reply('🎤 Получил голосовое сообщение! Обрабатываю...');
      
      // В реальной реализации здесь будет:
      // 1. Скачивание голосового файла
      // 2. Конвертация в текст через Speech-to-Text API
      // 3. Обработка через ИИ
      
      // Пока заглушка
      await ctx.reply('🤖 Функция обработки голосовых сообщений будет добавлена в следующей версии!');

    } catch (error) {
      logger.error('Ошибка при обработке голосового сообщения:', error);
      await ctx.reply('Ошибка при обработке голосового сообщения.');
    }
  });
} 