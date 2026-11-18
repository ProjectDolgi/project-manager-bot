"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSubscriptionCommands = void 0;
const telegraf_1 = require("telegraf");
const logger_1 = require("../utils/logger");
function setupSubscriptionCommands(bot, services) {
    const { subscriptionService, paymentService, projectService } = services;
    // Команда /subscribe
    bot.command('subscribe', async (ctx) => {
        try {
            const user = ctx.from;
            if (!user)
                return;
            const dbUser = await projectService.getUserByTelegramId(user.id.toString());
            if (!dbUser) {
                await ctx.reply('❌ Сначала зарегистрируйтесь командой /start');
                return;
            }
            const info = await subscriptionService.getSubscriptionInfo(dbUser.id);
            const message = subscriptionService.formatSubscriptionMessage(info);
            const plans = paymentService.getPlans();
            await ctx.replyWithMarkdown(`${message}\n\nВыберите тариф:`, telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback(`💳 ${plans[0].title} — ${plans[0].label}`, 'subscribe_monthly')],
                [telegraf_1.Markup.button.callback(`⭐ ${plans[1].title} — ${plans[1].label}`, 'subscribe_yearly')]
            ]));
        }
        catch (error) {
            logger_1.logger.error('Ошибка в команде /subscribe:', error);
            await ctx.reply('❌ Ошибка при получении информации о подписке.');
        }
    });
    // Команда /subscription — показать статус подписки
    bot.command('subscription', async (ctx) => {
        try {
            const user = ctx.from;
            if (!user)
                return;
            const dbUser = await projectService.getUserByTelegramId(user.id.toString());
            if (!dbUser) {
                await ctx.reply('❌ Сначала зарегистрируйтесь командой /start');
                return;
            }
            const info = await subscriptionService.getSubscriptionInfo(dbUser.id);
            const message = subscriptionService.formatSubscriptionMessage(info);
            await ctx.replyWithMarkdown(message);
        }
        catch (error) {
            logger_1.logger.error('Ошибка в команде /subscription:', error);
            await ctx.reply('❌ Ошибка при получении информации о подписке.');
        }
    });
    // Обработка кнопок выбора тарифа
    bot.action('subscribe_monthly', async (ctx) => {
        await ctx.answerCbQuery();
        const plans = paymentService.getPlans();
        await paymentService.sendInvoice(bot, ctx, plans[0]);
    });
    bot.action('subscribe_yearly', async (ctx) => {
        await ctx.answerCbQuery();
        const plans = paymentService.getPlans();
        await paymentService.sendInvoice(bot, ctx, plans[1]);
    });
    // Обработка предоплаты
    bot.on('pre_checkout_query', async (ctx) => {
        try {
            await ctx.answerPreCheckoutQuery(true);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при обработке pre_checkout_query:', error);
        }
    });
    // Обработка успешной оплаты
    bot.on('successful_payment', async (ctx) => {
        try {
            await paymentService.handleSuccessfulPayment(ctx);
        }
        catch (error) {
            logger_1.logger.error('Ошибка при обработке successful_payment:', error);
        }
    });
}
exports.setupSubscriptionCommands = setupSubscriptionCommands;
