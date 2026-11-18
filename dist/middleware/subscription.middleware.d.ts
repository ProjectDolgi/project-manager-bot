import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { SubscriptionService } from '../services/subscription.service';
export declare function setupSubscriptionMiddleware(bot: Telegraf<BotContext>, subscriptionService: SubscriptionService): void;
