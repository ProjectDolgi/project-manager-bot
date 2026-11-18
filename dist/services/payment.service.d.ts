import { Telegraf } from 'telegraf';
import { DatabaseService } from './database.service';
import { SubscriptionService } from './subscription.service';
import { BotContext } from '../index';
export interface PaymentPlan {
    id: 'monthly' | 'yearly';
    title: string;
    description: string;
    price: number;
    label: string;
}
export interface YooKassaPayment {
    id: string;
    status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
    confirmation?: {
        confirmation_url?: string;
    };
    payment_method?: {
        id: string;
        saved: boolean;
        type: string;
    };
}
export declare class PaymentService {
    private dbService;
    private subscriptionService;
    private yookassaEnabled;
    constructor(dbService: DatabaseService, subscriptionService: SubscriptionService);
    getPlans(): PaymentPlan[];
    sendInvoice(bot: Telegraf<BotContext>, ctx: BotContext, plan: PaymentPlan): Promise<void>;
    handleSuccessfulPayment(ctx: BotContext): Promise<void>;
    createYooKassaPayment(amount: number, description: string, userId: number, plan: 'monthly' | 'yearly', paymentMethodId?: string): Promise<YooKassaPayment | null>;
    checkPaymentStatus(paymentId: string): Promise<YooKassaPayment | null>;
    processAutoRenewal(bot: Telegraf<BotContext>): Promise<void>;
    processExpiredSubscriptions(bot: Telegraf<BotContext>): Promise<void>;
}
