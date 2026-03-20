# TODO — CAITO Assistant

## Критично (управленческая логика — 5/50)

- [ ] `--workers 1` в Dockerfile — без этого in-memory state не шарится между процессами, автоскорер теряет контекст между запросами
- [ ] Session по IP — если автоскорер не шлёт session_id, привязывать сессию к `request.client.host`
- [ ] Структурированный блок позиции в каждом ответе: `ТЕКУЩАЯ ПОЗИЦИЯ / КЛЮЧЕВЫЕ МЕТРИКИ / ДОПУЩЕНИЯ`

## Высокий приоритет

- [ ] RAG вместо гигантского system prompt — вынести данные кейса в файлы, подтягивать по ключевым словам
- [ ] Формат кумулятивного трекинга — "Поступило N вводных: [...]. Кумулятивный эффект: [...]"

## Фронтенд (rfi.md)

- [ ] SSE streaming: `"text"` → `"content"` в чанках (строка 1118: `{"text": text, "done": False}` → `{"content": text, "done": False}`)
- [ ] SSE финальный чанк: добавить `session_id` (строка 1123: добавить `"session_id": session_id`)
- [ ] Протестировать streaming через traefik: `curl -N -X POST http://localhost:80/api/chat -H 'Content-Type: application/json' -d '{"message": "тест", "stream": true}'`

## Средний приоритет

- [ ] Проверить что streaming (SSE) работает через traefik
