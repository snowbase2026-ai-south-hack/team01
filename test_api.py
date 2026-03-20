"""
Тест-скрипт для проверки всех требований хакатона.
Запуск: python test_api.py [BASE_URL]
"""
import requests
import json
import sys
import time
import concurrent.futures

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

PASS = "✅"
FAIL = "❌"
results = []

def test(name, func):
    try:
        ok, detail = func()
        status = PASS if ok else FAIL
        results.append((name, ok))
        print(f"  {status} {name}: {detail}")
    except Exception as e:
        results.append((name, False))
        print(f"  {FAIL} {name}: EXCEPTION — {e}")

# ═══ 1. КОНТРАКТ ═══
print("\n═══ КОНТРАКТ ═══")

def test_post_json():
    r = requests.post(f"{BASE_URL}/api/chat", json={"message": "Привет, какова твоя позиция?"}, timeout=120)
    data = r.json()
    ok = r.status_code == 200 and "response" in data and len(data["response"]) >= 10
    return ok, f"status={r.status_code}, len={len(data.get('response',''))}"
test("POST /api/chat с JSON", test_post_json)

def test_utf8():
    r = requests.post(f"{BASE_URL}/api/chat", json={"message": "Расскажи про деградацию модели"}, timeout=120)
    data = r.json()
    text = data.get("response", "")
    has_russian = any('\u0400' <= c <= '\u04FF' for c in text)
    return has_russian, f"russian_chars={'yes' if has_russian else 'no'}"
test("Корректный русский текст (UTF-8)", test_utf8)

def test_alt_endpoints():
    ok_count = 0
    for path in ["/api/v1/chat", "/chat", "/api/message", "/api/query"]:
        try:
            r = requests.post(f"{BASE_URL}{path}", json={"message": "тест"}, timeout=120)
            if r.status_code == 200:
                ok_count += 1
        except:
            pass
    return ok_count >= 3, f"{ok_count}/4 альтернативных эндпоинтов работают"
test("Альтернативные эндпоинты", test_alt_endpoints)

def test_query_field():
    r = requests.post(f"{BASE_URL}/api/chat", json={"query": "Какой сценарий рекомендуешь?"}, timeout=120)
    data = r.json()
    ok = r.status_code == 200 and len(data.get("response", "")) >= 10
    return ok, f"status={r.status_code}"
test("Поле 'query' вместо 'message'", test_query_field)

def test_messages_array():
    r = requests.post(f"{BASE_URL}/api/chat", json={
        "messages": [{"role": "user", "content": "Что с Precision@10?"}]
    }, timeout=120)
    data = r.json()
    ok = r.status_code == 200 and len(data.get("response", "")) >= 10
    return ok, f"status={r.status_code}"
test("Формат messages array", test_messages_array)

# ═══ 2. ОБРАБОТКА ОШИБОК ═══
print("\n═══ ОБРАБОТКА ОШИБОК ═══")

def test_empty_body():
    r = requests.post(f"{BASE_URL}/api/chat", data="", headers={"Content-Type": "application/json"}, timeout=30)
    return r.status_code == 400, f"status={r.status_code} (ожидали 400)"
test("Пустое тело → 400", test_empty_body)

def test_invalid_json():
    r = requests.post(f"{BASE_URL}/api/chat", data="это не json{{{", headers={"Content-Type": "application/json"}, timeout=30)
    return r.status_code == 400, f"status={r.status_code} (ожидали 400)"
test("Невалидный JSON → 400", test_invalid_json)

def test_missing_message():
    r = requests.post(f"{BASE_URL}/api/chat", json={"foo": "bar"}, timeout=30)
    return r.status_code == 400, f"status={r.status_code} (ожидали 400)"
test("Отсутствие поля message → 400", test_missing_message)

def test_not_found():
    r = requests.get(f"{BASE_URL}/api/nonexistent", timeout=10)
    return r.status_code == 404, f"status={r.status_code} (ожидали 404)"
test("Несуществующий путь → 404", test_not_found)

# ═══ 3. УСТОЙЧИВОСТЬ ═══
print("\n═══ УСТОЙЧИВОСТЬ ═══")

def test_long_message():
    long_msg = "Расскажи подробно о всех рисках масштабирования. " * 250  # 5000+ chars
    r = requests.post(f"{BASE_URL}/api/chat", json={"message": long_msg}, timeout=300)
    return r.status_code == 200, f"status={r.status_code}, msg_len={len(long_msg)}"
test("Длинное сообщение (5000+ символов)", test_long_message)

def test_empty_string():
    r = requests.post(f"{BASE_URL}/api/chat", json={"message": ""}, timeout=30)
    return r.status_code != 500, f"status={r.status_code} (не 500)"
test("Пустая строка — не 500", test_empty_string)

def test_special_chars():
    r = requests.post(f"{BASE_URL}/api/chat", json={"message": "<script>alert('xss')</script>"}, timeout=120)
    return r.status_code != 500, f"status={r.status_code}"
test("XSS — не 500", test_special_chars)

def test_sql_injection():
    r = requests.post(f"{BASE_URL}/api/chat", json={"message": "'; DROP TABLE users; --"}, timeout=120)
    return r.status_code != 500, f"status={r.status_code}"
test("SQL injection — не 500", test_sql_injection)

def test_null_message():
    r = requests.post(f"{BASE_URL}/api/chat", json={"message": None}, timeout=30)
    return r.status_code != 500, f"status={r.status_code}"
test("null вместо строки — не 500", test_null_message)

def test_number_message():
    r = requests.post(f"{BASE_URL}/api/chat", json={"message": 12345}, timeout=120)
    return r.status_code != 500, f"status={r.status_code}"
test("Число вместо строки — не 500", test_number_message)

# ═══ 4. БОНУС ═══
print("\n═══ БОНУС ═══")

def test_health():
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    return r.status_code == 200, f"status={r.status_code}"
test("GET /health → 200", test_health)

def test_docs():
    r = requests.get(f"{BASE_URL}/docs", timeout=10)
    return r.status_code == 200, f"status={r.status_code}"
test("GET /docs", test_docs)

def test_openapi():
    r = requests.get(f"{BASE_URL}/openapi.json", timeout=10)
    return r.status_code == 200, f"status={r.status_code}"
test("GET /openapi.json", test_openapi)

def test_cors():
    r = requests.options(f"{BASE_URL}/api/chat", headers={"Origin": "http://test.com"}, timeout=10)
    has_cors = "access-control-allow-origin" in {k.lower() for k in r.headers}
    return has_cors, f"CORS headers={'yes' if has_cors else 'no'}"
test("CORS headers", test_cors)

# ═══ 5. ПАРАЛЛЕЛЬНЫЕ ЗАПРОСЫ ═══
print("\n═══ НАГРУЗКА ═══")

def test_parallel_3():
    def make_request(i):
        r = requests.post(f"{BASE_URL}/api/chat", json={"message": f"Вопрос {i}: какой payback?"}, timeout=300)
        return r.status_code == 200
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        futures = [ex.submit(make_request, i) for i in range(3)]
        ok_count = sum(1 for f in concurrent.futures.as_completed(futures) if f.result())
    return ok_count == 3, f"{ok_count}/3 успешных"
test("3 параллельных запроса", test_parallel_3)

# ═══ ИТОГ ═══
print("\n" + "═" * 50)
passed = sum(1 for _, ok in results if ok)
total = len(results)
print(f"ИТОГО: {passed}/{total} тестов пройдено")
print("═" * 50)
