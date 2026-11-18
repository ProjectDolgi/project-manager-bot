"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const logger_1 = require("../utils/logger");
const config_1 = require("../config/config");
class SubscriptionService {
    constructor(dbService) {
        this.dbService = dbService;
    }
    async ensureTrialSubscription(userId) {
        try {
            const existing = await this.dbService.getSubscriptionByUserId(userId);
            if (existing) {
                return existing;
            }
            return await this.dbService.createTrialSubscription(userId, config_1.config.TRIAL_DAYS);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при создании пробной подписки:', error);
            throw error;
        }
    }
    async hasActiveSubscription(userId) {
        try {
            const subscription = await this.dbService.getSubscriptionByUserId(userId);
            if (!subscription) {
                return false;
            }
            if (subscription.status === 'cancelled') {
                return false;
            }
            const now = new Date();
            const endDate = new Date(subscription.end_date);
            return (subscription.status === 'active' || subscription.status === 'trial') && endDate > now;
        }
        catch (error) {
            logger_1.logger.error('Ошибка при проверке подписки:', error);
            return false;
        }
    }
    async getSubscriptionInfo(userId) {
        try {
            const subscription = await this.dbService.getSubscriptionByUserId(userId);
            if (!subscription) {
                return { subscription: null, active: false, daysLeft: 0 };
            }
            const now = new Date();
            const endDate = new Date(subscription.end_date);
            const diffTime = endDate.getTime() - now.getTime();
            const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            const active = (subscription.status === 'active' || subscription.status === 'trial') && endDate > now;
            return { subscription, active, daysLeft };
        }
        catch (error) {
            logger_1.logger.error('Ошибка при получении информации о подписке:', error);
            return { subscription: null, active: false, daysLeft: 0 };
        }
    }
    async activateSubscription(userId, plan, paymentMethodId) {
        try {
            const days = plan === 'yearly' ? 365 : 30;
            return await this.dbService.activateSubscription(userId, plan, days, paymentMethodId);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при активации подписки:', error);
            throw error;
        }
    }
    async extendSubscription(userId, plan) {
        try {
            const days = plan === 'yearly' ? 365 : 30;
            return await this.dbService.extendSubscription(userId, days);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при продлении подписки:', error);
            throw error;
        }
    }
    async expireSubscription(userId) {
        try {
            await this.dbService.updateSubscriptionStatus(userId, 'expired');
        }
        catch (error) {
            logger_1.logger.error('Ошибка при деактивации подписки:', error);
            throw error;
        }
    }
    async cancelAutoRenew(userId) {
        try {
            await this.dbService.setAutoRenew(userId, false);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при отмене автопродления:', error);
            throw error;
        }
    }
    formatSubscriptionMessage(info) {
        if (!info.subscription) {
            return '❌ У вас нет подписки. Используйте /subscribe для оформления.';
        }
        const statusEmoji = info.active ? '✅' : '❌';
        const statusText = info.subscription.status === 'trial'
            ? '🎁 Пробный период'
            : info.subscription.status === 'active'
                ? '⭐ Активная подписка'
                : '❌ Подписка истекла';
        const planText = info.subscription.plan === 'yearly'
            ? 'Годовая подписка'
            : info.subscription.plan === 'monthly'
                ? 'Месячная подписка'
                : 'Пробный период';
        const autoRenewText = info.subscription.auto_renew
            ? '🔄 Автопродление включено'
            : '🚫 Автопродление отключено';
        return `
${statusText}

📦 Тариф: ${planText}
📅 Осталось дней: ${info.daysLeft}
${statusEmoji} Статус: ${info.active ? 'Активна' : 'Неактивна'}
${autoRenewText}
    `.trim();
    }
}
exports.SubscriptionService = SubscriptionService;
