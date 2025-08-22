# Использование системы промокодов

## Обзор

Система промокодов предоставляет полный CRUD API для управления промокодами в админ-панели. Каждый промокод дает пользователю доступ к определенному количеству карточек.

## Основные возможности

### 1. Создание промокода
- **POST** `/api/admin/promocodes`
- Параметры:
  - `code` - уникальный код промокода (6-20 символов, буквы и цифры)
  - `description` - описание промокода
  - `maxUses` - максимальное количество использований
  - `cardPackageSize` - количество карточек в пакете
  - `expiresAt` - дата истечения (опционально)
  - `isActive` - активность промокода

### 2. Получение списка промокодов
- **GET** `/api/admin/promocodes`
- Параметры запроса:
  - `page` - номер страницы
  - `limit` - количество на странице
  - `search` - поиск по коду или описанию
  - `status` - фильтр по статусу (active, expired, used, unused)

### 3. Обновление промокода
- **PUT** `/api/admin/promocodes`
- Требует `id` промокода и все обновляемые поля

### 4. Удаление промокода
- **DELETE** `/api/admin/promocodes?id={id}`
- Можно удалить только неиспользованные промокоды

### 5. Частичное обновление
- **PATCH** `/api/admin/promocodes`
- Действия:
  - `activate` - активировать промокод
  - `deactivate` - деактивировать промокод
  - `reset_usage` - сбросить счетчик использований

## Дополнительные API

### Статистика
- **GET** `/api/admin/promocodes/stats`
- Возвращает общую статистику, топ промокодов, месячную статистику

### Валидация
- **POST** `/api/admin/promocodes/validate`
- Проверяет валидность промокода
- **GET** `/api/admin/promocodes/validate?code={code}`
- Проверяет доступность кода

### Экспорт
- **GET** `/api/admin/promocodes/export`
- Параметры:
  - `format` - формат экспорта (json, csv)
  - `status` - фильтр по статусу
  - `dateFrom`, `dateTo` - диапазон дат

## Использование в админ-панели

### Основная страница
- Просмотр всех промокодов с пагинацией
- Фильтрация по статусу и поиск
- Создание, редактирование, удаление

### Статистика
- Визуальное отображение статистики
- Топ популярных промокодов
- Месячная статистика создания

### Массовые операции
- Создание множества промокодов по шаблону
- Генерация случайных кодов
- Настройка параметров для всех промокодов

## Утилиты

### Генерация кодов
```javascript
import { generatePromocode } from '../utils/promocodes';

const code = generatePromocode({
  prefix: 'PROMO',
  length: 8,
  includeNumbers: true,
  includeLetters: true
});
```

### Валидация
```javascript
import { validatePromocodeFormat } from '../utils/promocodes';

const result = validatePromocodeFormat('PROMO123', {
  minLength: 6,
  maxLength: 20
});
```

### Статус промокода
```javascript
import { getPromocodeStatus } from '../utils/promocodes';

const status = getPromocodeStatus(promocode);
// Возвращает: { status, label, color }
```

## React хуки

### usePromocodes
```javascript
const { promocodes, loading, error, pagination, fetchPromocodes } = usePromocodes({
  page: 1,
  limit: 20,
  search: '',
  status: '',
  autoFetch: true
});
```

### useCreatePromocode
```javascript
const { createPromocode, loading, error, success, reset } = useCreatePromocode();

const handleCreate = async () => {
  try {
    await createPromocode(promocodeData);
    // Успешно создан
  } catch (error) {
    // Обработка ошибки
  }
};
```

### useUpdatePromocode
```javascript
const { updatePromocode, loading, error, success, reset } = useUpdatePromocode();

const handleUpdate = async () => {
  try {
    await updatePromocode({ id, ...updates });
    // Успешно обновлен
  } catch (error) {
    // Обработка ошибки
  }
};
```

### useDeletePromocode
```javascript
const { deletePromocode, loading, error, success, reset } = useDeletePromocode();

const handleDelete = async (id) => {
  try {
    await deletePromocode(id);
    // Успешно удален
  } catch (error) {
    // Обработка ошибки
  }
};
```

## Примеры использования

### Создание промокода
```javascript
const newPromocode = {
  code: 'SUMMER2024',
  description: 'Летняя акция',
  maxUses: 100,
  cardPackageSize: 25,
  expiresAt: '2024-08-31T23:59:59.000Z',
  isActive: true
};

const response = await fetch('/api/admin/promocodes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newPromocode)
});
```

### Получение с фильтрами
```javascript
const response = await fetch('/api/admin/promocodes?page=1&limit=10&status=active&search=SUMMER');
const data = await response.json();
```

### Экспорт в CSV
```javascript
const response = await fetch('/api/admin/promocodes/export?format=csv&status=active');
const blob = await response.blob();
// Скачивание файла
```

## Безопасность

- Все API endpoints требуют авторизации
- Валидация входных данных
- Проверка уникальности кодов
- Защита от удаления использованных промокодов

## Мониторинг

- Логирование всех операций
- Отслеживание использования
- Статистика по месяцам
- Алерты о истекающих промокодах
