# CAITO Assistant — BigTechGroup

AI-ассистент стратегических решений для хакатона AI South Hub 2026.

## Быстрый старт

```bash
# 1. Клонировать/скопировать файлы
# 2. Установить зависимости
pip install -r requirements.txt

# 3. Задать API ключ
export ANTHROPIC_API_KEY=sk-ant-...

# 4. Запустить
python main.py
# или
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Docker

```bash
cp .env.example .env
# Отредактировать .env — вставить ANTHROPIC_API_KEY
docker-compose up -d
```

## API

```bash
# Основной эндпоинт
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Какова твоя позиция по масштабированию?"}'

# Health check
curl http://localhost:8000/health

# Docs
open http://localhost:8000/docs
```

## Тестирование

```bash
python test_api.py http://localhost:8000
```

## Архитектура

```
User → FastAPI (5 endpoints) → Input validation → Claude API (claude-sonnet-4) → Response
                                                      ↑
                                               System Prompt
                                          (CAITO role + все данные кейса
                                           + карта ролей + правила поведения)
```

Conversation history хранится in-memory по session_id (до 40 сообщений).
