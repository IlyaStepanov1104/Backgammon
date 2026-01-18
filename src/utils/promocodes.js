// Утилиты для работы с промокодами

/**
 * Генерирует случайный промокод
 * @param {Object} options - Опции генерации
 * @param {string} options.prefix - Префикс промокода
 * @param {number} options.length - Общая длина промокода
 * @param {boolean} options.includeNumbers - Включать ли цифры
 * @param {boolean} options.includeLetters - Включать ли буквы
 * @returns {string} Сгенерированный промокод
 */
export function generatePromocode(options = {}) {
  const {
    prefix = 'PROMO',
    length = 12,
    includeNumbers = true,
    includeLetters = true
  } = options;

  let chars = '';
  if (includeLetters) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeNumbers) chars += '0123456789';

  if (chars.length === 0) {
    throw new Error('At least one character type must be enabled');
  }

  let code = prefix;
  const remainingLength = length - prefix.length;

  if (remainingLength < 0) {
    throw new Error('Prefix length cannot exceed total length');
  }

  for (let i = 0; i < remainingLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

/**
 * Валидирует формат промокода
 * @param {string} code - Промокод для проверки
 * @param {Object} options - Опции валидации
 * @returns {Object} Результат валидации
 */
export function validatePromocodeFormat(code, options = {}) {
  const {
    minLength = 6,
    maxLength = 20,
    allowLowercase = false,
    allowSpecialChars = false
  } = options;

  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      error: 'Code must be a non-empty string'
    };
  }

  if (code.length < minLength || code.length > maxLength) {
    return {
      valid: false,
      error: `Code length must be between ${minLength} and ${maxLength} characters`
    };
  }

  let regex = '^[A-Z0-9';
  if (allowLowercase) regex += 'a-z';
  if (allowSpecialChars) regex += '!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?';
  regex += `]{${minLength},${maxLength}}$`;

  const isValid = new RegExp(regex).test(code);

  return {
    valid: isValid,
    error: isValid ? null : 'Code contains invalid characters'
  };
}

/**
 * Форматирует промокод для отображения
 * @param {string} code - Промокод
 * @param {Object} options - Опции форматирования
 * @returns {string} Отформатированный промокод
 */
export function formatPromocode(code, options = {}) {
  const {
    separator = '-',
    groupSize = 4,
    uppercase = true
  } = options;

  if (!code) return '';

  let formatted = uppercase ? code.toUpperCase() : code;

  if (separator && groupSize > 0) {
    const groups = [];
    for (let i = 0; i < formatted.length; i += groupSize) {
      groups.push(formatted.slice(i, i + groupSize));
    }
    formatted = groups.join(separator);
  }

  return formatted;
}

/**
 * Проверяет статус промокода
 * @param {Object} promocode - Объект промокода
 * @returns {Object} Статус промокода
 */
export function getPromocodeStatus(promocode) {
  if (!promocode) {
    return { status: 'unknown', label: 'Unknown', color: 'gray' };
  }

  const now = new Date();
  const expiresAt = promocode.expires_at ? new Date(promocode.expires_at) : null;

  // Проверяем активность
  if (!promocode.is_active) {
    return { status: 'inactive', label: 'Inactive', color: 'red' };
  }

  // Проверяем срок действия
  if (expiresAt && expiresAt < now) {
    return { status: 'expired', label: 'Expired', color: 'red' };
  }

  // Проверяем лимит использований
  if (promocode.current_uses >= promocode.max_uses) {
    return { status: 'used', label: 'Used Up', color: 'orange' };
  }

  // Проверяем, скоро ли истекает (7 дней)
  if (expiresAt) {
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7) {
      return { 
        status: 'expiring_soon', 
        label: `Expires in ${daysUntilExpiry} days`, 
        color: 'yellow' 
      };
    }
  }

  return { status: 'active', label: 'Active', color: 'green' };
}

/**
 * Рассчитывает процент использования промокода
 * @param {Object} promocode - Объект промокода
 * @returns {number} Процент использования (0-100)
 */
export function getPromocodeUsagePercentage(promocode) {
  if (!promocode || !promocode.max_uses || promocode.max_uses === 0) {
    return 0;
  }

  return Math.round((promocode.current_uses / promocode.max_uses) * 100);
}

/**
 * Получает оставшееся количество использований
 * @param {Object} promocode - Объект промокода
 * @returns {number} Оставшиеся использования
 */
export function getRemainingUses(promocode) {
  if (!promocode || !promocode.max_uses) {
    return 0;
  }

  return Math.max(0, promocode.max_uses - promocode.current_uses);
}

/**
 * Форматирует дату для отображения
 * @param {string|Date} date - Дата
 * @param {string} locale - Локаль (по умолчанию 'ru-RU')
 * @returns {string} Отформатированная дата
 */
export function formatDate(date, locale = 'ru-RU') {
  if (!date) return 'Never';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Получает время до истечения промокода
 * @param {string|Date} expiresAt - Дата истечения
 * @returns {Object} Время до истечения
 */
export function getTimeUntilExpiry(expiresAt) {
  if (!expiresAt) {
    return { expired: false, days: null, hours: null, minutes: null };
  }

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry - now;

  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { expired: false, days, hours, minutes };
}

/**
 * Создает объект для массового создания промокодов
 * @param {Object} template - Шаблон промокода
 * @param {number} count - Количество промокодов
 * @returns {Array} Массив объектов промокодов
 */
export function createPromocodeBatch(template, count) {
  const batch = [];
  
  for (let i = 0; i < count; i++) {
    const promocode = {
      code: generatePromocode(template),
      description: template.description || null,
      maxUses: template.maxUses || 1,
      cardIds: template.cardIds || [],
      expiresAt: template.expiresAt || null,
      isActive: template.isActive !== undefined ? template.isActive : true
    };
    
    batch.push(promocode);
  }
  
  return batch;
}
