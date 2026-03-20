# RFI: Синхронизация бэкенда с фронтендом

## 1. SSE streaming — исправить имя поля токена

**Проблема:** Бэк отправляет `{"text": "...", "done": false}`, а фронт ищет токен в полях: `choices[0].delta.content`, `token`, или `content`.

**Что сделать в `main.py`, функция `process_chat`, блок `event_generator()`:**

Заменить:
```python
yield {"data": json.dumps({"text": text, "done": False})}
```
На:
```python
yield {"data": json.dumps({"content": text, "done": False})}
```

Финальное сообщение — поле `metrics` уже корректно, менять не нужно.

## 2. Метрики в streaming

Сейчас `metrics` отправляются только в финальном чанке (`done: True`). Это правильно — фронт именно так их и ждёт. **Ничего менять не нужно.**

## 3. Добавить `session_id` в финальный streaming чанк

В non-streaming ответе `session_id` уже есть. В streaming финальном чанке его нет — добавить:
```python
yield {"data": json.dumps({
    "content": "",
    "done": True,
    "response": full_response,
    "metrics": current_metrics,
    "session_id": session_id
})}
```

## 4. Итоговый контракт API

### Non-streaming (`stream: false` или отсутствует):
```json
{
  "response": "текст ответа",
  "session_id": "sess-xxx",
  "metrics": {"confidence": 0.85, "pressure": 0.30, "turn": 3}
}
```

### Streaming (`stream: true`) — SSE события:
```
data: {"content": "токен", "done": false}
data: {"content": "ещё токен", "done": false}
...
data: {"content": "", "done": true, "metrics": {"confidence": 0.85, "pressure": 0.30, "turn": 3}}
```

## Рекомендации

- **Не трогать** остальные поля-алиасы (`answer`, `message`, `text`) в non-streaming — они нужны для автотестов хакатона
- **Не менять** логику `compute_metrics()` — она уже привязана к `DecisionState` и корректно отражает стресс-тест волны
- **Протестировать** через curl:
  ```bash
  curl -N -X POST http://localhost:8000/api/chat \
    -H 'Content-Type: application/json' \
    -d '{"message": "Какова твоя позиция?", "stream": true}'
  ```

## Резюме

По сути **одно изменение на 1 строку** — переименовать `text` → `content` в SSE чанках. После этого фронт подхватит streaming.
