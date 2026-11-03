const crypto = require('node:crypto');
const db = require('./db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  
  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt);

  return token;
}

function getUserByToken(token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar, u.banner, u.city, u.bio, 
           u.favorite_place, u.telegram, u.birth_date, u.is_private, u.profile_music, u.cover_position,
           u.status, u.status_text, u.is_banned, u.ban_reason, u.is_verified, u.role,
           u.created_at, u.last_seen
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
  `).get(token);
  return row || null;
}

function deleteSession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Недействительная или истёкшая сессия' });
  }

  if (user.is_banned) {
    return res.status(403).json({
      error: `Ваш аккаунт заблокирован за мошенничество или нарушение правил сообщества. Причина: ${user.ban_reason || 'подозрительная активность'}`
    });
  }

  req.user = user;
  req.token = token;
  next();
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ разрешен только администраторам' });
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getUserByToken,
  deleteSession,
  authMiddleware,
  adminMiddleware
};
