const https = require('https');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не найден в .env файле');
  process.exit(1);
}

// Список всех команд бота
const commands = [
  {
    command: 'start',
    description: '🚀 Начать работу с ботом'
  },
  {
    command: 'help',
    description: '❓ Справка по всем командам'
  },
  {
    command: 'profile',
    description: '👤 Настройки профиля'
  },
  {
    command: 'team',
    description: '👥 Состав команды'
  },
  {
    command: 'standup',
    description: '📊 Запуск daily standup'
  },
  {
    command: 'mystatus',
    description: '📝 Мой статус на сегодня'
  },
  {
    command: 'teamstatus',
    description: '📈 Статус всей команды'
  },
  {
    command: 'projects',
    description: '🚀 Управление проектами'
  },
  {
    command: 'project',
    description: '📁 Создать новый проект'
  },
  {
    command: 'ai',
    description: '🤖 Задать вопрос ИИ'
  },
  {
    command: 'analyze',
    description: '📊 Анализ состояния команды'
  },
  {
    command: 'summary',
    description: '📋 Генерация отчета'
  },
  {
    command: 'setrole',
    description: '👑 Изменить роль пользователя (админ)'
  },
  {
    command: 'promote',
    description: '⬆️ Повысить до администратора (админ)'
  },
  {
    command: 'roles',
    description: '👥 Просмотр ролей команды (админ)'
  }
];

// Функция для отправки запроса к Telegram Bot API
function makeRequest(method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.ok) {
            resolve(response.result);
          } else {
            reject(new Error(`API Error: ${response.description}`));
          }
        } catch (error) {
          reject(new Error(`Parse Error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Основная функция настройки команд
async function setupCommands() {
  try {
    console.log('🔧 Настройка команд бота...');
    
    // Устанавливаем команды для всех пользователей
    await makeRequest('setMyCommands', {
      commands: commands
    });
    
    console.log('✅ Команды успешно настроены!');
    console.log(`📝 Установлено ${commands.length} команд:`);
    
    commands.forEach(cmd => {
      console.log(`   /${cmd.command} - ${cmd.description}`);
    });
    
    console.log('\n🎉 Теперь при вводе "/" в чате с ботом будут показываться все доступные команды!');
    
  } catch (error) {
    console.error('❌ Ошибка при настройке команд:', error.message);
    process.exit(1);
  }
}

// Запускаем настройку
setupCommands(); 