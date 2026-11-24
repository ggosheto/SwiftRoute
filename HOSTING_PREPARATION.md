# SwiftRoute: подготовка за хостване

Основа: commit f7f3b0e. Пакетът поправя импорти след преместването на файловете, регистрира моделите в Alembic и добавя DB_SSLMODE за защитена DB връзка. Не публикува автоматично и не променя база данни.

## Поставяне
Копирай съдържанието върху основната папка SwiftRoute. Замени само едноименните файлове; не изтривай останалото. requirements.txt запазва същите версии, но е записан като UTF-8. requirements-hosting.txt включва и трите списъка зависимости.

## Проверка от основната папка в Windows
```powershell
.\.venv\Scripts\python.exe -m backend.scripts.check_database
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```
Отвори http://127.0.0.1:8000/health. Очаквано: {"status":"ok"}. Тази проверка показва, че приложението е заредено, но не проверява PostgreSQL.

## Предстоящи настройки за Render (след създаване на онлайн базата)
- Тип: Python Web Service, Free.
- Root Directory: празно (основната папка).
- Build: `pip install -r requirements-hosting.txt`
- Start: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT --workers 1`
- Health Check Path: `/health`
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD: от Supabase Session pooler.
- DB_SSLMODE: `require`
- AUTH_COOKIE_SECURE: `true`
- AUTH_ALLOWED_ORIGINS: точният публичен HTTPS адрес на интерфейса.
Python версията и инсталирането на всички заключени зависимости трябва да се проверят при cloud build. Не използвай --reload на хостинга.

## Supabase
Free проект в европейски регион. Data API се изключва: приложението използва FastAPI и SQLAlchemy. В Connect избери Session pooler (IPv4, порт 5432); не копирай паролата в GitHub или чата.

## Инициализация на нова база
Първата миграция очаква вече съществуващи restaurants, couriers, orders. Само `alembic upgrade head` върху празна база няма да е достатъчно. След настройване и проверка на връзката към НОВАТА база, последователността в отделни процеси е:
1. `python -m backend.scripts.init_database` (основни таблици и демо ресторанти/куриери)
2. `python -m alembic upgrade head` (акаунти, сесии и одобрения)
3. Създаване на демонстрационни акаунти чрез съществуващия user_accounts CLI.
Това не прехвърля старите поръчки и акаунти. Не се изпълнява автоматично при всяко стартиране.

## Обхват на проверките
Проверено зареждане на FastAPI и графа (1937 върха) в Linux тестова среда. Измерен стартов пик приблизително 250 MiB; това не е натоварващ тест и не гарантира паметта на Render. Проверено генериране на миграционен SQL без връзка с PostgreSQL. Не е извършен реален cloud deployment или тест с Supabase.
