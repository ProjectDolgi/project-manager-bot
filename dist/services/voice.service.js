"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
class VoiceService {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: config_1.config.OPENAI_API_KEY,
        });
        // Создаем папку для загрузок если её нет
        this.downloadsDir = path_1.default.resolve(process.cwd(), 'downloads');
        if (!fs_1.default.existsSync(this.downloadsDir)) {
            fs_1.default.mkdirSync(this.downloadsDir, { recursive: true });
        }
    }
    async processVoiceMessage(ctx) {
        let filePath = null;
        try {
            // Получаем file_id голосового сообщения
            const fileId = ctx.message.voice.file_id;
            logger_1.logger.info(`Обрабатываем голосовое сообщение: ${fileId}`);
            // Получаем информацию о файле из Telegram API
            const file = await ctx.telegram.getFile(fileId);
            // Формируем URL для скачивания файла
            const fileUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;
            // Формируем путь для сохранения файла локально
            filePath = path_1.default.join(this.downloadsDir, `${fileId}.oga`);
            // Скачиваем файл
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Ошибка скачивания файла: ${response.statusText}`);
            }
            // Читаем данные в буфер и записываем в файл
            const buffer = await response.arrayBuffer();
            fs_1.default.writeFileSync(filePath, Buffer.from(buffer));
            logger_1.logger.info(`Файл успешно скачан: ${filePath}`);
            // Проверяем, что файл скачан
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error('Файл не был загружен корректно');
            }
            // Отправляем файл в OpenAI для расшифровки
            const transcription = await this.openai.audio.transcriptions.create({
                file: fs_1.default.createReadStream(filePath),
                model: 'whisper-1',
                language: 'ru',
            });
            const text = transcription.text;
            logger_1.logger.info(`Транскрипция текста: ${text}`);
            return { text };
        }
        catch (error) {
            logger_1.logger.error('Ошибка обработки голоса:', error);
            throw error;
        }
        finally {
            // Удаляем временный файл
            if (filePath && fs_1.default.existsSync(filePath)) {
                try {
                    fs_1.default.unlinkSync(filePath);
                    logger_1.logger.info(`Временный файл удалён: ${filePath}`);
                }
                catch (unlinkError) {
                    logger_1.logger.error('Ошибка удаления файла:', unlinkError);
                }
            }
        }
    }
    async processVoiceStandup(ctx) {
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
                model: config_1.config.OPENAI_MODEL,
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
        }
        catch (error) {
            logger_1.logger.error('Ошибка анализа голосового standup:', error);
            throw error;
        }
    }
}
exports.VoiceService = VoiceService;
//# sourceMappingURL=voice.service.js.map