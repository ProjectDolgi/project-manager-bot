import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';
import { ProjectService } from '../services/project.service';
import { VoiceService } from '../services/voice.service';
import { SubscriptionService } from '../services/subscription.service';
import { PaymentService } from '../services/payment.service';
import { setupBasicCommands } from './basic.commands';
import { setupProjectCommands } from './project.commands';
import { setupStandupCommands } from './standup.commands';
import { setupAICommands } from './ai.commands';
import { setupAdminCommands } from './admin.commands';
import { setupSubscriptionCommands } from './subscription.commands';

export interface Services {
  dbService: DatabaseService;
  aiService: AIService;
  projectService: ProjectService;
  voiceService: VoiceService;
  subscriptionService: SubscriptionService;
  paymentService: PaymentService;
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

  // Команды подписки и оплаты
  setupSubscriptionCommands(bot, services);
} 