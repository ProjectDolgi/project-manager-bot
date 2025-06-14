import OpenAI from 'openai';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface AIAnalysis {
  summary: string;
  recommendations: string[];
  risks: string[];
  mood: 'positive' | 'neutral' | 'negative';
}

export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }

  async analyzeTeamStatus(dailyStatuses: any[]): Promise<AIAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(dailyStatuses);
      
      const completion = await this.openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Ты опытный проджект менеджер, который анализирует статусы команды разработчиков и дает рекомендации по улучшению процессов.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseAIResponse(response);
      
    } catch (error) {
      logger.error('Ошибка при анализе через AI:', error);
      return {
        summary: 'Не удалось проанализировать статусы команды',
        recommendations: ['Проверьте подключение к AI сервису'],
        risks: [],
        mood: 'neutral'
      };
    }
  }

  async processVoiceCommand(text: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: `Ты помощник проджект менеджера в Telegram боте. 
            Пользователь дает голосовые команды для управления проектами.
            Определи намерение пользователя и верни JSON с командой и параметрами.
            
            Возможные команды:
            - create_task: создать задачу
            - update_status: обновить статус
            - add_blocker: добавить блокер
            - get_report: получить отчет
            - schedule_meeting: запланировать встречу
            
            Пример ответа: {"command": "create_task", "params": {"title": "Исправить баг", "assignee": "Иван"}}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      return completion.choices[0]?.message?.content || '{"command": "unknown", "params": {}}';
      
    } catch (error) {
      logger.error('Ошибка при обработке голосовой команды:', error);
      return '{"command": "error", "params": {"message": "Не удалось обработать команду"}}';
    }
  }

  async generateSummary(data: any): Promise<string> {
    try {
      const prompt = `
        Создай краткий отчет по команде на основе следующих данных:
        ${JSON.stringify(data, null, 2)}
        
        Отчет должен включать:
        - Общий прогресс
        - Основные достижения
        - Проблемы и блокеры
        - Рекомендации
        
        Ответ должен быть на русском языке и в формате Markdown.
      `;

      const completion = await this.openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Ты создаешь краткие и информативные отчеты для проджект менеджеров.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 800
      });

      return completion.choices[0]?.message?.content || 'Не удалось сгенерировать отчет';
      
    } catch (error) {
      logger.error('Ошибка при генерации отчета:', error);
      return 'Ошибка при генерации отчета';
    }
  }

  private buildAnalysisPrompt(dailyStatuses: any[]): string {
    const statusText = dailyStatuses.map(status => 
      `${status.name} (${status.role}):
      - Вчера: ${status.yesterday}
      - Сегодня: ${status.today}
      - Блокеры: ${status.blockers}
      - Настроение: ${status.mood_score}/10`
    ).join('\n\n');

    return `
      Проанализируй статусы команды разработчиков:
      
      ${statusText}
      
      Дай анализ в формате JSON:
      {
        "summary": "краткое резюме состояния команды",
        "recommendations": ["рекомендация 1", "рекомендация 2"],
        "risks": ["риск 1", "риск 2"],
        "mood": "positive/neutral/negative"
      }
    `;
  }

  private parseAIResponse(response: string): AIAnalysis {
    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || 'Анализ недоступен',
        recommendations: parsed.recommendations || [],
        risks: parsed.risks || [],
        mood: parsed.mood || 'neutral'
      };
    } catch (error) {
      logger.error('Ошибка парсинга ответа AI:', error);
      return {
        summary: response,
        recommendations: [],
        risks: [],
        mood: 'neutral'
      };
    }
  }
} 