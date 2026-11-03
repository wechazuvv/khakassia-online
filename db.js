const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const dbPath = path.join(__dirname, 'chat.db');
const db = new DatabaseSync(dbPath);

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      avatar TEXT NOT NULL,
      city TEXT DEFAULT 'Абакан',
      bio TEXT DEFAULT '',
      status TEXT DEFAULT 'offline',
      status_text TEXT DEFAULT '',
      is_banned INTEGER DEFAULT 0,
      ban_reason TEXT DEFAULT '',
      is_verified INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT (datetime('now')),
      last_seen DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '☀️',
      is_private INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      channel_id INTEGER,
      receiver_id INTEGER,
      content TEXT,
      attachment_url TEXT,
      attachment_name TEXT,
      attachment_type TEXT,
      reply_to_id INTEGER,
      is_edited INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(message_id, user_id, emoji),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- POSTS (Публикации в ленту)
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      media_url TEXT,
      media_type TEXT,
      media_name TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- POST LIKES
    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- POST COMMENTS
    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    -- FRIENDS
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(user_id, friend_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id)
    );

    -- REPORTS & MODERATION (Жалобы на мошенников и спам)
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      target_type TEXT NOT NULL, -- 'post', 'comment', 'user', 'message'
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT DEFAULT '',
      status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES users(id)
    );

    -- POLLS (Опросы в публикациях)
    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      votes_count INTEGER DEFAULT 0,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(poll_id, user_id),
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- NOTIFICATIONS (Центр уведомлений: лайки, комментарии, друзья)
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      actor_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      target_type TEXT DEFAULT '',
      target_id INTEGER DEFAULT 0,
      content TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_direct ON messages(sender_id, receiver_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_post_comments ON post_comments(post_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_polls_post ON polls(post_id);
    CREATE INDEX IF NOT EXISTS idx_poll_options ON poll_options(poll_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
  `);

  // Migrations for users table
  const userColumns = [
    { name: 'city', def: "TEXT DEFAULT 'Абакан'" },
    { name: 'is_banned', def: "INTEGER DEFAULT 0" },
    { name: 'ban_reason', def: "TEXT DEFAULT ''" },
    { name: 'is_verified', def: "INTEGER DEFAULT 0" },
    { name: 'role', def: "TEXT DEFAULT 'user'" },
    { name: 'banner', def: "TEXT DEFAULT ''" },
    { name: 'favorite_place', def: "TEXT DEFAULT ''" },
    { name: 'telegram', def: "TEXT DEFAULT ''" },
    { name: 'birth_date', def: "TEXT DEFAULT ''" },
    { name: 'is_private', def: "INTEGER DEFAULT 0" },
    { name: 'profile_music', def: "TEXT DEFAULT ''" },
    { name: 'cover_position', def: "TEXT DEFAULT 'center 25%'" }
  ];

  for (const col of userColumns) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
    } catch (e) {}
  }

  // Migrations for posts table (pinned posts and location)
  const postColumns = [
    { name: 'is_pinned', def: "INTEGER DEFAULT 0" },
    { name: 'location', def: "TEXT DEFAULT ''" }
  ];
  for (const col of postColumns) {
    try {
      db.exec(`ALTER TABLE posts ADD COLUMN ${col.name} ${col.def}`);
    } catch (e) {}
  }

  // Migrations for channels table (pinned message and created_by)
  try {
    db.exec(`ALTER TABLE channels ADD COLUMN pinned_message_id INTEGER DEFAULT NULL`);
  } catch (e) {}

  // Migrations for messages table (is_read column for unread DM counters)
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read)`);
  } catch (e) {}

  // Create tracks and user_saved_tracks tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      duration TEXT DEFAULT '03:15',
      cover_url TEXT DEFAULT '',
      genre TEXT DEFAULT 'Хакасия & Сибирь',
      plays_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_saved_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(user_id, track_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      blocked_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(user_id, blocked_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.exec("PRAGMA journal_mode = WAL;");
  } catch (e) {}

  // Миграция: поле номера телефона для регистрации
  try {
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT;");
  } catch (e) {}

  // Очистка кодировки и устаревших статусов
  try {
    db.prepare("UPDATE users SET display_name = 'Алиса' WHERE username = 'alice' AND display_name LIKE '%?%'").run();
    db.prepare("UPDATE users SET display_name = 'Боб' WHERE username = 'bob' AND display_name LIKE '%?%'").run();
    db.prepare("UPDATE users SET status_text = 'В сообществе с 3 ноября 2026' WHERE status_text = 'Только что присоединился' OR status_text = ''").run();
  } catch (e) {}

  // Ensure default channels exist
  const generalChannel = db.prepare('SELECT id FROM channels WHERE slug = ?').get('general');
  if (!generalChannel) {
    db.prepare(`
      INSERT INTO channels (slug, name, description, icon) 
      VALUES ('general', 'Общий чат Хакасии', 'Главная беседка для общения всех жителей и гостей республики', '☀️')
    `).run();
  }

  // Ensure initial starter music tracks exist (cleaned as requested: user searches for any song)
  db.prepare('DELETE FROM user_saved_tracks WHERE track_id NOT IN (SELECT id FROM tracks)').run();

  // Ensure official verified admin account: "khakassia"
  let guideUser = db.prepare('SELECT id FROM users WHERE username = ?').get('khakassia');
  if (!guideUser) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('khakassia2026', salt, 64).toString('hex');
    const ins = db.prepare(`
      INSERT INTO users (username, display_name, password_hash, salt, avatar, city, bio, is_verified, role, status, status_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'admin', 'online', ?)
    `).run(
      'khakassia',
      'Солнечная Хакасия ☀️',
      hash,
      salt,
      '/images/khakassia-banner.jpg',
      'Абакан',
      'Официальный портал Республики Хакасия. Земля, люди, история, будущее. Край великой степи и гор.',
      'Официальный аккаунт портала'
    );
    guideUser = { id: ins.lastInsertRowid };
  } else {
    // Ensure verified and admin
    db.prepare("UPDATE users SET is_verified = 1, role = 'admin' WHERE id = ?").run(guideUser.id);
  }

  // Ensure admin account: "wechazuv"
  db.prepare("UPDATE users SET is_verified = 1, role = 'admin' WHERE username = 'wechazuv'").run();

  // Seed default posts if empty
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  if (postCount === 0 && guideUser) {
    const p1 = db.prepare(`
      INSERT INTO posts (author_id, content, media_url, media_type, media_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      guideUser.id,
      '🏔️ **ХАКАСИЯ — КРАЙ ВЕЛИКОЙ СТЕПИ И ГОР**\n\nЗемля • Люди • История • Будущее.\n\nПриветствуем всех жителей и гостей республики на нашем портале **«Солнечная Хакасия»**! Здесь можно делиться новостями своего города или аала, выкладывать фото и видео живописных мест, знакомиться, находить друзей и общаться в общем чате. Рассказывайте, из какого вы уголка Хакасии!',
      '/images/khakassia-banner.jpg',
      'image',
      'Хакасия — край степей и гор'
    );

    const p1Id = p1.lastInsertRowid;
    db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(p1Id, guideUser.id);
  }
}

initDatabase();

module.exports = db;
