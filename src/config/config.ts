import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Telegram Bot
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  WEBHOOK_URL: process.env.WEBHOOK_URL || '',
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4',
  
  // Database
  DATABASE_PATH: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bot.db'),
  
  // Bot Settings
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID || '',
  SUMMARY_CHAT_ID: process.env.SUMMARY_CHAT_ID || '',
  DAILY_STANDUP_TIME: process.env.DAILY_STANDUP_TIME || '09:00',
  TIMEZONE: process.env.TIMEZONE || 'Europe/Moscow',
  
  // External Integrations (опционально)
  JIRA_URL: process.env.JIRA_URL || '',
  JIRA_TOKEN: process.env.JIRA_TOKEN || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',

  // Payment Configuration
  PAYMENT_PROVIDER_TOKEN: process.env.PAYMENT_PROVIDER_TOKEN || '',
  YOOKASSA_SHOP_ID: process.env.YOOKASSA_SHOP_ID || '',
  YOOKASSA_SECRET_KEY: process.env.YOOKASSA_SECRET_KEY || '',

  // Subscription Settings
  TRIAL_DAYS: parseInt(process.env.TRIAL_DAYS || '1', 10),
  MONTHLY_PRICE: parseInt(process.env.MONTHLY_PRICE || '390', 10),
  YEARLY_PRICE: parseInt(process.env.YEARLY_PRICE || '3500', 10),

  // App Settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10)
}; 