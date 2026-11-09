import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { DatabaseService } from '../services/database.service';
import { SubscriptionService } from '../services/subscription.service';
export declare function setupMiddleware(bot: Telegraf<BotContext>, dbService: DatabaseService, subscriptionService?: SubscriptionService): void;
export declare function setUserState(userId: string, state: any): void;
export declare function getUserState(userId: string): any;
export declare function clearUserState(userId: string): void;
//# sourceMappingURL=index.d.ts.map