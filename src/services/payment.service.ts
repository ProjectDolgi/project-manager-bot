import { Telegraf } from 'telegraf';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { DatabaseService } from './database.service';
import { SubscriptionService } from './subscription.service';
import { BotContext } from '../index';

export interface PaymentPlan {
  id: 'monthly' | 'yearly';
  title: string;
  description: string;
  price: number; // в копейках
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

export class PaymentService {
  private yookassaEnabled: boolean;

  constructor(
    private dbService: DatabaseService,
    private subscriptionService: SubscriptionService
  ) {
    this.yookassaEnabled = Boolean(config.YOOKASSA_SHOP_ID && config.YOOKASSA_SECRET_KEY);
  }

  getPlans(): PaymentPlan[] {
    return [
      {
        id: 'monthly',
        title: 'Месячная подписка',
        description: 'Доступ ко всем функциям бота на 30 дней',
        price: config.MONTHLY_PRICE * 100,
        label: `${config.MONTHLY_PRICE} ₽`
      },
      {
        id: 'yearly',
        title: 'Годовая подписка',
        description: 'Доступ ко всем функциям бота на 365 дней',
        price: config.YEARLY_PRICE * 100,
        label: `${config.YEARLY_PRICE} ₽`
      }
    ];
  }

  async sendInvoice(bot: Telegraf<BotContext>, ctx: BotContext, plan: PaymentPlan): Promise<void> {
    try {
      if (!config.PAYMENT_PROVIDER_TOKEN) {
        await ctx.reply('❌ Платёжная система не настроена. Обратитесь к администратору.');
        return;
      }

      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply('❌ Не удалось определить пользователя.');
        return;
      }

      const payload = `sub_${plan.id}_${userId}_${Date.now()}`;

      await bot.telegram.sendInvoice(userId, {
        title: plan.title,
        description: plan.description,
        payload: payload,
        provider_token: config.PAYMENT_PROVIDER_TOKEN,
        currency: 'RUB',
        prices: [
          {
            label: plan.label,
            amount: plan.price
          }
        ],
        start_parameter: 'subscribe',
        provider_data: JSON.stringify({
          save_payment_method: this.yookassaEnabled
        })
      });
    } catch (error) {
      logger.error('Ошибка при отправке счёта:', error);
      await ctx.reply('❌ Не удалось создать счёт на оплату. Попробуйте позже.');
    }
  }

  async handleSuccessfulPayment(ctx: BotContext): Promise<void> {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const message = ctx.message as any;
      const successfulPayment = message?.successful_payment;
      if (!successfulPayment) return;

      const payload = successfulPayment.invoice_payload;
      const plan = payload.includes('yearly') ? 'yearly' : 'monthly';

      logger.info(`Успешная оплата от пользователя ${userId}, тариф ${plan}`);

      // Активируем или продлеваем подписку
      const subscription = await this.dbService.getSubscriptionByUserId(userId);

      if (subscription && subscription.status === 'active') {
        await this.subscriptionService.extendSubscription(userId, plan);
      } else {
        await this.subscriptionService.activateSubscription(userId, plan);
      }

      await ctx.reply(`✅ Оплата прошла успешно!\n\nВаша ${plan === 'yearly' ? 'годовая' : 'месячная'} подписка активирована.\nАвтопродление включено.`);
    } catch (error) {
      logger.error('Ошибка при обработке успешной оплаты:', error);
      await ctx.reply('❌ Оплата прошла, но возникла ошибка при активации подписки. Обратитесь к поддержке.');
    }
  }

  async createYooKassaPayment(
    amount: number,
    description: string,
    userId: number,
    plan: 'monthly' | 'yearly',
    paymentMethodId?: string
  ): Promise<YooKassaPayment | null> {
    if (!this.yookassaEnabled) {
      logger.warn('YooKassa не настроена');
      return null;
    }

    try {
      const idempotenceKey = `renew_${userId}_${Date.now()}`;
      const body: any = {
        amount: {
          value: (amount / 100).toFixed(2),
          currency: 'RUB'
        },
        capture: true,
        description: description,
        metadata: {
          user_id: userId,
          plan: plan
        }
      };

      if (paymentMethodId) {
        body.payment_method_id = paymentMethodId;
        body.save_payment_method = false;
      } else {
        body.save_payment_method = true;
        body.confirmation = {
          type: 'redirect',
          return_url: 'https://t.me/' // Заглушка
        };
      }

      const auth = Buffer.from(`${config.YOOKASSA_SHOP_ID}:${config.YOOKASSA_SECRET_KEY}`).toString('base64');

      const response = await fetch('https://api.yookassa.ru/v3/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Idempotence-Key': idempotenceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Ошибка YooKassa:', errorText);
        return null;
      }

      return await response.json() as YooKassaPayment;
    } catch (error) {
      logger.error('Ошибка при создании платежа YooKassa:', error);
      return null;
    }
  }

  async checkPaymentStatus(paymentId: string): Promise<YooKassaPayment | null> {
    if (!this.yookassaEnabled) return null;

    try {
      const auth = Buffer.from(`${config.YOOKASSA_SHOP_ID}:${config.YOOKASSA_SECRET_KEY}`).toString('base64');

      const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        logger.error('Ошибка при проверке статуса платежа YooKassa');
        return null;
      }

      return await response.json() as YooKassaPayment;
    } catch (error) {
      logger.error('Ошибка при проверке статуса платежа:', error);
      return null;
    }
  }

  async processAutoRenewal(bot: Telegraf<BotContext>): Promise<void> {
    if (!this.yookassaEnabled) {
      logger.info('YooKassa не настроена, автопродление невозможно');
      return;
    }

    try {
      const expiring = await this.dbService.getExpiringSubscriptions(24);

      for (const subscription of expiring as any[]) {
        const userId = subscription.user_id;
        const telegramId = subscription.telegram_id;

        if (!subscription.payment_method_id) {
          await bot.telegram.sendMessage(
            telegramId,
            '⏰ Ваша подписка скоро закончится. Пожалуйста, продлите её командой /subscribe'
          );
          continue;
        }

        const plan = subscription.plan as 'monthly' | 'yearly';
        const price = plan === 'yearly' ? config.YEARLY_PRICE * 100 : config.MONTHLY_PRICE * 100;
        const description = `Автопродление ${plan === 'yearly' ? 'годовой' : 'месячной'} подписки`;

        const payment = await this.createYooKassaPayment(
          price,
          description,
          userId,
          plan,
          subscription.payment_method_id
        );

        if (!payment) {
          await bot.telegram.sendMessage(
            telegramId,
            '❌ Не удалось выполнить автопродление подписки. Пожалуйста, продлите вручную: /subscribe'
          );
          continue;
        }

        // Даём небольшую задержку и проверяем статус
        await new Promise(resolve => setTimeout(resolve, 5000));
        const status = await this.checkPaymentStatus(payment.id);

        if (status?.status === 'succeeded') {
          await this.subscriptionService.extendSubscription(userId, plan);
          await bot.telegram.sendMessage(
            telegramId,
            `✅ Подписка успешно продлена (${plan === 'yearly' ? 'годовая' : 'месячная'}).`
          );
        } else {
          await bot.telegram.sendMessage(
            telegramId,
            '❌ Автопродление не удалось. Пожалуйста, оплатите вручную: /subscribe'
          );
        }
      }
    } catch (error) {
      logger.error('Ошибка при автопродлении подписок:', error);
    }
  }

  async processExpiredSubscriptions(bot: Telegraf<BotContext>): Promise<void> {
    try {
      const expired = await this.dbService.getExpiredSubscriptions();

      for (const subscription of expired as any[]) {
        const telegramId = subscription.telegram_id;

        await this.subscriptionService.expireSubscription(subscription.user_id);
        await bot.telegram.sendMessage(
          telegramId,
          '❌ Ваша подписка истекла. Все команды заблокированы. Чтобы продолжить, оформите подписку: /subscribe'
        );
      }
    } catch (error) {
      logger.error('Ошибка при обработке истёкших подписок:', error);
    }
  }
}
