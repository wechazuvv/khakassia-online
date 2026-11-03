const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const multer = require('multer');

const db = require('./db');
const {
  hashPassword,
  verifyPassword,
  createSession,
  getUserByToken,
  deleteSession,
  authMiddleware,
  adminMiddleware
} = require('./auth');

const {
  detectScam,
  loginRateLimit,
  postRateLimit,
  commentRateLimit,
  isFileExtensionSafe
} = require('./security');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Directories setup
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const avatarsDir = path.join(__dirname, 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

// Security HTTP Headers Middleware (защита от Clickjacking, MIME-Sniffing и XSS)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Multer storage with strict anti-malware file filter
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'avatar') {
      cb(null, avatarsDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    // Безопасность: запрет загрузки исполняемых файлов (.exe, .bat, .php, .sh, .js и т.д.)
    if (!isFileExtensionSafe(file.originalname)) {
      return cb(new Error('Недопустимый формат файла. Разрешены только изображения и видео!'));
    }
    cb(null, true);
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Helper: Format user object for public response
function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    display_name: u.display_name,
    avatar: u.avatar,
    banner: u.banner || '',
    city: u.city || 'Абакан',
    bio: u.bio || '',
    favorite_place: u.favorite_place || '',
    telegram: u.telegram || '',
    birth_date: u.birth_date || '',
    is_private: Boolean(u.is_private),
    profile_music: u.profile_music || '',
    cover_position: u.cover_position || 'center 25%',
    is_verified: Boolean(u.is_verified),
    is_banned: Boolean(u.is_banned),
    role: u.role || 'user',
    status: u.is_banned ? 'offline' : (u.status || 'offline'),
    status_text: u.is_banned ? '🚫 Заблокирован за нарушения' : (u.status_text || ''),
    created_at: u.created_at,
    last_seen: u.last_seen
  };
}

// ----------------- AUTH ROUTES -----------------
// 1. Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, display_name, avatar, city, bio } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 25) {
      return res.status(400).json({ error: 'Юзернейм (юз) должен быть от 3 до 25 символов' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Юз может содержать только латинские буквы, цифры и знак подчеркивания' });
    }

    // Защита от фейковых аккаунтов администрации
    const forbiddenUsernames = ['admin', 'administrator', 'moderator', 'support', 'khakassia_admin', 'official'];
    if (forbiddenUsernames.includes(cleanUsername)) {
      return res.status(400).json({ error: 'Этот юзернейм зарезервирован администрацией портала' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Пароль должен содержать не менее 4 символов' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким юзернеймом (@юз) уже зарегистрирован' });
    }

    const { hash, salt } = hashPassword(password);
    const chosenDisplayName = (display_name && display_name.trim()) || username;
    const chosenAvatar = avatar || 'preset:cat';
    const chosenCity = city ? city.trim() : 'Абакан';
    const chosenBio = bio ? bio.trim() : 'Житель прекрасной Солнечной Хакасии ☀️';

    const insert = db.prepare(`
      INSERT INTO users (username, display_name, password_hash, salt, avatar, city, bio, is_verified, role, status, status_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'user', 'online', 'В сети • Солнечная Хакасия')
    `).run(cleanUsername, chosenDisplayName, hash, salt, chosenAvatar, chosenCity, chosenBio);

    const userId = insert.lastInsertRowid;
    const token = createSession(userId);
    const user = getUserByToken(token);

    broadcastAll({
      type: 'user_registered',
      user: sanitizeUser(user)
    });

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// 2. Login (с защитой от подбора паролей Rate Limiter)
app.post('/api/auth/login', loginRateLimit, (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const userRow = db.prepare(`SELECT * FROM users WHERE username = ?`).get(cleanUsername);

    if (!userRow) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    if (userRow.is_banned) {
      return res.status(403).json({
        error: `Ваш аккаунт заблокирован за мошенничество или нарушение правил. Причина: ${userRow.ban_reason || 'подозрительная активность'}`
      });
    }

    const valid = verifyPassword(password, userRow.password_hash, userRow.salt);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = createSession(userRow.id);
    const user = getUserByToken(token);

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// 3. Current User
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// 4. Logout
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  deleteSession(req.token);
  res.json({ success: true });
});

// 5. Upload Custom Avatar
app.post('/api/upload-avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл аватарки не был передан' });
  }
  const avatarUrl = '/uploads/avatars/' + req.file.filename;

  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, req.user.id);
  const updatedUser = getUserByToken(req.token);

  broadcastAll({
    type: 'user_profile_updated',
    user: sanitizeUser(updatedUser)
  });

  res.json({ avatar: avatarUrl, user: sanitizeUser(updatedUser) });
});

// 5b. Upload Custom Profile Banner (обычное фото или GIF)
app.post('/api/upload-banner', authMiddleware, upload.single('banner'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл обложки не был передан' });
  }
  const bannerUrl = '/uploads/' + req.file.filename;

  db.prepare('UPDATE users SET banner = ? WHERE id = ?').run(bannerUrl, req.user.id);
  const updatedUser = getUserByToken(req.token);

  broadcastAll({
    type: 'user_profile_updated',
    user: sanitizeUser(updatedUser)
  });

  res.json({ banner: bannerUrl, user: sanitizeUser(updatedUser) });
});

// 6. Update Profile (расширенные возможности редактирования)
app.put('/api/users/profile', authMiddleware, (req, res) => {
  try {
    const { 
      display_name, city, bio, avatar, banner, status, status_text, 
      favorite_place, telegram, birth_date, is_private, profile_music, cover_position 
    } = req.body;
    const current = req.user;

    const newDisplayName = display_name !== undefined ? display_name.trim() : current.display_name;
    const newCity = city !== undefined ? city.trim() : (current.city || 'Абакан');
    const newBio = bio !== undefined ? bio.trim() : current.bio;
    const newAvatar = avatar || current.avatar;
    const newBanner = banner !== undefined ? banner : (current.banner || '');
    const newStatus = status || current.status;
    const newStatusText = status_text !== undefined ? status_text.trim() : current.status_text;
    const newFavoritePlace = favorite_place !== undefined ? favorite_place.trim() : (current.favorite_place || '');
    const newTelegram = telegram !== undefined ? telegram.trim().replace(/^@/, '') : (current.telegram || '');
    const newBirthDate = birth_date !== undefined ? birth_date.trim() : (current.birth_date || '');
    const newIsPrivate = is_private !== undefined ? (is_private ? 1 : 0) : (current.is_private ? 1 : 0);
    const newProfileMusic = profile_music !== undefined ? profile_music : (current.profile_music || '');
    const newCoverPosition = cover_position !== undefined ? cover_position : (current.cover_position || 'center 25%');

    db.prepare(`
      UPDATE users 
      SET display_name = ?, city = ?, bio = ?, avatar = ?, banner = ?, status = ?, status_text = ?,
          favorite_place = ?, telegram = ?, birth_date = ?, is_private = ?, profile_music = ?, cover_position = ?
      WHERE id = ?
    `).run(newDisplayName, newCity, newBio, newAvatar, newBanner, newStatus, newStatusText, 
           newFavoritePlace, newTelegram, newBirthDate, newIsPrivate, newProfileMusic, newCoverPosition, current.id);

    const updatedUser = getUserByToken(req.token);

    broadcastAll({
      type: 'user_profile_updated',
      user: sanitizeUser(updatedUser)
    });

    res.json({ user: sanitizeUser(updatedUser) });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

// 7. Get User Profile by ID or Username (Юз)
app.get('/api/users/:identifier', authMiddleware, (req, res) => {
  try {
    const ident = req.params.identifier;
    let user = null;

    if (/^\d+$/.test(ident)) {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(ident));
    } else {
      user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(ident.replace(/^@/, ''));
    }

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ?').get(user.id).count;
    const friendsCount = db.prepare(`
      SELECT COUNT(*) as count FROM friends 
      WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
    `).get(user.id, user.id).count;
    const tracksCount = db.prepare('SELECT COUNT(*) as count FROM user_saved_tracks WHERE user_id = ?').get(user.id).count;

    let friendshipStatus = 'none';
    let friendshipId = null;

    if (user.id === req.user.id) {
      friendshipStatus = 'self';
    } else {
      const rel = db.prepare(`
        SELECT id, user_id, friend_id, status FROM friends
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `).get(req.user.id, user.id, user.id, req.user.id);

      if (rel) {
        friendshipId = rel.id;
        if (rel.status === 'accepted') {
          friendshipStatus = 'friends';
        } else if (rel.user_id === req.user.id) {
          friendshipStatus = 'pending_sent';
        } else {
          friendshipStatus = 'pending_received';
        }
      }
    }

    const isBlocked = Boolean(db.prepare('SELECT id FROM user_blocks WHERE user_id = ? AND blocked_id = ?').get(req.user.id, user.id));
    const isPrivateLocked = Boolean(user.is_private) && user.id !== req.user.id && friendshipStatus !== 'friends' && req.user.role !== 'admin';

    res.json({
      user: sanitizeUser(user),
      stats: { postsCount, friendsCount, tracksCount },
      friendship: { status: friendshipStatus, id: friendshipId },
      isBlocked,
      isPrivateLocked
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// 8. Get All Users (Жители Хакасии)
app.get('/api/users', authMiddleware, (req, res) => {
  const query = (req.query.q || '').trim();
  const myId = req.user.id;
  let users = [];

  if (query) {
    users = db.prepare(`
      SELECT * FROM users
      WHERE is_banned = 0 
        AND id != ?
        AND id NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?)
        AND (username LIKE ? OR display_name LIKE ? OR city LIKE ?)
      ORDER BY is_verified DESC, CASE WHEN status = 'online' THEN 1 ELSE 2 END, display_name ASC
      LIMIT 50
    `).all(myId, myId, `%${query}%`, `%${query}%`, `%${query}%`);
  } else {
    users = db.prepare(`
      SELECT * FROM users
      WHERE is_banned = 0 
        AND id != ?
        AND id NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?)
      ORDER BY is_verified DESC, CASE WHEN status = 'online' THEN 1 ELSE 2 END, id ASC
      LIMIT 100
    `).all(myId, myId);
  }

  res.json({ users: users.map(sanitizeUser) });
});

// 8b. Block / Unblock User
app.post('/api/users/:id/block', authMiddleware, (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (!targetId || targetId === req.user.id) {
      return res.status(400).json({ error: 'Некорректный пользователь' });
    }
    db.prepare('INSERT OR IGNORE INTO user_blocks (user_id, blocked_id) VALUES (?, ?)').run(req.user.id, targetId);
    db.prepare(`
      DELETE FROM friends 
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).run(req.user.id, targetId, targetId, req.user.id);

    res.json({ success: true, message: 'Пользователь добавлен в чёрный список' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка блокировки' });
  }
});

app.post('/api/users/:id/unblock', authMiddleware, (req, res) => {
  try {
    const targetId = Number(req.params.id);
    db.prepare('DELETE FROM user_blocks WHERE user_id = ? AND blocked_id = ?').run(req.user.id, targetId);
    res.json({ success: true, message: 'Пользователь разблокирован' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка разблокировки' });
  }
});

// ----------------- NOTIFICATIONS & POLLS HELPERS -----------------
function createNotification(userId, actorId, type, targetType = '', targetId = 0, content = '') {
  if (!userId || !actorId || userId === actorId) return;
  try {
    const ins = db.prepare(`
      INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, actorId, type, targetType, targetId, content);

    const notification = db.prepare(`
      SELECT n.*,
             u.username as actor_username,
             u.display_name as actor_display_name,
             u.avatar as actor_avatar
      FROM notifications n
      JOIN users u ON n.actor_id = u.id
      WHERE n.id = ?
    `).get(ins.lastInsertRowid);

    sendToUser(userId, {
      type: 'new_notification',
      notification
    });
  } catch (e) {
    console.error('Notification error:', e);
  }
}

function getPollForPost(postId, currentUserId = 0) {
  const poll = db.prepare('SELECT * FROM polls WHERE post_id = ?').get(postId);
  if (!poll) return null;

  const options = db.prepare('SELECT id, text, votes_count FROM poll_options WHERE poll_id = ?').all(poll.id);
  const totalVotes = options.reduce((sum, opt) => sum + opt.votes_count, 0);

  const userVote = currentUserId ? db.prepare('SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(poll.id, currentUserId) : null;

  return {
    id: poll.id,
    question: poll.question,
    total_votes: totalVotes,
    user_voted_option_id: userVote ? userVote.option_id : null,
    options: options.map(opt => ({
      id: opt.id,
      text: opt.text,
      votes_count: opt.votes_count,
      percentage: totalVotes > 0 ? Math.round((opt.votes_count / totalVotes) * 100) : 0
    }))
  };
}

// ----------------- POSTS & FEED ROUTES -----------------
function getPostById(postId, currentUserId = 0) {
  const post = db.prepare(`
    SELECT p.*,
           u.username as author_username,
           u.display_name as author_display_name,
           u.avatar as author_avatar,
           u.city as author_city,
           u.is_verified as author_is_verified,
           (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
           (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count,
           EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_has_liked
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.id = ?
  `).get(currentUserId, postId);

  if (!post) return null;

  post.is_pinned = Boolean(post.is_pinned);
  post.location = post.location || '';
  post.poll = getPollForPost(postId, currentUserId);

  const comments = db.prepare(`
    SELECT c.*,
           u.username as author_username,
           u.display_name as author_display_name,
           u.avatar as author_avatar,
           u.is_verified as author_is_verified
    FROM post_comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(postId);

  post.comments = comments;
  post.user_has_liked = Boolean(post.user_has_liked);
  post.author_is_verified = Boolean(post.author_is_verified);
  return post;
}

// 1. Get Feed Posts (с фильтром, поиском, хэштегами, опросами и закреплением)
app.get('/api/posts', authMiddleware, (req, res) => {
  try {
    const authorId = req.query.authorId ? Number(req.query.authorId) : null;
    const myId = req.user.id;
    const search = req.query.search ? req.query.search.trim() : null;
    const tag = req.query.tag ? req.query.tag.trim() : null;
    const location = req.query.location ? req.query.location.trim() : null;

    if (authorId && authorId !== myId && req.user.role !== 'admin') {
      const author = db.prepare('SELECT is_private FROM users WHERE id = ?').get(authorId);
      if (author && author.is_private) {
        const isFriend = db.prepare(`
          SELECT id FROM friends 
          WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 'accepted'
        `).get(myId, authorId, authorId, myId);
        if (!isFriend) {
          return res.json({ posts: [], locked: true });
        }
      }
    }

    let query = `
      SELECT p.*,
             u.username as author_username,
             u.display_name as author_display_name,
             u.avatar as author_avatar,
             u.city as author_city,
             u.is_verified as author_is_verified,
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count,
             EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_has_liked
      FROM posts p
      JOIN users u ON p.author_id = u.id
    `;

    const params = [myId];
    const where = ['u.is_banned = 0'];

    where.push('p.author_id NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?)');
    params.push(myId);

    if (authorId) {
      where.push('p.author_id = ?');
      params.push(authorId);
    }
    if (search) {
      where.push('(p.content LIKE ? OR u.display_name LIKE ? OR u.username LIKE ? OR p.location LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (tag) {
      where.push('p.content LIKE ?');
      params.push(`%#${tag}%`);
    }
    if (location) {
      where.push('(p.location LIKE ? OR u.city LIKE ? OR p.content LIKE ?)');
      const cleanLoc = location.replace(/^(г\.|с\.|пгт\.|город|село)\s*/i, '').trim();
      params.push(`%${cleanLoc}%`, `%${cleanLoc}%`, `%${cleanLoc}%`);
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }

    query += ' ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 60';

    const posts = db.prepare(query).all(...params);

    for (const post of posts) {
      post.user_has_liked = Boolean(post.user_has_liked);
      post.author_is_verified = Boolean(post.author_is_verified);
      post.is_pinned = Boolean(post.is_pinned);
      post.location = post.location || '';
      post.poll = getPollForPost(post.id, myId);
      post.comments = db.prepare(`
        SELECT c.*,
               u.username as author_username,
               u.display_name as author_display_name,
               u.avatar as author_avatar,
               u.is_verified as author_is_verified
        FROM post_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `).all(post.id);
    }

    res.json({ posts });
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ error: 'Ошибка получения публикаций' });
  }
});

// 2. Create Post (с опросом, локацией, антиспам и антифрод защитой)
app.post('/api/posts', authMiddleware, postRateLimit, (req, res) => {
  try {
    const { content, media_url, media_type, media_name, location, poll } = req.body;
    if (!content && !media_url && (!poll || !poll.question)) {
      return res.status(400).json({ error: 'Пост должен содержать текст, фото, видео или опрос' });
    }

    // Антифрод-проверка
    const scamCheck = detectScam(content);
    if (scamCheck.isScam) {
      return res.status(400).json({
        error: `Публикация заблокирована системой безопасности: ${scamCheck.reason}`
      });
    }

    const insert = db.prepare(`
      INSERT INTO posts (author_id, content, media_url, media_type, media_name, location)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      (content || '').trim(),
      media_url || null,
      media_type || null,
      media_name || null,
      (location || '').trim()
    );

    const postId = insert.lastInsertRowid;

    // Создание опроса, если передан
    if (poll && poll.question && Array.isArray(poll.options) && poll.options.length >= 2) {
      const insPoll = db.prepare(`
        INSERT INTO polls (post_id, question) VALUES (?, ?)
      `).run(postId, poll.question.trim());
      const pollId = insPoll.lastInsertRowid;

      const insOpt = db.prepare(`INSERT INTO poll_options (poll_id, text) VALUES (?, ?)`);
      for (const optText of poll.options) {
        if (optText && optText.trim()) {
          insOpt.run(pollId, optText.trim());
        }
      }
    }

    const newPost = getPostById(postId, req.user.id);

    broadcastAll({
      type: 'new_post',
      post: newPost
    });

    res.json({ post: newPost });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Ошибка создания публикации' });
  }
});

// 3. Delete Post
app.delete('/api/posts/:id', authMiddleware, (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(postId);

  if (!post) {
    return res.status(404).json({ error: 'Пост не найден' });
  }
  if (post.author_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Вы можете удалять только свои публикации' });
  }

  // Удаляем опросы, лайки, комментарии
  const poll = db.prepare('SELECT id FROM polls WHERE post_id = ?').get(postId);
  if (poll) {
    db.prepare('DELETE FROM poll_votes WHERE poll_id = ?').run(poll.id);
    db.prepare('DELETE FROM poll_options WHERE poll_id = ?').run(poll.id);
    db.prepare('DELETE FROM polls WHERE id = ?').run(poll.id);
  }

  db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(postId);
  db.prepare('DELETE FROM post_comments WHERE post_id = ?').run(postId);
  db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

  broadcastAll({
    type: 'post_deleted',
    postId
  });

  res.json({ success: true });
});

// 4. Pin / Unpin Post (Закрепление поста администратором)
app.post('/api/posts/:id/pin', authMiddleware, adminMiddleware, (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare('SELECT is_pinned FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Пост не найден' });

  const newPinned = post.is_pinned ? 0 : 1;
  db.prepare('UPDATE posts SET is_pinned = ? WHERE id = ?').run(newPinned, postId);

  broadcastAll({
    type: 'post_pinned_updated',
    postId,
    isPinned: Boolean(newPinned)
  });

  res.json({ success: true, isPinned: Boolean(newPinned) });
});

// 5. Vote in Poll (Голосование в опросе)
app.post('/api/polls/:pollId/vote', authMiddleware, (req, res) => {
  try {
    const pollId = Number(req.params.pollId);
    const optionId = Number(req.body.optionId);
    const userId = req.user.id;

    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    if (!poll) return res.status(404).json({ error: 'Опрос не найден' });

    const opt = db.prepare('SELECT * FROM poll_options WHERE id = ? AND poll_id = ?').get(optionId, pollId);
    if (!opt) return res.status(404).json({ error: 'Вариант ответа не найден' });

    const existingVote = db.prepare('SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(pollId, userId);
    if (existingVote) {
      return res.status(400).json({ error: 'Вы уже голосовали в этом опросе' });
    }

    db.prepare('INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)').run(pollId, optionId, userId);
    db.prepare('UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = ?').run(optionId);

    const updatedPoll = getPollForPost(poll.post_id, userId);

    broadcastAll({
      type: 'poll_updated',
      postId: poll.post_id,
      poll: updatedPoll
    });

    res.json({ poll: updatedPoll });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Ошибка при голосовании' });
  }
});

// 6. Like / Unlike Post
app.post('/api/posts/:id/like', authMiddleware, (req, res) => {
  const postId = Number(req.params.id);
  const myId = req.user.id;

  const existing = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, myId);
  let liked = false;

  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE id = ?').run(existing.id);
    liked = false;
  } else {
    db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(postId, myId);
    liked = true;

    // Уведомление автору публикации
    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(postId);
    if (post && post.author_id !== myId) {
      createNotification(post.author_id, myId, 'like', 'post', postId, 'оценил(а) вашу публикацию');
    }
  }

  const likesCount = db.prepare('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?').get(postId).count;

  broadcastAll({
    type: 'post_like_updated',
    postId,
    likesCount,
    userId: myId,
    liked
  });

  res.json({ liked, likesCount });
});

// 7. Add Comment to Post (с защитой от спама и мошенничества)
app.post('/api/posts/:id/comments', authMiddleware, commentRateLimit, (req, res) => {
  try {
    const postId = Number(req.params.id);
    const content = (req.body.content || '').trim();

    if (!content) {
      return res.status(400).json({ error: 'Комментарий не может быть пустым' });
    }

    // Антифрод-проверка
    const scamCheck = detectScam(content);
    if (scamCheck.isScam) {
      return res.status(400).json({
        error: `Комментарий заблокирован системой безопасности: ${scamCheck.reason}`
      });
    }

    const ins = db.prepare(`
      INSERT INTO post_comments (post_id, author_id, content)
      VALUES (?, ?, ?)
    `).run(postId, req.user.id, content);

    const comment = db.prepare(`
      SELECT c.*,
             u.username as author_username,
             u.display_name as author_display_name,
             u.avatar as author_avatar,
             u.is_verified as author_is_verified
      FROM post_comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `).get(ins.lastInsertRowid);

    const commentsCount = db.prepare('SELECT COUNT(*) as count FROM post_comments WHERE post_id = ?').get(postId).count;

    // Уведомление автору публикации
    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(postId);
    if (post && post.author_id !== req.user.id) {
      createNotification(post.author_id, req.user.id, 'comment', 'post', postId, `оставил(а) комментарий: "${content.substring(0, 35)}..."`);
    }

    broadcastAll({
      type: 'new_post_comment',
      postId,
      comment,
      commentsCount
    });

    res.json({ comment, commentsCount });
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ error: 'Ошибка добавления комментария' });
  }
});

// 8. Delete Comment
app.delete('/api/comments/:id', authMiddleware, (req, res) => {
  const commentId = Number(req.params.id);
  const comment = db.prepare('SELECT author_id, post_id FROM post_comments WHERE id = ?').get(commentId);
  if (!comment) return res.status(404).json({ error: 'Комментарий не найден' });

  if (comment.author_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Нет прав на удаление комментария' });
  }

  db.prepare('DELETE FROM post_comments WHERE id = ?').run(commentId);
  const commentsCount = db.prepare('SELECT COUNT(*) as count FROM post_comments WHERE post_id = ?').get(comment.post_id).count;

  broadcastAll({
    type: 'comment_deleted',
    postId: comment.post_id,
    commentId,
    commentsCount
  });

  res.json({ success: true, commentId, postId: comment.post_id, commentsCount });
});

// ----------------- FRIENDS SYSTEM ROUTES -----------------
app.get('/api/friends', authMiddleware, (req, res) => {
  const myId = req.user.id;

  const acceptedFriends = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar, u.city, u.bio, u.status, u.status_text, u.is_verified, f.created_at as friendship_date
    FROM friends f
    JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
    ORDER BY u.status = 'online' DESC, u.display_name ASC
  `).all(myId, myId, myId);

  const incomingRequests = db.prepare(`
    SELECT f.id as request_id, u.id, u.username, u.display_name, u.avatar, u.city, u.is_verified, f.created_at
    FROM friends f
    JOIN users u ON f.user_id = u.id
    WHERE f.friend_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(myId);

  const outgoingRequests = db.prepare(`
    SELECT f.id as request_id, u.id, u.username, u.display_name, u.avatar, u.city, u.is_verified, f.created_at
    FROM friends f
    JOIN users u ON f.friend_id = u.id
    WHERE f.user_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(myId);

  res.json({
    friends: acceptedFriends.map(sanitizeUser),
    incoming: incomingRequests,
    outgoing: outgoingRequests
  });
});

app.get('/api/users/:id/friends', authMiddleware, (req, res) => {
  const targetId = Number(req.params.id);
  const friends = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar, u.city, u.bio, u.status, u.status_text, u.is_verified
    FROM friends f
    JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
    ORDER BY u.status = 'online' DESC, u.display_name ASC
  `).all(targetId, targetId, targetId);

  res.json({ friends: friends.map(sanitizeUser) });
});

app.post('/api/friends/request/:targetUserId', authMiddleware, (req, res) => {
  const myId = req.user.id;
  const targetId = Number(req.params.targetUserId);

  if (myId === targetId) {
    return res.status(400).json({ error: 'Нельзя добавить в друзья самого себя' });
  }

  const target = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(targetId);
  if (!target) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const existing = db.prepare(`
    SELECT * FROM friends 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(myId, targetId, targetId, myId);

  if (existing) {
    if (existing.status === 'accepted') {
      return res.json({ status: 'friends', message: 'Вы уже друзья' });
    }
    if (existing.user_id === targetId && existing.friend_id === myId) {
      db.prepare(`UPDATE friends SET status = 'accepted' WHERE id = ?`).run(existing.id);
      sendToUser(targetId, {
        type: 'friend_request_accepted',
        user: sanitizeUser(req.user)
      });
      createNotification(targetId, myId, 'friend_accept', 'user', myId, 'принял(а) вашу заявку в друзья');
      return res.json({ status: 'friends', message: 'Заявка принята, теперь вы друзья!' });
    }
    return res.json({ status: 'pending_sent', message: 'Заявка уже отправлена' });
  }

  const ins = db.prepare(`
    INSERT INTO friends (user_id, friend_id, status)
    VALUES (?, ?, 'pending')
  `).run(myId, targetId);

  sendToUser(targetId, {
    type: 'friend_request_received',
    requestId: ins.lastInsertRowid,
    fromUser: sanitizeUser(req.user)
  });

  createNotification(targetId, myId, 'friend_request', 'user', myId, 'отправил(а) вам заявку в друзья');

  res.json({ status: 'pending_sent', message: 'Заявка в друзья отправлена' });
});

app.post('/api/friends/accept/:requestId', authMiddleware, (req, res) => {
  const myId = req.user.id;
  const reqId = Number(req.params.requestId);

  const request = db.prepare('SELECT * FROM friends WHERE id = ? AND friend_id = ?').get(reqId, myId);
  if (!request) {
    return res.status(404).json({ error: 'Заявка не найдена' });
  }

  db.prepare(`UPDATE friends SET status = 'accepted' WHERE id = ?`).run(reqId);

  sendToUser(request.user_id, {
    type: 'friend_request_accepted',
    user: sanitizeUser(req.user)
  });

  createNotification(request.user_id, myId, 'friend_accept', 'user', myId, 'принял(а) вашу заявку в друзья');

  res.json({ status: 'friends', message: 'Заявка в друзья принята' });
});

app.delete('/api/friends/:targetUserId', authMiddleware, (req, res) => {
  const myId = req.user.id;
  const targetId = Number(req.params.targetUserId);

  db.prepare(`
    DELETE FROM friends 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).run(myId, targetId, targetId, myId);

  res.json({ status: 'none', message: 'Пользователь удален из друзей' });
});

// ----------------- NOTIFICATIONS API -----------------
app.get('/api/notifications', authMiddleware, (req, res) => {
  const list = db.prepare(`
    SELECT n.*,
           u.username as actor_username,
           u.display_name as actor_display_name,
           u.avatar as actor_avatar
    FROM notifications n
    JOIN users u ON n.actor_id = u.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 40
  `).all(req.user.id);

  const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).count;

  res.json({ notifications: list, unreadCount });
});

app.post('/api/notifications/read', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

// ----------------- REPORT & MODERATION (ЖАЛОБЫ НА МОШЕННИКОВ) -----------------
// 1. Подать жалобу на пользователя, публикацию или комментарий
app.post('/api/reports', authMiddleware, (req, res) => {
  try {
    const { target_type, target_id, reason, details } = req.body;
    if (!target_type || !target_id || !reason) {
      return res.status(400).json({ error: 'Заполните обязательные поля жалобы' });
    }

    db.prepare(`
      INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, target_type, Number(target_id), reason.trim(), (details || '').trim());

    res.json({ success: true, message: 'Спасибо! Жалоба отправлена на рассмотрение модераторам.' });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Не удалось отправить жалобу' });
  }
});

// 2. Список жалоб для модератора / администратора
app.get('/api/admin/reports', authMiddleware, adminMiddleware, (req, res) => {
  const reports = db.prepare(`
    SELECT r.*, u.username as reporter_username, u.display_name as reporter_name
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC
  `).all();
  res.json({ reports });
});

// 3. Блокировка мошенника администратором (Бан)
app.post('/api/admin/ban/:userId', authMiddleware, adminMiddleware, (req, res) => {
  const targetId = Number(req.params.userId);
  const reason = (req.body.reason || 'Мошенничество и нарушение правил').trim();

  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Нельзя заблокировать самого себя' });
  }

  // Обновляем статус пользователя
  db.prepare('UPDATE users SET is_banned = 1, ban_reason = ?, status = ? WHERE id = ?')
    .run(reason, 'offline', targetId);

  // Аннулируем все активные сессии мошенника
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);

  // Принудительно отключаем его WebSocket сокеты
  const sockets = userSockets.get(targetId);
  if (sockets) {
    for (const ws of sockets) {
      ws.send(JSON.stringify({
        type: 'account_banned',
        reason
      }));
      ws.close(1008, 'Заблокирован');
    }
    userSockets.delete(targetId);
  }

  broadcastAll({
    type: 'user_banned',
    userId: targetId,
    reason
  });

  res.json({ success: true, message: 'Пользователь успешно заблокирован за мошенничество.' });
});

// 4. Разблокировка пользователя
app.post('/api/admin/unban/:userId', authMiddleware, adminMiddleware, (req, res) => {
  const targetId = Number(req.params.userId);
  db.prepare('UPDATE users SET is_banned = 0, ban_reason = ? WHERE id = ?').run('', targetId);

  broadcastAll({
    type: 'user_unbanned',
    userId: targetId
  });

  res.json({ success: true, message: 'Пользователь разблокирован.' });
});

// 5. Выдать / снять отметку проверенного пользователя / официального лица
app.post('/api/admin/verify/:userId', authMiddleware, adminMiddleware, (req, res) => {
  const targetId = Number(req.params.userId);
  const user = db.prepare('SELECT is_verified FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const newVerified = user.is_verified ? 0 : 1;
  db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(newVerified, targetId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  broadcastAll({
    type: 'user_profile_updated',
    user: sanitizeUser(updated)
  });

  res.json({ success: true, is_verified: Boolean(newVerified), message: newVerified ? 'Отметка верификации выдана.' : 'Отметка верификации снята.' });
});

// 6. Назначить / снять права администратора
app.post('/api/admin/toggle-admin/:userId', authMiddleware, adminMiddleware, (req, res) => {
  const targetId = Number(req.params.userId);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Нельзя изменить права собственному аккаунту' });
  }

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const newRole = user.role === 'admin' ? 'user' : 'admin';
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, targetId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  broadcastAll({
    type: 'user_profile_updated',
    user: sanitizeUser(updated)
  });

  res.json({ success: true, role: newRole, message: `Роль изменена на ${newRole}` });
});

// 7. Список всех жителей для панели модератора
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const search = req.query.q ? `%${req.query.q.trim()}%` : '%';
  const users = db.prepare(`
    SELECT id, username, display_name, avatar, city, role, is_verified, is_banned, ban_reason, created_at, last_seen
    FROM users
    WHERE username LIKE ? OR display_name LIKE ?
    ORDER BY id DESC
    LIMIT 100
  `).all(search, search);
  res.json({ users: users.map(sanitizeUser) });
});

// 8. Статистика портала
app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const verifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 1').get().count;
  const bannedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 1').get().count;
  const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  const totalComments = db.prepare('SELECT COUNT(*) as count FROM post_comments').get().count;
  const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const pendingReports = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").get().count;

  res.json({
    totalUsers,
    verifiedUsers,
    bannedUsers,
    totalPosts,
    totalComments,
    totalMessages,
    pendingReports
  });
});

// 9. Удаление сообщения из чата администратором или автором
app.delete('/api/messages/:id', authMiddleware, (req, res) => {
  const messageId = Number(req.params.id);
  const msg = db.prepare('SELECT sender_id, channel_id, receiver_id FROM messages WHERE id = ?').get(messageId);
  if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });

  if (msg.sender_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Нет прав на удаление этого сообщения' });
  }

  db.prepare('DELETE FROM reactions WHERE message_id = ?').run(messageId);
  db.prepare('UPDATE channels SET pinned_message_id = NULL WHERE pinned_message_id = ?').run(messageId);
  db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);

  broadcastAll({
    type: 'message_deleted',
    messageId,
    channelId: msg.channel_id,
    receiverId: msg.receiver_id
  });

  res.json({ success: true, messageId });
});

// ----------------- FILE & AUDIO & VIDEO UPLOAD -----------------
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не был передан' });
  }

  const fileUrl = '/uploads/' + req.file.filename;
  const isVideo = req.file.mimetype.startsWith('video/');
  const isImage = req.file.mimetype.startsWith('image/');
  const isAudio = req.file.mimetype.startsWith('audio/') || 
                  req.file.originalname.endsWith('.webm') || 
                  req.file.originalname.endsWith('.ogg') || 
                  req.file.originalname.endsWith('.mp3') ||
                  req.file.originalname.endsWith('.wav');

  let type = 'file';
  if (isVideo) type = 'video';
  else if (isImage) type = 'image';
  else if (isAudio) type = 'audio';

  res.json({
    url: fileUrl,
    name: req.file.originalname,
    type,
    mime: req.file.mimetype,
    size: req.file.size
  });
});

// ----------------- CHANNELS & MESSAGES -----------------
app.get('/api/channels', authMiddleware, (req, res) => {
  const channels = db.prepare(`
    SELECT * FROM channels 
    ORDER BY CASE WHEN slug = 'general' THEN 1 ELSE 2 END, id ASC
  `).all();
  for (const ch of channels) {
    if (ch.pinned_message_id) {
      ch.pinned_message = db.prepare(`
        SELECT m.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `).get(ch.pinned_message_id);
    } else {
      ch.pinned_message = null;
    }
  }
  res.json({ channels });
});

// Создание своего чата / беседки
app.post('/api/channels', authMiddleware, (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Название беседки обязательно' });
    }
    const cleanName = name.trim();
    const cleanDesc = (description || '').trim();
    const cleanIcon = (icon || '💬').trim();
    const slug = 'chat-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const ins = db.prepare(`
      INSERT INTO channels (slug, name, description, icon)
      VALUES (?, ?, ?, ?)
    `).run(slug, cleanName, cleanDesc, cleanIcon);

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(ins.lastInsertRowid);
    channel.pinned_message = null;

    broadcastAll({
      type: 'new_channel',
      channel
    });

    res.json({ channel });
  } catch (err) {
    console.error('Create channel error:', err);
    res.status(500).json({ error: 'Ошибка создания чата' });
  }
});

// Закрепление сообщения в чате (Администратор/Создатель сайта)
app.post('/api/channels/:id/pin-message', authMiddleware, adminMiddleware, (req, res) => {
  const channelId = Number(req.params.id);
  const messageId = req.body.messageId ? Number(req.body.messageId) : null;

  db.prepare('UPDATE channels SET pinned_message_id = ? WHERE id = ?').run(messageId, channelId);

  let pinnedMessage = null;
  if (messageId) {
    pinnedMessage = db.prepare(`
      SELECT m.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(messageId);
  }

  broadcastAll({
    type: 'chat_message_pinned',
    channelId,
    pinnedMessage
  });

  res.json({ success: true, channelId, pinnedMessage });
});

app.get('/api/messages', authMiddleware, (req, res) => {
  try {
    const { channelId, dmUserId, beforeId, limit = 50 } = req.query;
    const fetchLimit = Math.min(Math.max(Number(limit) || 50, 10), 100);

    let messages = [];

    if (channelId) {
      messages = db.prepare(`
        SELECT m.*, 
               u.username as sender_username, 
               u.display_name as sender_display_name, 
               u.avatar as sender_avatar,
               u.is_verified as sender_is_verified,
               r.content as reply_content,
               ru.display_name as reply_sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN messages r ON m.reply_to_id = r.id
        LEFT JOIN users ru ON r.sender_id = ru.id
        WHERE m.channel_id = ?
        ORDER BY m.id DESC
        LIMIT ?
      `).all(channelId, fetchLimit);
    } else if (dmUserId) {
      const myId = req.user.id;
      const otherId = Number(dmUserId);

      messages = db.prepare(`
        SELECT m.*, 
               u.username as sender_username, 
               u.display_name as sender_display_name, 
               u.avatar as sender_avatar,
               u.is_verified as sender_is_verified,
               r.content as reply_content,
               ru.display_name as reply_sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN messages r ON m.reply_to_id = r.id
        LEFT JOIN users ru ON r.sender_id = ru.id
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
        ORDER BY m.id DESC
        LIMIT ?
      `).all(myId, otherId, otherId, myId, fetchLimit);
    }

    res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Ошибка получения сообщений' });
  }
});

// Список диалогов в ЛС
app.get('/api/conversations', authMiddleware, (req, res) => {
  try {
    const myId = req.user.id;
    const rows = db.prepare(`
      SELECT DISTINCT 
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id
      FROM messages
      WHERE (sender_id = ? AND receiver_id IS NOT NULL)
         OR (receiver_id = ? AND sender_id IS NOT NULL)
    `).all(myId, myId, myId);

    const userIds = rows.map(r => r.other_id).filter(id => id && id !== myId);
    if (userIds.length === 0) {
      return res.json({ conversations: [] });
    }

    const placeholders = userIds.map(() => '?').join(',');
    const users = db.prepare(`
      SELECT * FROM users 
      WHERE id IN (${placeholders}) AND is_banned = 0
    `).all(...userIds);

    res.json({ conversations: users.map(sanitizeUser) });
  } catch (err) {
    console.error('Fetch conversations error:', err);
    res.status(500).json({ error: 'Ошибка загрузки диалогов' });
  }
});

// ----------------- MUSIC ROUTES -----------------
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `track-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});
const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 35 * 1024 * 1024 }, // 35MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только аудиофайлы (MP3, WAV, OGG, M4A)'));
    }
  }
});

app.post('/api/music/upload', authMiddleware, audioUpload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Аудиофайл не выбран' });
    }
    const { title, artist, genre } = req.body;
    const cleanTitle = (title || req.file.originalname.replace(/\.[^/.]+$/, '')).trim();
    const cleanArtist = (artist || req.user.display_name || 'Музыкант Хакасии').trim();
    const cleanGenre = (genre || 'Хакасия & Сибирь').trim();
    const audioUrl = '/uploads/' + req.file.filename;

    const ins = db.prepare(`
      INSERT INTO tracks (user_id, title, artist, audio_url, genre, duration, cover_url)
      VALUES (?, ?, ?, ?, ?, '03:30', '/images/khakassia-banner.jpg')
    `).run(req.user.id, cleanTitle, cleanArtist, audioUrl, cleanGenre);

    const trackId = ins.lastInsertRowid;
    // Auto save track for creator
    db.prepare('INSERT OR IGNORE INTO user_saved_tracks (user_id, track_id) VALUES (?, ?)').run(req.user.id, trackId);

    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId);
    track.is_saved = true;

    broadcastAll({
      type: 'new_track',
      track
    });

    res.json({ track });
  } catch (err) {
    console.error('Upload track error:', err);
    res.status(500).json({ error: err.message || 'Ошибка загрузки трека' });
  }
});

app.get('/api/music', authMiddleware, (req, res) => {
  try {
    const { q, genre, mySaved } = req.query;
    const myId = req.user.id;

    let query = `
      SELECT t.*,
             EXISTS(SELECT 1 FROM user_saved_tracks WHERE user_id = ? AND track_id = t.id) as is_saved,
             u.display_name as uploader_name,
             u.username as uploader_username
      FROM tracks t
      JOIN users u ON t.user_id = u.id
    `;
    const params = [myId];
    const where = [];

    if (mySaved === '1' || mySaved === 'true') {
      where.push('t.id IN (SELECT track_id FROM user_saved_tracks WHERE user_id = ?)');
      params.push(myId);
    }
    if (genre && genre !== 'all' && genre !== 'Все') {
      where.push('t.genre = ?');
      params.push(genre.trim());
    }
    if (q && q.trim()) {
      where.push('(t.title LIKE ? OR t.artist LIKE ? OR t.genre LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }

    query += ' ORDER BY t.id DESC LIMIT 100';

    const tracks = db.prepare(query).all(...params);
    tracks.forEach(t => { t.is_saved = Boolean(t.is_saved); });

    res.json({ tracks });
  } catch (err) {
    console.error('Fetch music error:', err);
    res.status(500).json({ error: 'Ошибка получения музыки' });
  }
});

app.post('/api/music/:id/save', authMiddleware, (req, res) => {
  try {
    const trackId = Number(req.params.id);
    db.prepare('INSERT OR IGNORE INTO user_saved_tracks (user_id, track_id) VALUES (?, ?)').run(req.user.id, trackId);
    const count = db.prepare('SELECT COUNT(*) as count FROM user_saved_tracks WHERE user_id = ?').get(req.user.id).count;
    res.json({ success: true, saved: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сохранения трека' });
  }
});

app.delete('/api/music/:id/save', authMiddleware, (req, res) => {
  try {
    const trackId = Number(req.params.id);
    db.prepare('DELETE FROM user_saved_tracks WHERE user_id = ? AND track_id = ?').run(req.user.id, trackId);
    const count = db.prepare('SELECT COUNT(*) as count FROM user_saved_tracks WHERE user_id = ?').get(req.user.id).count;
    res.json({ success: true, saved: false, count });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления трека' });
  }
});

app.get('/api/users/:id/music', authMiddleware, (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'Пользователь не найден' });

    // Check privacy
    if (targetUser.is_private && targetUserId !== req.user.id && req.user.role !== 'admin') {
      const isFriend = db.prepare(`
        SELECT id FROM friends 
        WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 'accepted'
      `).get(req.user.id, targetUserId, targetUserId, req.user.id);
      if (!isFriend) {
        return res.json({ locked: true, tracks: [] });
      }
    }

    const tracks = db.prepare(`
      SELECT t.*,
             EXISTS(SELECT 1 FROM user_saved_tracks WHERE user_id = ? AND track_id = t.id) as is_saved
      FROM user_saved_tracks ust
      JOIN tracks t ON ust.track_id = t.id
      WHERE ust.user_id = ?
      ORDER BY ust.id DESC
    `).all(req.user.id, targetUserId);

    tracks.forEach(t => { t.is_saved = Boolean(t.is_saved); });

    res.json({ locked: false, tracks });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения треков пользователя' });
  }
});

app.post('/api/users/profile-music', authMiddleware, (req, res) => {
  try {
    const { profile_music } = req.body;
    db.prepare('UPDATE users SET profile_music = ? WHERE id = ?').run(profile_music || '', req.user.id);
    const updatedUser = getUserByToken(req.token);
    broadcastAll({
      type: 'user_profile_updated',
      user: sanitizeUser(updatedUser)
    });
    res.json({ success: true, profile_music, user: sanitizeUser(updatedUser) });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сохранения музыки профиля' });
  }
});

app.post('/api/users/cover-position', authMiddleware, (req, res) => {
  try {
    const { cover_position } = req.body;
    const cleanPos = (cover_position || 'center 25%').trim();
    db.prepare('UPDATE users SET cover_position = ? WHERE id = ?').run(cleanPos, req.user.id);
    const updatedUser = getUserByToken(req.token);
    broadcastAll({
      type: 'user_profile_updated',
      user: sanitizeUser(updatedUser)
    });
    res.json({ success: true, cover_position: cleanPos, user: sanitizeUser(updatedUser) });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сохранения положения обложки' });
  }
});

// ----------------- WEBSOCKET REALTIME ENGINE -----------------
const clients = new Map();
const userSockets = new Map();

function broadcastAll(data) {
  const payload = JSON.stringify(data);
  for (const [ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function sendToUser(userId, data) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(data);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  let currentUser = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      if (data.type === 'auth') {
        const user = getUserByToken(data.token);
        if (!user || user.is_banned) {
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Доступ заблокирован' }));
          ws.close();
          return;
        }

        currentUser = user;
        clients.set(ws, { user });

        if (!userSockets.has(user.id)) {
          userSockets.set(user.id, new Set());
        }
        userSockets.get(user.id).add(ws);

        db.prepare("UPDATE users SET status = 'online', last_seen = datetime('now') WHERE id = ?").run(user.id);

        const onlineUserIds = Array.from(userSockets.keys());
        ws.send(JSON.stringify({
          type: 'auth_success',
          user: sanitizeUser(user),
          onlineUserIds
        }));

        broadcastAll({
          type: 'user_presence',
          userId: user.id,
          status: 'online'
        });
        return;
      }

      if (!currentUser || currentUser.is_banned) return;

      if (data.type === 'send_message') {
        const { channelId, receiverId, content, attachment, replyToId } = data;
        if (!content && !attachment) return;

        const cleanContent = content ? content.trim() : '';

        // Антифрод проверка сообщений чата
        const scamCheck = detectScam(cleanContent);
        if (scamCheck.isScam) {
          ws.send(JSON.stringify({
            type: 'system_alert',
            message: `⚠️ Сообщение отклонено: ${scamCheck.reason}`
          }));
          return;
        }

        const attUrl = attachment ? attachment.url : null;
        const attName = attachment ? attachment.name : null;
        const attType = attachment ? attachment.type : null;
        const targetChannel = channelId ? Number(channelId) : null;
        const targetReceiver = receiverId ? Number(receiverId) : null;

        const insert = db.prepare(`
          INSERT INTO messages (sender_id, channel_id, receiver_id, content, attachment_url, attachment_name, attachment_type, reply_to_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(currentUser.id, targetChannel, targetReceiver, cleanContent, attUrl, attName, attType, replyToId || null);

        const newMsg = db.prepare(`
          SELECT m.*, 
                 u.username as sender_username, 
                 u.display_name as sender_display_name, 
                 u.avatar as sender_avatar,
                 u.is_verified as sender_is_verified
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `).get(insert.lastInsertRowid);

        if (targetChannel) {
          broadcastAll({ type: 'new_message', message: newMsg });
        } else if (targetReceiver) {
          sendToUser(currentUser.id, { type: 'new_message', message: newMsg });
          sendToUser(targetReceiver, { type: 'new_message', message: newMsg });
        }
      }

    } catch (err) {
      console.error('WS error:', err);
    }
  });

  ws.on('close', () => {
    if (currentUser) {
      const sockets = userSockets.get(currentUser.id);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          userSockets.delete(currentUser.id);
          setTimeout(() => {
            if (!userSockets.has(currentUser.id)) {
              db.prepare("UPDATE users SET status = 'offline', last_seen = datetime('now') WHERE id = ?").run(currentUser.id);
              broadcastAll({
                type: 'user_presence',
                userId: currentUser.id,
                status: 'offline'
              });
            }
          }, 3000);
        }
      }
      clients.delete(ws);
    }
  });
});

// Fallback to index.html for SPA routes (e.g. /u/:username, /chat, /friends, /feed)
app.use((req, res) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8'));
  }
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Listeners
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n===============================================================`);
  console.log(`🌐  Хакасия Онлайн — Портал и Социальная Сеть`);
  console.log(`🛡️  Комплексная защита от мошенников (Антифрод, Rate Limit, Бан) активна!`);
  console.log(`💻  Локальный адрес с ПК:        http://localhost:${PORT}`);
  console.log(`🌄  Доменный адрес:              http://khakassia-online.ru`);
  console.log(`📶  Доступ с телефона по Wi-Fi:  http://192.168.0.12`);
  console.log(`===============================================================\n`);
});

if (PORT !== 80 && !process.env.RENDER) {
  try {
    const server80 = http.createServer(app);
    server80.on('upgrade', (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });
    server80.listen(80, '0.0.0.0', () => {
      console.log(`🌟  Сайт открывается без указания порта: http://khakassia-online.ru (и http://192.168.0.12)\n`);
    }).on('error', () => {});
  } catch (e) {}
}
