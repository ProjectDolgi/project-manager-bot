import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';
import { ProjectService } from '../services/project.service';
import { setupBasicCommands } from './basic.commands';
import { setupProjectCommands } from './project.commands';
import { setupStandupCommands } from './standup.commands';
import { setupAICommands } from './ai.commands';
import { setupAdminCommands } from './admin.commands';

export interface Services {
  dbService: DatabaseService;
  aiService: AIService;
  projectService: ProjectService;
}

export function setupCommands(bot: Telegraf<BotContext>, services: Services) {
  // Базовые команды
  setupBasicCommands(bot, services);
  
  // Команды для работы с проектами
  setupProjectCommands(bot, services);
  
  // Команды для standup
  setupStandupCommands(bot, services);
  
  // AI команды
  setupAICommands(bot, services);
  
  // Admin команды
  setupAdminCommands(bot, services);
} 