import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class VoiceService {
  private openai: OpenAI;
  private downloadsDir: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
    
    // Создаем папку для загрузок если её нет
    this.downloadsDir = path.resolve(process.cwd(), 'downloads');
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
    }
  }

  async processVoiceMessage(ctx: any): Promise<{ text: string; analysis?: any }> {
    let filePath: string | null = null;
    
    try {
      // Получаем file_id голосового сообщения
      const fileId = ctx.message.voice.file_id;
      logger.info(`Обрабатываем голосовое сообщение: ${fileId}`);

      // Получаем информацию о файле из Telegram API
      const file = await ctx.telegram.getFile(fileId);

      // Формируем URL для скачивания файла
      const fileUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;

      // Формируем путь для сохранения файла локально
      filePath = path.join(this.downloadsDir, `${fileId}.oga`);

      // Скачиваем файл
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Ошибка скачивания файла: ${response.statusText}`);
      }

      // Читаем данные в буфер и записываем в файл
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
      logger.info(`Файл успешно скачан: ${filePath}`);

      // Проверяем, что файл скачан
      if (!fs.existsSync(filePath)) {
        throw new Error('Файл не был загружен корректно');
      }

      // Отправляем файл в OpenAI для расшифровки
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
        language: 'ru',
      });

      const text = transcription.text;
      logger.info(`Транскрипция текста: ${text}`);

      return { text };

    } catch (error) {
      logger.error('Ошибка обработки голоса:', error);
      throw error;
    } finally {
      // Удаляем временный файл
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          logger.info(`Временный файл удалён: ${filePath}`);
        } catch (unlinkError) {
          logger.error('Ошибка удаления файла:', unlinkError);
        }
      }
    }
  }

  async processVoiceStandup(ctx: any): Promise<{ yesterday: string; today: string; blockers: string; mood: number }> {
    try {
      const { text } = await this.processVoiceMessage(ctx);

      // Анализируем текст через ИИ для извлечения компонентов standup
      const systemPrompt = `
Ты помощник проджект менеджера. Пользователь прислал голосовое сообщение с daily standup отчетом.
Извлеки из текста следующую информацию и верни в формате JSON:

{
  "yesterday": "что делал вчера",
  "today": "что планирует сегодня", 
  "blockers": "блокеры или проблемы (если нет - пустая строка)",
  "mood": число от 1 до 10 (оцени настроение по тону сообщения, по умолчанию 7)
}

Если какая-то информация не указана, используй разумные значения по умолчанию.
      `;

      const completion = await this.openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        yesterday: analysis.yesterday || 'Работал над задачами',
        today: analysis.today || 'Продолжу работу над проектом',
        blockers: analysis.blockers || '',
        mood: Math.max(1, Math.min(10, analysis.mood || 7))
      };

    } catch (error) {
      logger.error('Ошибка анализа голосового standup:', error);
      throw error;
    }
  }
} 