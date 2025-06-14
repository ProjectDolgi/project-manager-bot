# 🚀 Быстрый старт

## 1. Установка зависимостей
```bash
npm install
```

## 2. Настройка переменных окружения
Создайте файл `.env` на основе `env.example`:
```bash
cp env.example .env
```

Заполните обязательные поля:
```env
BOT_TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
ADMIN_CHAT_ID=your_admin_chat_id
SUMMARY_CHAT_ID=your_summary_chat_id
```

## 3. Запуск в режиме разработки
```bash
npm run dev
```

База данных SQLite3 создастся автоматически при первом запуске в папке `data/bot.db`.

## 4. Первые шаги в Telegram
1. Найдите вашего бота в Telegram
2. Отправьте `/start` для регистрации
3. Используйте `/help` для просмотра всех команд
4. Попробуйте `/standup` для запуска daily standup

## 🎯 Основные команды для тестирования
- `/start` - регистрация
- `/team` - посмотреть команду  
- `/project Тестовый проект` - создать проект
- `/standup` - запустить daily standup
- `/ai Привет, как дела?` - тест ИИ

## 🔧 Получение токенов

### Telegram Bot Token
1. Напишите [@BotFather](https://t.me/botfather)
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен в `.env`

### OpenAI API Key
1. Зайдите на [platform.openai.com](https://platform.openai.com)
2. Создайте аккаунт
3. Перейдите в API Keys
4. Создайте новый ключ
5. Скопируйте в `.env`

## 📊 Настройка чатов (опционально)
Для автоматических уведомлений добавьте в `.env`:
```env
ADMIN_CHAT_ID=your_main_chat_id
SUMMARY_CHAT_ID=your_reports_chat_id
```

Чтобы получить Chat ID:
1. Добавьте бота в группу
2. Отправьте любое сообщение
3. Перейдите по ссылке: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Найдите `chat.id` в ответе

## ✅ Готово!
Ваш бот готов к работе! 🎉

## 📁 Структура файлов
После запуска у вас будет:
```
project-manager-bot/
├── data/
│   └── bot.db          # SQLite база данных
├── src/                # Исходный код
├── dist/               # Скомпилированный код
├── .env                # Переменные окружения
└── package.json        # Зависимости
``` 