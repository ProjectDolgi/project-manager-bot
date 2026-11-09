import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { DatabaseService } from '../services/database.service';
import { SubscriptionService } from '../services/subscription.service';
import { PaymentService } from '../services/payment.service';
export declare function setupCronJobs(bot: Telegraf<BotContext>, dbService: DatabaseService, subscriptionService?: SubscriptionService, paymentService?: PaymentService): void;
//# sourceMappingURL=index.d.ts.map