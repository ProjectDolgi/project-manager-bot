import { DatabaseService, Subscription } from './database.service';
export declare class SubscriptionService {
    private dbService;
    constructor(dbService: DatabaseService);
    ensureTrialSubscription(userId: number): Promise<Subscription>;
    hasActiveSubscription(userId: number): Promise<boolean>;
    getSubscriptionInfo(userId: number): Promise<{
        subscription: Subscription | null;
        active: boolean;
        daysLeft: number;
    }>;
    activateSubscription(userId: number, plan: 'monthly' | 'yearly', paymentMethodId?: string): Promise<Subscription>;
    extendSubscription(userId: number, plan: 'monthly' | 'yearly'): Promise<Subscription>;
    expireSubscription(userId: number): Promise<void>;
    cancelAutoRenew(userId: number): Promise<void>;
    formatSubscriptionMessage(info: {
        subscription: Subscription | null;
        active: boolean;
        daysLeft: number;
    }): string;
}
