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

  // Создание системного контекста бота
  private async createBotContext(projectService?: any): Promise<string> {
    let context = `
🤖 **Ты - Project Manager AI Bot**

**Твоя роль:** Ты умный помощник проджект менеджера в Telegram боте для управления командой разработчиков.

**Основные функции бота:**
• 📊 Daily Standup автоматизация
• 🎯 Управление задачами и проектами  
• 🤖 ИИ анализ и рекомендации
• 📈 Отчеты и аналитика
• 🗣 Голосовые команды
• 👑 Управление ролями команды

**Доступные роли в команде:**
• admin 👑 - администратор (полные права)
• project_manager 📊 - проджект менеджер (управление командой)
• frontend_developer 🎨 - фронтенд-разработчик
• backend_developer ⚙️ - бэкэнд-разработчик
• designer 🎭 - дизайнер
• marketer 📈 - маркетолог
• producer 🎬 - продюсер
• psychologist 🧠 - психолог

**Основные команды:**
• /start - начать работу с ботом
• /help - справка по всем командам
• /profile - настройка профиля
• /team - состав команды
• /standup - запуск daily standup
• /mystatus - мой статус на сегодня
• /teamstatus - статус всей команды
• /projects - управление проектами
• /ai <вопрос> - задать вопрос ИИ
• /analyze - анализ состояния команды
• /summary - генерация отчета

**Админские команды:**
• /setrole @username роль - изменить роль пользователя
• /promote @username - повысить до администратора
• /roles - просмотр ролей команды

**Методология:** Agile/Scrum с daily standups, спринтами и ретроспективами.
`;

    // Добавляем информацию о текущей команде если доступна
    if (projectService) {
      try {
        const users = await projectService.getAllUsers();
        const projects = await projectService.getActiveProjects();
        const todayStatuses = await projectService.getTodayStatuses();

        context += `\n**Текущее состояние команды:**\n`;
        context += `👥 Участников: ${users.length}\n`;
        context += `🚀 Активных проектов: ${projects.length}\n`;
        context += `✅ Отчитались сегодня: ${todayStatuses.length}\n\n`;

        if (users.length > 0) {
          context += `**Участники команды:**\n`;
          users.forEach((user: any) => {
            const usernameDisplay = user.username ? `@${user.username}` : 'без username';
            const roleEmoji = this.getRoleEmoji(user.role);
            context += `• ${user.name} (${usernameDisplay}) - ${roleEmoji} ${user.role}\n`;
          });
          context += '\n';
        }

        if (projects.length > 0) {
          context += `**Активные проекты:**\n`;
          projects.forEach((project: any) => {
            context += `• ${project.name} - ${project.description}\n`;
          });
          context += '\n';
        }

        if (todayStatuses.length > 0) {
          context += `**Сегодняшние статусы:**\n`;
          todayStatuses.forEach((status: any) => {
            context += `• ${status.name}: "${status.today}"\n`;
          });
        }
      } catch (error) {
        logger.warn('Не удалось загрузить контекст команды:', error);
      }
    }

    context += `\n**Инструкции:**
• Отвечай на русском языке
• Будь полезным и конструктивным
• Используй эмодзи для лучшего восприятия
• Давай конкретные рекомендации по управлению проектами
• Помогай с планированием и организацией работы
• Анализируй проблемы команды и предлагай решения`;

    return context;
  }

  private getRoleEmoji(role: string): string {
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

  // Новый метод для обработки вопросов с контекстом
  async processQuestionWithContext(question: string, projectService?: any): Promise<string> {
    try {
      const systemContext = await this.createBotContext(projectService);
      
      const completion = await this.openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: systemContext
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      return completion.choices[0]?.message?.content || 'Не удалось получить ответ от ИИ';
      
    } catch (error) {
      logger.error('Ошибка при обработке вопроса с контекстом:', error);
      return 'Произошла ошибка при обработке вашего вопроса. Попробуйте позже.';
    }
  }

  async analyzeTeamStatus(dailyStatuses: any[], projectService?: any): Promise<AIAnalysis> {
    try {
      const systemContext = await this.createBotContext(projectService);
      const prompt = this.buildAnalysisPrompt(dailyStatuses);
      
      const completion = await this.openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: systemContext + '\n\nТвоя задача - проанализировать статусы команды и дать профессиональные рекомендации.'
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

  async generateSummary(data: any, projectService?: any): Promise<string> {
    try {
      const systemContext = await this.createBotContext(projectService);
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
            content: systemContext + '\n\nТвоя задача - создать информативный отчет для проджект менеджера.'
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