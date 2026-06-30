
# World Cup Multiplayer Predictor

## Запуск локально

1. Установи Node.js 18+
2. В папке проекта:
   npm install
   npm start
3. Открой:
   http://localhost:3000

## Админ

При регистрации введи admin code:

admin123

Можно поменять через переменную окружения ADMIN_CODE.

## Как загрузить на Render

1. Создай аккаунт Render
2. New Web Service
3. Залей этот проект на GitHub
4. Start command:
   npm start
5. Environment variable:
   ADMIN_CODE=твой_секретный_код

Важно: db.json на бесплатном Render может сбрасываться при пересборке/рестарте. Для настоящего продакшена лучше заменить JSON на PostgreSQL/Supabase.
