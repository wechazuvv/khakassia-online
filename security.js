/**
 * SECURITY & ANTI-FRAUD MODULE (АНТИФРОД И ЗАЩИТА ОТ МОШЕННИКОВ)
 * Защита от спам-ботов, подбора паролей, фишинговых ссылок и мошенничества
 */

// 1. Известные паттерны мошенников (скам-фразы, финансовые пирамиды, фишинг)
const SCAM_PATTERNS = [
  /переведи\s+на\s+карту/i,
  /номер\s+карты.*(?:cvv|сvv|код)/i,
  /код\s+из\s+смс/i,
  /пароль\s+от\s+банка/i,
  /выплата\s+от\s+государства/i,
  /компенсаци[яи]\s+россиянам/i,
  /легкий\s+заработок/i,
  /заработок\s+от\s+\d+.*в\s+(?:день|час)/i,
  /казино.*выигрыш/i,
  /ставк[аи]\s+100%/i,
  /удвой\s+баланс/i,
  /бесплатные\s+деньги/i,
  /инвестируй\s+\d+.*получи/i,
  /опрос\s+с\s+оплатой/i,
  /скачать\s+взлом/i,
  /чит\s+на\s+деньги/i
];

// 2. Подозрительные сокращатели ссылок и фишинговые домены
const SUSPICIOUS_DOMAINS = [
  'bit.ly', 'tinyurl.com', 'is.gd', 'cutt.ly', 'shorte.st',
  'v.gd', 'clck.ru', 'free-money', 'fast-pay', 'crypto-bonus',
  't.me/crypt', 't.me/bonus', 't.me/money'
];

/**
 * Проверка текста на мошеннические паттерны
 * @param {string} text
 * @returns {{ isScam: boolean, reason: string|null }}
 */
function detectScam(text) {
  if (!text) return { isScam: false, reason: null };

  // Проверка по стоп-словам
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isScam: true,
        reason: 'Обнаружен подозрительный текст с признаками финансового мошенничества.'
      };
    }
  }

  // Проверка на фишинговые ссылки
  const lower = text.toLowerCase();
  for (const domain of SUSPICIOUS_DOMAINS) {
    if (lower.includes(domain)) {
      return {
        isScam: true,
        reason: 'Обнаружена потенциально опасная или фишинговая ссылка.'
      };
    }
  }

  return { isScam: false, reason: null };
}

/**
 * Встроенный Rate Limiter (Защита от перебора паролей и спам-флуда)
 */
class RateLimiter {
  constructor() {
    this.hits = new Map(); // key -> Array of timestamps
  }

  /**
   * Проверка лимита запросов
   * @param {string} key Уникальный ключ (IP или UserID)
   * @param {number} maxHits Максимум запросов
   * @param {number} windowMs Окно в миллисекундах
   * @returns {boolean} true если лимит не превышен
   */
  check(key, maxHits, windowMs) {
    const now = Date.now();
    let timestamps = this.hits.get(key) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= maxHits) {
      this.hits.set(key, timestamps);
      return false;
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return true;
  }

  // Очистка старых записей
  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.hits.entries()) {
      const active = timestamps.filter(t => now - t < 3600000);
      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, active);
      }
    }
  }
}

const limiter = new RateLimiter();
setInterval(() => limiter.cleanup(), 60000);

/**
 * Middleware для защиты от перебора паролей при входе
 */
function loginRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'ip';
  const username = (req.body.username || '').toLowerCase();
  const key = `login_${ip}_${username}`;

  // Максимум 7 попыток входа за 5 минут
  if (!limiter.check(key, 7, 5 * 60 * 1000)) {
    return res.status(429).json({
      error: 'Слишком много неверных попыток входа. В целях безопасности доступ временно ограничен на 5 минут.'
    });
  }
  next();
}

/**
 * Middleware для защиты от спам-публикаций
 */
function postRateLimit(req, res, next) {
  const userId = req.user ? req.user.id : (req.ip || 'ip');
  const key = `post_${userId}`;

  // Максимум 1 пост в 8 секунд
  if (!limiter.check(key, 1, 8 * 1000)) {
    return res.status(429).json({
      error: 'Пожалуйста, не публикуйте сообщения слишком часто. Подождите несколько секунд.'
    });
  }
  next();
}

/**
 * Middleware для защиты от спама в комментариях
 */
function commentRateLimit(req, res, next) {
  const userId = req.user ? req.user.id : (req.ip || 'ip');
  const key = `comment_${userId}`;

  // Максимум 1 комментарий в 4 секунды
  if (!limiter.check(key, 1, 4 * 1000)) {
    return res.status(429).json({
      error: 'Слишком быстрая отправка комментариев. Подождите пару секунд.'
    });
  }
  next();
}

/**
 * Проверка расширений загружаемых файлов
 */
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.webm', '.mov',
  '.mp3', '.ogg', '.wav', '.m4a'
]);

function isFileExtensionSafe(filename) {
  if (!filename) return false;
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ext = filename.substring(dotIndex).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

module.exports = {
  detectScam,
  loginRateLimit,
  postRateLimit,
  commentRateLimit,
  isFileExtensionSafe
};
