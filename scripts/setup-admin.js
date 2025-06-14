const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const dbPath = path.join(__dirname, '..', 'data', 'bot.db');

// ID и имя первого администратора
const ADMIN_TELEGRAM_ID = '6763191127';
const ADMIN_NAME = 'Artem Mailov 🌅';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
    return;
  }
  console.log('Подключен к SQLite базе данных.');
});

// Функция для создания/обновления администратора
function setupAdmin() {
  // Сначала проверяем, существует ли пользователь
  db.get('SELECT * FROM users WHERE telegram_id = ?', [ADMIN_TELEGRAM_ID], (err, row) => {
    if (err) {
      console.error('Ошибка при поиске пользователя:', err.message);
      return;
    }

    if (row) {
      // Пользователь существует, обновляем роль
      db.run('UPDATE users SET role = ? WHERE telegram_id = ?', ['admin', ADMIN_TELEGRAM_ID], function(err) {
        if (err) {
          console.error('Ошибка при обновлении роли:', err.message);
          return;
        }
        console.log(`✅ Роль пользователя ${ADMIN_NAME} (${ADMIN_TELEGRAM_ID}) обновлена на 'admin'`);
        db.close();
      });
    } else {
      // Пользователь не существует, создаем нового
      db.run('INSERT INTO users (telegram_id, name, role) VALUES (?, ?, ?)', 
        [ADMIN_TELEGRAM_ID, ADMIN_NAME, 'admin'], function(err) {
        if (err) {
          console.error('Ошибка при создании администратора:', err.message);
          return;
        }
        console.log(`✅ Создан новый администратор: ${ADMIN_NAME} (${ADMIN_TELEGRAM_ID})`);
        db.close();
      });
    }
  });
}

// Запускаем настройку
setupAdmin(); 