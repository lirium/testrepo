Запуск (локально)

1. Создать и активировать venv:
   python3 -m venv .venv && source .venv/bin/activate
2. Установить зависимости:
   pip install -r requirements.txt
3. Запустить миграции и суперпользователя:
   python manage.py migrate
   python manage.py createsuperuser
4. Запустить сервер:
   python manage.py runserver 0.0.0.0:8000

