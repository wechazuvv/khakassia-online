/**
 * СОЛНЕЧНАЯ ХАКАСИЯ — sunny-khakassia.ru
 * Главный клиентский скрипт с защитой от мошенников и антифродом
 */

const AVATAR_MAP = {
  'preset:cat': '🐱',
  'preset:fox': '🦊',
  'preset:wolf': '🐺',
  'preset:sparkles': '✨',
  'preset:rocket': '🚀',
  'preset:ninja': '🥷',
  'preset:wizard': '🧙‍♂️',
  'preset:robot': '🤖',
  'preset:bot': '🤖'
};

class SunnyKhakassiaApp {
  constructor() {
    this.token = localStorage.getItem('pulse_token') || null;
    this.currentUser = null;
    this.currentTab = 'feed';
    this.activeProfileUser = null;

    // Chat state
    this.currentChatChannelId = 1;
    this.currentChatDmUserId = null;
    this.chatMessages = [];
    this.pendingChatAttachment = null;
    this.replyingTo = null;
    this.chatUnreadTotal = 0;

    // Post creation state
    this.pendingPostMedia = null;

    this.ws = null;
    this.reconnectInterval = null;
    this.wsPingInterval = null;

    this.cacheDOM();
    this.bindEvents();
    this.initTheme();
    this.initApp();
  }

  cacheDOM() {
    // Tabs & Nav
    this.navBrandBtn = document.getElementById('navBrandBtn');
    this.tabBtns = document.querySelectorAll('.nav-tab');
    this.tabViews = document.querySelectorAll('.tab-view');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.userPillBtn = document.getElementById('userPillBtn');
    this.btnLogout = document.getElementById('btnLogout');
    this.navUserAvatar = document.getElementById('navUserAvatar');
    this.navUserName = document.getElementById('navUserName');
    this.navUserHandle = document.getElementById('navUserHandle');
    this.friendsRequestsBadge = document.getElementById('friendsRequestsBadge');
    this.chatUnreadBadge = document.getElementById('chatUnreadBadge');
    this.toastContainer = document.getElementById('toastContainer');
    this.btnOpenModeration = document.getElementById('btnOpenModeration');

    // Notifications DOM
    this.btnNotifications = document.getElementById('btnNotifications');
    this.notificationsBadge = document.getElementById('notificationsBadge');
    this.notificationsDropdown = document.getElementById('notificationsDropdown');
    this.notificationsList = document.getElementById('notificationsList');
    this.btnMarkAllRead = document.getElementById('btnMarkAllRead');

    // Music Tab & Global Sticky Player DOM
    this.tabBtnMusic = document.getElementById('tabBtnMusic');
    this.viewMusic = document.getElementById('viewMusic');
    this.btnOpenUploadMusic = document.getElementById('btnOpenUploadMusic');
    this.uploadTrackModal = document.getElementById('uploadTrackModal');
    this.btnCloseUploadTrack = document.getElementById('btnCloseUploadTrack');
    this.btnCancelUploadTrack = document.getElementById('btnCancelUploadTrack');
    this.uploadTrackForm = document.getElementById('uploadTrackForm');
    this.trackFileInput = document.getElementById('trackFileInput');
    this.trackTitleInput = document.getElementById('trackTitleInput');
    this.trackArtistInput = document.getElementById('trackArtistInput');
    this.trackGenreSelect = document.getElementById('trackGenreSelect');
    this.musicSearchInput = document.getElementById('musicSearchInput');
    this.btnClearMusicSearch = document.getElementById('btnClearMusicSearch');
    this.musicGenreChips = document.getElementById('musicGenreChips');
    this.musicTracksList = document.getElementById('musicTracksList');

    this.globalMusicPlayer = document.getElementById('globalMusicPlayer');
    this.playerCoverDisc = document.getElementById('playerCoverDisc');
    this.playerTrackTitle = document.getElementById('playerTrackTitle');
    this.playerTrackArtist = document.getElementById('playerTrackArtist');
    this.playerBtnSave = document.getElementById('playerBtnSave');
    this.playerBtnPrev = document.getElementById('playerBtnPrev');
    this.playerBtnPlay = document.getElementById('playerBtnPlay');
    this.playerBtnNext = document.getElementById('playerBtnNext');
    this.playerCurrentTime = document.getElementById('playerCurrentTime');
    this.playerProgressWrap = document.getElementById('playerProgressWrap');
    this.playerProgressFill = document.getElementById('playerProgressFill');
    this.playerTotalTime = document.getElementById('playerTotalTime');
    this.playerBtnSetAnthem = document.getElementById('playerBtnSetAnthem');
    this.playerVolumeSlider = document.getElementById('playerVolumeSlider');
    this.playerBtnClose = document.getElementById('playerBtnClose');

    this.audioPlayer = new Audio();
    this.currentPlaylist = [];
    this.currentTrackIndex = -1;
    this.currentPlayingTrack = null;
    this.activeMusicGenre = 'all';

    // Feed DOM
    this.postsStream = document.getElementById('postsStream');
    this.postsLoader = document.getElementById('postsLoader');
    this.feedCountText = document.getElementById('feedCountText');
    this.createPostAvatar = document.getElementById('createPostAvatar');
    this.postContentInput = document.getElementById('postContentInput');
    this.btnAttachPhoto = document.getElementById('btnAttachPhoto');
    this.btnAttachVideo = document.getElementById('btnAttachVideo');
    this.postPhotoInput = document.getElementById('postPhotoInput');
    this.postVideoInput = document.getElementById('postVideoInput');
    this.mediaUploadPreview = document.getElementById('mediaUploadPreview');
    this.previewInner = document.getElementById('previewInner');
    this.btnCancelMedia = document.getElementById('btnCancelMedia');
    this.btnPublishPost = document.getElementById('btnPublishPost');
    this.widgetTotalUsers = document.getElementById('widgetTotalUsers');
    this.widgetTotalPosts = document.getElementById('widgetTotalPosts');
    this.sideChatInviteBtn = document.getElementById('sideChatInviteBtn');

    // Polls & Location DOM
    this.pollCreatorBox = document.getElementById('pollCreatorBox');
    this.btnTogglePoll = document.getElementById('btnTogglePoll');
    this.pollQuestionInput = document.getElementById('pollQuestionInput');
    this.pollOptionsInputs = document.getElementById('pollOptionsInputs');
    this.btnAddPollOption = document.getElementById('btnAddPollOption');
    this.btnCancelPoll = document.getElementById('btnCancelPoll');
    this.postLocationSelect = document.getElementById('postLocationSelect');

    // Search & Tags DOM
    this.feedSearchInput = document.getElementById('feedSearchInput');
    this.btnClearSearch = document.getElementById('btnClearSearch');
    this.popularTagsStrip = document.getElementById('popularTagsStrip');
    this.feedBarTitle = document.getElementById('feedBarTitle');
    this.activeTag = null;
    this.activeSearch = null;
    this.activeLocation = null;

    // Voice Chat DOM
    this.btnChatVoice = document.getElementById('btnChatVoice');
    this.voiceRecordingBar = document.getElementById('voiceRecordingBar');
    this.recordingTimer = document.getElementById('recordingTimer');
    this.btnCancelVoice = document.getElementById('btnCancelVoice');
    this.btnSendVoice = document.getElementById('btnSendVoice');
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordTimer = null;
    this.recordSeconds = 0;

    // Security Alert Banner DOM
    this.securityBannerStrip = document.getElementById('securityBannerStrip');
    this.btnCloseSecurityBanner = document.getElementById('btnCloseSecurityBanner');

    // Profile DOM
    this.profileCoverImg = document.getElementById('profileCoverImg');
    this.btnChangeCover = document.getElementById('btnChangeCover');
    this.coverFileInput = document.getElementById('coverFileInput');
    this.profileBigAvatar = document.getElementById('profileBigAvatar');
    this.btnUploadOwnAvatar = document.getElementById('btnUploadOwnAvatar');
    this.profileDisplayName = document.getElementById('profileDisplayName');
    this.profileVerifiedBadge = document.getElementById('profileVerifiedBadge');
    this.profileHandle = document.getElementById('profileHandle');
    this.profileBannedBadge = document.getElementById('profileBannedBadge');
    this.profileCity = document.getElementById('profileCity');
    this.profileStatusText = document.getElementById('profileStatusText');
    this.profileBio = document.getElementById('profileBio');
    this.profileDetailPlace = document.getElementById('profileDetailPlace');
    this.profilePlaceVal = document.getElementById('profilePlaceVal');
    this.profileDetailTg = document.getElementById('profileDetailTg');
    this.profileTgVal = document.getElementById('profileTgVal');
    this.profileDetailBirth = document.getElementById('profileDetailBirth');
    this.profileBirthVal = document.getElementById('profileBirthVal');
    this.profileActionsContainer = document.getElementById('profileActionsContainer');
    this.profileCreatorBadge = document.getElementById('profileCreatorBadge');
    this.btnAdjustCover = document.getElementById('btnAdjustCover');
    this.adjustCoverModal = document.getElementById('adjustCoverModal');
    this.btnCloseAdjustCover = document.getElementById('btnCloseAdjustCover');
    this.btnCancelAdjustCover = document.getElementById('btnCancelAdjustCover');
    this.profileAnthemCard = document.getElementById('profileAnthemCard');
    this.profileAnthemTitle = document.getElementById('profileAnthemTitle');
    this.profileAnthemArtist = document.getElementById('profileAnthemArtist');
    this.btnProfileAnthemPlay = document.getElementById('btnProfileAnthemPlay');
    this.btnRemoveProfileAnthem = document.getElementById('btnRemoveProfileAnthem');
    this.profileStatPosts = document.getElementById('profileStatPosts');
    this.profileStatFriends = document.getElementById('profileStatFriends');
    this.profileStatMusicBox = document.getElementById('profileStatMusicBox');
    this.profileStatMusicCount = document.getElementById('profileStatMusicCount');
    this.subtabPosts = document.getElementById('subtabPosts');
    this.subtabFriends = document.getElementById('subtabFriends');
    this.subtabMusic = document.getElementById('subtabMusic');
    this.profilePostsSubcontent = document.getElementById('profilePostsSubcontent');
    this.profileFriendsSubcontent = document.getElementById('profileFriendsSubcontent');
    this.profileMusicSubcontent = document.getElementById('profileMusicSubcontent');
    this.profileTracksList = document.getElementById('profileTracksList');
    this.privateProfileLockBox = document.getElementById('privateProfileLockBox');
    this.profilePostsStream = document.getElementById('profilePostsStream');
    this.profileFriendsGrid = document.getElementById('profileFriendsGrid');

    // Friends DOM
    this.friendsSearchInput = document.getElementById('friendsSearchInput');
    this.incomingRequestsSection = document.getElementById('incomingRequestsSection');
    this.incomingCount = document.getElementById('incomingCount');
    this.incomingRequestsGrid = document.getElementById('incomingRequestsGrid');
    this.myFriendsCount = document.getElementById('myFriendsCount');
    this.myFriendsGrid = document.getElementById('myFriendsGrid');
    this.allUsersGrid = document.getElementById('allUsersGrid');

    // Chat DOM
    this.btnOpenCreateChannel = document.getElementById('btnOpenCreateChannel');
    this.createChannelModal = document.getElementById('createChannelModal');
    this.btnCloseCreateChannel = document.getElementById('btnCloseCreateChannel');
    this.btnCancelCreateChannel = document.getElementById('btnCancelCreateChannel');
    this.createChannelForm = document.getElementById('createChannelForm');
    this.channelEmojiPicker = document.getElementById('channelEmojiPicker');
    this.newChannelIcon = document.getElementById('newChannelIcon');
    this.newChannelName = document.getElementById('newChannelName');
    this.newChannelDesc = document.getElementById('newChannelDesc');
    this.chatChannelsList = document.getElementById('chatChannelsList');
    this.chatGeneralChannelBtn = document.getElementById('chatGeneralChannelBtn');
    this.chatDmList = document.getElementById('chatDmList');
    this.chatActiveIcon = document.getElementById('chatActiveIcon');
    this.chatActiveTitle = document.getElementById('chatActiveTitle');
    this.chatActiveSubtitle = document.getElementById('chatActiveSubtitle');
    this.chatPinnedBar = document.getElementById('chatPinnedBar');
    this.chatPinnedContent = document.getElementById('chatPinnedContent');
    this.chatPinnedAuthor = document.getElementById('chatPinnedAuthor');
    this.chatPinnedText = document.getElementById('chatPinnedText');
    this.btnUnpinChatMsg = document.getElementById('btnUnpinChatMsg');
    this.btnChatStickers = document.getElementById('btnChatStickers');
    this.stickersDrawer = document.getElementById('stickersDrawer');
    this.stickersGrid = document.getElementById('stickersGrid');
    this.btnCloseStickers = document.getElementById('btnCloseStickers');
    this.chatMessagesContainer = document.getElementById('chatMessagesContainer');
    this.chatMessagesList = document.getElementById('chatMessagesList');
    this.chatForm = document.getElementById('chatForm');
    this.chatMessageInput = document.getElementById('chatMessageInput');
    this.chatFileInput = document.getElementById('chatFileInput');
    this.btnChatAttach = document.getElementById('btnChatAttach');
    this.chatReplyBar = document.getElementById('chatReplyBar');
    this.chatReplyText = document.getElementById('chatReplyText');
    this.btnCancelChatReply = document.getElementById('btnCancelChatReply');
    this.chatAttachmentBar = document.getElementById('chatAttachmentBar');
    this.chatAttachmentText = document.getElementById('chatAttachmentText');
    this.btnCancelChatAttachment = document.getElementById('btnCancelChatAttachment');
    this.chatTypingLine = document.getElementById('chatTypingLine');

    // Modals
    this.authModal = document.getElementById('authModal');
    this.authTabLogin = document.getElementById('authTabLogin');
    this.authTabRegister = document.getElementById('authTabRegister');
    this.loginForm = document.getElementById('loginForm');
    this.registerForm = document.getElementById('registerForm');
    this.loginError = document.getElementById('loginError');
    this.regError = document.getElementById('regError');
    this.linkSwitchToRegister = document.getElementById('linkSwitchToRegister');
    this.linkSwitchToLogin = document.getElementById('linkSwitchToLogin');

    // Report Fraud Modal
    this.reportModal = document.getElementById('reportModal');
    this.reportForm = document.getElementById('reportForm');
    this.reportTargetType = document.getElementById('reportTargetType');
    this.reportTargetId = document.getElementById('reportTargetId');
    this.reportReason = document.getElementById('reportReason');
    this.reportDetails = document.getElementById('reportDetails');
    this.btnCloseReportModal = document.getElementById('btnCloseReportModal');
    this.btnCancelReport = document.getElementById('btnCancelReport');

    // Admin Moderation Modal
    this.moderationModal = document.getElementById('moderationModal');
    this.moderationContent = document.getElementById('moderationContent');
    this.btnCloseModerationModal = document.getElementById('btnCloseModerationModal');
    this.adminTabReports = document.getElementById('adminTabReports');
    this.adminTabUsers = document.getElementById('adminTabUsers');
    this.adminTabStats = document.getElementById('adminTabStats');
    this.adminPendingCount = document.getElementById('adminPendingCount');
    this.currentAdminTab = 'reports';

    // External Link Warning Modal
    this.externalLinkModal = document.getElementById('externalLinkModal');
    this.externalUrlDisplay = document.getElementById('externalUrlDisplay');
    this.btnProceedExternalLink = document.getElementById('btnProceedExternalLink');
    this.btnCancelExternalLink = document.getElementById('btnCancelExternalLink');
    this.btnCloseLinkModal = document.getElementById('btnCloseLinkModal');

    // Avatar upload & Profile Edit Modals
    this.avatarUploadModal = document.getElementById('avatarUploadModal');
    this.customAvatarFileInput = document.getElementById('customAvatarFileInput');
    this.avatarUploadForm = document.getElementById('avatarUploadForm');
    this.cropCirclePreview = document.getElementById('cropCirclePreview');
    this.btnCloseAvatarModal = document.getElementById('btnCloseAvatarModal');
    this.btnCancelAvatar = document.getElementById('btnCancelAvatar');

    this.editProfileModal = document.getElementById('editProfileModal');
    this.editProfileForm = document.getElementById('editProfileForm');
    this.editDisplayName = document.getElementById('editDisplayName');
    this.editCity = document.getElementById('editCity');
    this.editCitySelect = document.getElementById('editCitySelect');
    this.editCityCustom = document.getElementById('editCityCustom');
    this.editBio = document.getElementById('editBio');
    this.editStatusText = document.getElementById('editStatusText');
    this.editFavoritePlace = document.getElementById('editFavoritePlace');
    this.editTelegram = document.getElementById('editTelegram');
    this.editBirthDate = document.getElementById('editBirthDate');
    this.editIsPrivate = document.getElementById('editIsPrivate');
    this.btnCloseEditModal = document.getElementById('btnCloseEditModal');
    this.btnCancelEdit = document.getElementById('btnCancelEdit');

    this.imageLightbox = document.getElementById('imageLightbox');
    this.lightboxImg = document.getElementById('lightboxImg');
    this.btnCloseLightbox = document.getElementById('btnCloseLightbox');
  }

  showToast(messageOrOpts, type = 'info', extraOpts = {}) {
    let opts = {};
    if (typeof messageOrOpts === 'string') {
      opts = { message: messageOrOpts, type, ...extraOpts };
    } else {
      opts = { ...messageOrOpts };
    }
    const container = this.toastContainer || document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const toastType = opts.type || 'info';
    toast.className = `toast toast-${toastType}`;

    let iconHTML = '';
    if (opts.avatar) {
      if (opts.avatar.startsWith('/') || opts.avatar.startsWith('http')) {
        iconHTML = `<img src="${this.escapeHTML(opts.avatar)}" class="toast-avatar" alt="Avatar">`;
      } else {
        const emo = PRESET_AVATARS[opts.avatar] || '👤';
        iconHTML = `<div class="toast-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;">${emo}</div>`;
      }
    } else {
      let icon = opts.icon;
      if (!icon) {
        if (toastType === 'success') icon = '✅';
        else if (toastType === 'error') icon = '❌';
        else if (toastType === 'warning') icon = '⚠️';
        else if (toastType === 'message') icon = '💬';
        else icon = 'ℹ️';
      }
      iconHTML = `<div class="toast-icon">${icon}</div>`;
    }

    const titleHTML = opts.title ? `<div class="toast-title">${this.escapeHTML(opts.title)}</div>` : '';
    const bodyHTML = `<div class="toast-body">${this.escapeHTML(opts.message || '')}</div>`;

    toast.innerHTML = `
      ${iconHTML}
      <div class="toast-content">
        ${titleHTML}
        ${bodyHTML}
      </div>
      <button class="toast-close" title="Закрыть">✕</button>
      <div class="toast-progress"></div>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    let isDismissed = false;
    const dismiss = () => {
      if (isDismissed) return;
      isDismissed = true;
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 320);
    };

    closeBtn.onclick = (e) => {
      e.stopPropagation();
      dismiss();
    };

    if (typeof opts.onClick === 'function') {
      toast.onclick = (e) => {
        if (e.target === closeBtn) return;
        dismiss();
        opts.onClick();
      };
    } else {
      toast.onclick = (e) => {
        if (e.target === closeBtn) return;
        dismiss();
      };
    }

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    const duration = opts.duration || (toastType === 'message' ? 6000 : 4200);
    const progressBar = toast.querySelector('.toast-progress');
    if (progressBar) {
      progressBar.style.transition = `transform ${duration}ms linear`;
      requestAnimationFrame(() => {
        progressBar.style.transform = 'scaleX(0)';
      });
    }

    let timer = setTimeout(dismiss, duration);
    toast.onmouseenter = () => {
      clearTimeout(timer);
      if (progressBar) progressBar.style.transition = 'none';
    };
    toast.onmouseleave = () => {
      timer = setTimeout(dismiss, 1500);
    };
  }

  bindEvents() {
    this.navBrandBtn.addEventListener('click', () => this.switchTab('feed'));

    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === 'profile') {
          this.openUserProfile(this.currentUser.username);
        } else {
          this.switchTab(tab);
        }
      });
    });

    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    this.userPillBtn.addEventListener('click', () => {
      if (this.currentUser) {
        this.openUserProfile(this.currentUser.username);
      }
    });

    this.btnLogout.addEventListener('click', () => this.handleLogout());

    // Notifications
    this.btnNotifications.addEventListener('click', (e) => {
      e.stopPropagation();
      this.notificationsDropdown.classList.toggle('hidden');
      if (!this.notificationsDropdown.classList.contains('hidden')) {
        this.loadNotifications();
      }
    });

    document.addEventListener('click', (e) => {
      if (!this.notificationsDropdown.contains(e.target) && e.target !== this.btnNotifications) {
        this.notificationsDropdown.classList.add('hidden');
      }
    });

    this.btnMarkAllRead.addEventListener('click', () => this.markAllNotificationsRead());

    // Initialize New Systems: Music Player, Custom Channels, Cover Adjuster, Anthem, Cities
    this.initMusicPlayer();
    this.initChannelEvents();
    this.initCoverAdjustEvents();
    this.initProfileAnthemEvents();
    this.initSidebarCityEvents();

    // Admin Moderation Button & Tabs
    this.btnOpenModeration.addEventListener('click', () => this.openModerationModal('reports'));
    this.btnCloseModerationModal.addEventListener('click', () => this.moderationModal.classList.add('hidden'));
    this.adminTabReports.addEventListener('click', () => this.openModerationModal('reports'));
    this.adminTabUsers.addEventListener('click', () => this.openModerationModal('users'));
    this.adminTabStats.addEventListener('click', () => this.openModerationModal('stats'));

    // Feed Create Post with Poll & Location
    this.btnAttachPhoto.addEventListener('click', () => this.postPhotoInput.click());
    this.btnAttachVideo.addEventListener('click', () => this.postVideoInput.click());
    this.postPhotoInput.addEventListener('change', (e) => this.handlePostMediaUpload(e, 'image'));
    this.postVideoInput.addEventListener('change', (e) => this.handlePostMediaUpload(e, 'video'));
    this.btnCancelMedia.addEventListener('click', () => this.clearPostMedia());
    this.btnPublishPost.addEventListener('click', () => this.handlePublishPost());

    this.btnTogglePoll.addEventListener('click', () => {
      this.pollCreatorBox.classList.toggle('hidden');
    });

    this.btnCancelPoll.addEventListener('click', () => {
      this.pollCreatorBox.classList.add('hidden');
      this.pollQuestionInput.value = '';
    });

    this.btnAddPollOption.addEventListener('click', () => {
      const count = this.pollOptionsInputs.querySelectorAll('.poll-opt-input').length;
      if (count >= 5) {
        alert('Максимум 5 вариантов ответа');
        return;
      }
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'poll-opt-input';
      inp.placeholder = `Вариант ответа ${count + 1}`;
      this.pollOptionsInputs.appendChild(inp);
    });

    // Feed Search & Tags
    let searchDebounce = null;
    this.feedSearchInput.addEventListener('input', () => {
      const q = this.feedSearchInput.value.trim();
      this.btnClearSearch.classList.toggle('hidden', !q);
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        this.activeSearch = q || null;
        this.loadFeed();
      }, 400);
    });

    this.btnClearSearch.addEventListener('click', () => {
      this.feedSearchInput.value = '';
      this.btnClearSearch.classList.add('hidden');
      this.activeSearch = null;
      this.loadFeed();
    });

    if (this.popularTagsStrip) {
      this.popularTagsStrip.addEventListener('click', (e) => {
        const pill = e.target.closest('.tag-pill');
        if (!pill) return;
        const tag = pill.dataset.tag;
        if (this.activeTag === tag) {
          this.activeTag = null;
          pill.classList.remove('active');
        } else {
          this.popularTagsStrip.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.activeTag = tag;
        }
        this.loadFeed();
      });
    }

    // Voice Recording in Chat
    this.btnChatVoice.addEventListener('click', () => this.startVoiceRecording());
    this.btnCancelVoice.addEventListener('click', () => this.cancelVoiceRecording());
    this.btnSendVoice.addEventListener('click', () => this.sendVoiceRecording());

    this.sideChatInviteBtn.addEventListener('click', () => this.switchTab('chat'));

    this.chatGeneralChannelBtn.addEventListener('click', () => {
      this.currentChatChannelId = 1;
      this.currentChatDmUserId = null;
      document.querySelectorAll('.chat-channel-item').forEach(el => el.classList.remove('active'));
      this.chatGeneralChannelBtn.classList.add('active');
      this.chatActiveIcon.textContent = '☀️';
      this.chatActiveTitle.textContent = 'Общий чат Хакасии';
      this.chatActiveSubtitle.textContent = 'Главная беседка для общения всех жителей и гостей республики';
      this.loadChatMessages();
    });

    this.chatForm.addEventListener('submit', (e) => this.handleSendChatMessage(e));
    this.btnChatAttach.addEventListener('click', () => this.chatFileInput.click());
    this.chatFileInput.addEventListener('change', (e) => this.handleChatFileUpload(e));
    this.btnCancelChatAttachment.addEventListener('click', () => this.clearChatAttachment());
    this.btnCancelChatReply.addEventListener('click', () => this.cancelChatReply());

    this.subtabPosts.addEventListener('click', () => {
      this.subtabPosts.classList.add('active');
      this.subtabFriends.classList.remove('active');
      this.profilePostsSubcontent.classList.remove('hidden');
      this.profileFriendsSubcontent.classList.add('hidden');
    });

    this.subtabFriends.addEventListener('click', () => {
      this.subtabFriends.classList.add('active');
      this.subtabPosts.classList.remove('active');
      this.profileFriendsSubcontent.classList.remove('hidden');
      this.profilePostsSubcontent.classList.add('hidden');
    });

    this.btnUploadOwnAvatar.addEventListener('click', () => {
      this.avatarUploadModal.classList.remove('hidden');
    });
    this.btnCloseAvatarModal.addEventListener('click', () => this.avatarUploadModal.classList.add('hidden'));
    this.btnCancelAvatar.addEventListener('click', () => this.avatarUploadModal.classList.add('hidden'));
    this.customAvatarFileInput.addEventListener('change', (e) => this.handleCustomAvatarPreview(e));
    this.avatarUploadForm.addEventListener('submit', (e) => this.handleSaveCustomAvatar(e));

    this.btnCloseEditModal.addEventListener('click', () => this.editProfileModal.classList.add('hidden'));
    this.btnCancelEdit.addEventListener('click', () => this.editProfileModal.classList.add('hidden'));
    this.editProfileForm.addEventListener('submit', (e) => this.handleSaveProfileEdit(e));

    // Close Security Warning Strip
    if (this.btnCloseSecurityBanner) {
      this.btnCloseSecurityBanner.addEventListener('click', () => {
        if (this.securityBannerStrip) this.securityBannerStrip.classList.add('hidden');
        localStorage.setItem('hideSecurityBanner', '1');
      });
    }

    // Edit Profile City Select Custom Option
    if (this.editCitySelect) {
      this.editCitySelect.addEventListener('change', () => {
        if (this.editCitySelect.value === 'custom') {
          this.editCityCustom.classList.remove('hidden');
          this.editCityCustom.focus();
        } else {
          this.editCityCustom.classList.add('hidden');
        }
      });
    }

    // Change Profile Cover (Banner Photo / GIF)
    if (this.btnChangeCover && this.coverFileInput) {
      this.btnChangeCover.addEventListener('click', () => this.coverFileInput.click());
      this.coverFileInput.addEventListener('change', (e) => this.handleCoverUpload(e));
    }

    // Popstate Routing
    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.pathname);
    });

    // Report Modal
    this.btnCloseReportModal.addEventListener('click', () => this.reportModal.classList.add('hidden'));
    this.btnCancelReport.addEventListener('click', () => this.reportModal.classList.add('hidden'));
    this.reportForm.addEventListener('submit', (e) => this.handleSendReport(e));

    // External link modal
    this.btnCloseLinkModal.addEventListener('click', () => this.externalLinkModal.classList.add('hidden'));
    this.btnCancelExternalLink.addEventListener('click', () => this.externalLinkModal.classList.add('hidden'));

    let friendsDebounce = null;
    this.friendsSearchInput.addEventListener('input', (e) => {
      clearTimeout(friendsDebounce);
      friendsDebounce = setTimeout(() => this.loadAllUsers(e.target.value.trim()), 300);
    });

    this.authTabLogin.addEventListener('click', () => this.switchAuthTab('login'));
    this.authTabRegister.addEventListener('click', () => this.switchAuthTab('register'));
    this.linkSwitchToRegister.addEventListener('click', (e) => { e.preventDefault(); this.switchAuthTab('register'); });
    this.linkSwitchToLogin.addEventListener('click', (e) => { e.preventDefault(); this.switchAuthTab('login'); });
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));

    document.getElementById('regAvatarPresets').addEventListener('click', (e) => {
      const opt = e.target.closest('.avatar-option');
      if (opt) {
        document.querySelectorAll('#regAvatarPresets .avatar-option').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
      }
    });

    this.btnCloseLightbox.addEventListener('click', () => this.imageLightbox.classList.add('hidden'));
    this.imageLightbox.addEventListener('click', (e) => {
      if (e.target === this.imageLightbox) this.imageLightbox.classList.add('hidden');
    });
  }

  // ----------------- THEME -----------------
  initTheme() {
    const saved = localStorage.getItem('khakassia_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('khakassia_theme', next);
  }

  // ----------------- INITIALIZATION -----------------
  async initApp() {
    if (!this.token) {
      this.showAuthModal();
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!res.ok) throw new Error('Unauthorized');

      const data = await res.json();
      this.currentUser = data.user;
      this.hideAuthModal();
      this.updateNavbarUser();

      // Show moderation button if admin
      if (this.currentUser.role === 'admin') {
        this.btnOpenModeration.classList.remove('hidden');
      }

      // Check Security Banner hidden state
      if (localStorage.getItem('hideSecurityBanner') === '1' && this.securityBannerStrip) {
        this.securityBannerStrip.classList.add('hidden');
      }

      this.initStickers();
      this.initWebSocket();
      this.loadNotifications();
      this.refreshUnreadChatBadge();
      setInterval(() => {
        this.loadNotifications();
        this.refreshUnreadChatBadge();
      }, 15000);
      this.handleRoute(window.location.pathname);
      this.checkFriendRequests();
    } catch (e) {
      console.warn('Session expired:', e);
      this.token = null;
      localStorage.removeItem('pulse_token');
      this.showAuthModal();
    }
  }

  showAuthModal() {
    this.authModal.classList.remove('hidden');
  }

  hideAuthModal() {
    this.authModal.classList.add('hidden');
  }

  updateNavbarUser() {
    if (!this.currentUser) return;
    const u = this.currentUser;
    this.navUserName.textContent = u.display_name;
    this.navUserHandle.textContent = `@${u.username}`;
    this.renderAvatarInto(u.avatar, this.navUserAvatar);
    this.renderAvatarInto(u.avatar, this.createPostAvatar);

    if (u.role === 'admin') {
      this.btnOpenModeration.classList.remove('hidden');
    } else {
      this.btnOpenModeration.classList.add('hidden');
    }
  }

  renderAvatarInto(avatar, container) {
    if (!container) return;
    container.innerHTML = '';
    if (avatar && (avatar.startsWith('/uploads/') || avatar.startsWith('/images/') || avatar.startsWith('http'))) {
      const img = document.createElement('img');
      img.src = avatar;
      img.alt = 'Avatar';
      container.appendChild(img);
    } else {
      container.textContent = AVATAR_MAP[avatar] || avatar || '👤';
    }
  }

  // ----------------- TABS NAVIGATION & URL ROUTING -----------------
  switchTab(tabName, pushState = true) {
    this.currentTab = tabName;

    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    this.tabViews.forEach(view => {
      view.classList.add('hidden');
    });

    if (pushState) {
      if (tabName === 'feed') {
        history.pushState({ tab: 'feed' }, '', '/');
      } else if (tabName === 'chat') {
        history.pushState({ tab: 'chat' }, '', '/chat');
      } else if (tabName === 'music') {
        history.pushState({ tab: 'music' }, '', '/music');
      } else if (tabName === 'friends') {
        history.pushState({ tab: 'friends' }, '', '/friends');
      } else if (tabName === 'profile') {
        const u = this.currentUser ? this.currentUser.username : '';
        history.pushState({ tab: 'profile', username: u }, '', u ? `/u/${u}` : '/profile');
      }
    }

    if (tabName === 'feed') {
      document.getElementById('viewFeed').classList.remove('hidden');
      this.loadFeed();
      this.loadStats();
    } else if (tabName === 'chat') {
      document.getElementById('viewChat').classList.remove('hidden');
      this.loadChannels();
      this.loadChatDms();
      this.loadChatMessages();
      if (this.currentChatChannelId === 1) {
        this.chatUnreadTotal = 0;
        if (this.chatUnreadBadge) this.chatUnreadBadge.classList.add('hidden');
      }
    } else if (tabName === 'music') {
      document.getElementById('viewMusic').classList.remove('hidden');
      this.loadMusicList();
    } else if (tabName === 'friends') {
      document.getElementById('viewFriends').classList.remove('hidden');
      this.loadFriendsTab();
    } else if (tabName === 'profile') {
      document.getElementById('viewProfile').classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleRoute(pathname) {
    if (!pathname) return;
    if (pathname === '/music') {
      this.switchTab('music', false);
      return;
    }
    if (pathname.startsWith('/u/')) {
      const uname = pathname.slice(3).replace(/^\/+/, '').split('/')[0];
      if (uname) {
        this.openUserProfile(uname, false);
        return;
      }
    }
    if (pathname === '/chat') {
      this.switchTab('chat', false);
    } else if (pathname === '/friends') {
      this.switchTab('friends', false);
    } else {
      this.switchTab('feed', false);
    }
  }

  // ----------------- WEBSOCKET -----------------
  initWebSocket() {
    if (!this.token) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn('WS Init Error:', e);
      return;
    }

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'auth', token: this.token }));

      // Heartbeat ping каждые 20 сек для поддержания сессии на Render
      if (this.wsPingInterval) clearInterval(this.wsPingInterval);
      this.wsPingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return;
        this.handleWsEvent(data);
      } catch (e) {
        console.error('WS Error:', e);
      }
    };

    this.ws.onclose = () => {
      if (this.wsPingInterval) {
        clearInterval(this.wsPingInterval);
        this.wsPingInterval = null;
      }
      if (this.token && !this.reconnectInterval) {
        this.reconnectInterval = setTimeout(() => {
          this.reconnectInterval = null;
          this.initWebSocket();
        }, 3000);
      }
    };
  }

  handleWsEvent(data) {
    switch (data.type) {
      case 'new_post':
        if (this.currentTab === 'feed') {
          this.prependPost(data.post);
        }
        break;

      case 'post_deleted':
        const postEl = document.getElementById(`post-${data.postId}`);
        if (postEl) postEl.remove();
        break;

      case 'post_like_updated':
        this.updatePostLikeDOM(data.postId, data.likesCount, data.userId, data.liked);
        break;

      case 'new_post_comment':
        this.appendPostCommentDOM(data.postId, data.comment, data.commentsCount);
        break;

      case 'new_message':
        this.onNewChatMessage(data.message);
        break;

      case 'system_alert':
        this.showToast(data.message, 'warning');
        break;

      case 'account_banned':
        this.showToast(`🚨 Ваш аккаунт заблокирован: ${data.reason}`, 'error', { duration: 10000 });
        setTimeout(() => {
          localStorage.removeItem('pulse_token');
          window.location.reload();
        }, 2500);
        break;

      case 'friend_request_received':
        this.checkFriendRequests();
        window.soundFX && window.soundFX.playReceive();
        this.showToast('👥 Новая заявка в друзья!', 'info', {
          onClick: () => this.switchTab('friends')
        });
        break;

      case 'friend_request_accepted':
        this.checkFriendRequests();
        window.soundFX && window.soundFX.playReceive();
        this.showToast('🎉 Пользователь принял вашу заявку в друзья!', 'success', {
          onClick: () => this.switchTab('friends')
        });
        break;

      case 'user_profile_updated':
        if (this.currentUser && this.currentUser.id === data.user.id) {
          this.currentUser = data.user;
          this.updateNavbarUser();
        }
        break;

      case 'new_notification':
        this.loadNotifications();
        window.soundFX && window.soundFX.playReceive();
        break;

      case 'poll_updated':
        this.onPollUpdated(data.postId, data.poll);
        break;

      case 'post_pinned_updated':
        this.loadFeed();
        break;

      case 'comment_deleted':
        const cEl = document.getElementById(`comment-${data.commentId}`);
        if (cEl) cEl.remove();
        const cntEl = document.getElementById(`comment-count-${data.postId}`);
        if (cntEl) cntEl.textContent = data.commentsCount;
        break;

      case 'message_deleted':
        const mEl = document.getElementById(`cmsg-${data.messageId}`);
        if (mEl) mEl.remove();
        break;

      case 'chat_message_pinned':
        if (data.pinnedMessage) {
          this.renderPinnedMessage(data.pinnedMessage);
        } else {
          if (this.chatPinnedBar) this.chatPinnedBar.classList.add('hidden');
        }
        break;

      case 'new_channel':
        this.loadChannels();
        break;

      case 'new_track':
        if (this.currentTab === 'music') {
          this.loadMusicList();
        }
        break;
    }
  }

  // =========================================================================
  // FEED & POSTS (ПОИСК, ТЕГИ, ОПРОСЫ, ЗАКРЕПЛЕНИЕ)
  // =========================================================================
  async loadFeed() {
    this.postsLoader.classList.remove('hidden');
    try {
      const params = new URLSearchParams();
      if (this.activeSearch) params.append('search', this.activeSearch);
      if (this.activeTag) params.append('tag', this.activeTag);
      if (this.activeLocation) params.append('location', this.activeLocation);

      const url = `/api/posts${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      const posts = data.posts || [];

      if (this.activeTag) {
        this.feedBarTitle.textContent = `Публикации с тегом #${this.activeTag}`;
      } else if (this.activeSearch) {
        this.feedBarTitle.textContent = `Результаты поиска: "${this.activeSearch}"`;
      } else if (this.activeLocation) {
        this.feedBarTitle.textContent = `Локация: ${this.activeLocation}`;
      } else {
        this.feedBarTitle.textContent = 'Все публикации';
      }

      this.feedCountText.textContent = `${posts.length} публикаций`;

      this.postsStream.innerHTML = '';
      if (posts.length === 0) {
        this.postsStream.innerHTML = `
          <div style="text-align:center; padding:40px 20px; color:var(--text-dim);">
            <div style="font-size:2.2rem; margin-bottom:10px;">🌄</div>
            <strong>Публикаций по запросу не найдено</strong>
            <p style="font-size:0.85rem; margin-top:6px;">Попробуйте сбросить фильтр или опубликовать свою новость!</p>
          </div>
        `;
      } else {
        posts.forEach(post => {
          this.postsStream.appendChild(this.createPostElement(post));
        });
      }
    } catch (e) {
      console.error('Load feed error:', e);
    } finally {
      this.postsLoader.classList.add('hidden');
    }
  }

  filterByTag(tag) {
    this.activeTag = tag;
    this.activeSearch = null;
    this.activeLocation = null;
    if (this.popularTagsStrip) {
      this.popularTagsStrip.querySelectorAll('.tag-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.tag === tag);
      });
    }
    this.switchTab('feed');
    this.loadFeed();
  }

  filterByLocation(loc) {
    this.activeLocation = loc;
    this.activeTag = null;
    this.activeSearch = null;
    this.switchTab('feed');
    this.loadFeed();
  }

  async loadStats() {
    try {
      const [uRes, pRes] = await Promise.all([
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${this.token}` } }),
        fetch('/api/posts', { headers: { 'Authorization': `Bearer ${this.token}` } })
      ]);
      const uData = await uRes.json();
      const pData = await pRes.json();
      this.widgetTotalUsers.textContent = (uData.users || []).length;
      this.widgetTotalPosts.textContent = (pData.posts || []).length;
    } catch (e) {}
  }

  async handlePostMediaUpload(e, type) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    this.mediaUploadPreview.classList.remove('hidden');
    this.previewInner.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted);">Загрузка файла...</span>`;

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');

      this.pendingPostMedia = data;

      if (data.type === 'video') {
        this.previewInner.innerHTML = `
          <video controls src="${data.url}" style="max-width:100%; max-height:260px; border-radius:8px;"></video>
          <div style="font-size:0.75rem; color:var(--solar-gold); margin-top:4px;">🎥 Видео готово к публикации: ${this.escapeHTML(data.name)}</div>
        `;
      } else if (data.type === 'audio') {
        this.previewInner.innerHTML = `
          <audio controls src="${data.url}" style="width:100%; margin-top:6px;"></audio>
          <div style="font-size:0.75rem; color:var(--solar-gold); margin-top:4px;">🎵 Аудио готово: ${this.escapeHTML(data.name)}</div>
        `;
      } else {
        this.previewInner.innerHTML = `
          <img src="${data.url}" alt="Фото" style="max-width:100%; max-height:260px; border-radius:8px;">
          <div style="font-size:0.75rem; color:var(--solar-gold); margin-top:4px;">📸 Фото готово к публикации: ${this.escapeHTML(data.name)}</div>
        `;
      }
    } catch (err) {
      alert('Ошибка при загрузке: ' + err.message);
      this.clearPostMedia();
    }
  }

  clearPostMedia() {
    this.pendingPostMedia = null;
    this.mediaUploadPreview.classList.add('hidden');
    this.previewInner.innerHTML = '';
    this.postPhotoInput.value = '';
    this.postVideoInput.value = '';
  }

  async handlePublishPost() {
    const content = this.postContentInput.value.trim();
    let location = this.postLocationSelect ? this.postLocationSelect.value.trim() : '';
    if (!location && this.currentUser && this.currentUser.city) {
      location = `г. ${this.currentUser.city}`;
    }

    let poll = null;
    if (this.pollQuestionInput && this.pollQuestionInput.value.trim()) {
      const q = this.pollQuestionInput.value.trim();
      const opts = Array.from(this.pollOptionsInputs.querySelectorAll('.poll-opt-input'))
        .map(i => i.value.trim())
        .filter(Boolean);
      if (opts.length >= 2) {
        poll = { question: q, options: opts };
      }
    }

    if (!content && !this.pendingPostMedia && !poll) {
      alert('Пожалуйста, напишите текст, прикрепите фото/видео или создайте опрос!');
      return;
    }

    const payload = {
      content,
      media_url: this.pendingPostMedia ? this.pendingPostMedia.url : null,
      media_type: this.pendingPostMedia ? this.pendingPostMedia.type : null,
      media_name: this.pendingPostMedia ? this.pendingPostMedia.name : null,
      location,
      poll
    };

    this.btnPublishPost.disabled = true;
    this.btnPublishPost.textContent = 'Публикация...';

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка публикации');

      this.postContentInput.value = '';
      if (this.postLocationSelect) this.postLocationSelect.value = '';
      if (this.pollQuestionInput) this.pollQuestionInput.value = '';
      if (this.pollCreatorBox) this.pollCreatorBox.classList.add('hidden');
      this.clearPostMedia();
      window.soundFX && window.soundFX.playSend();
    } catch (err) {
      alert(err.message);
    } finally {
      this.btnPublishPost.disabled = false;
      this.btnPublishPost.textContent = 'Опубликовать 🚀';
    }
  }

  prependPost(post) {
    const el = this.createPostElement(post);
    this.postsStream.insertBefore(el, this.postsStream.firstChild);
  }

  createPostElement(post) {
    const card = document.createElement('div');
    card.className = `post-card ${post.is_pinned ? 'pinned' : ''}`;
    card.id = `post-${post.id}`;

    const isMine = this.currentUser && post.author_id === this.currentUser.id;
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const timeFormatted = new Date(post.created_at).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    let mediaHtml = '';
    if (post.media_url) {
      if (post.media_type === 'video') {
        mediaHtml = `
          <div class="post-media-container">
            <video controls playsinline preload="metadata">
              <source src="${post.media_url}" type="video/mp4">
              Ваш браузер не поддерживает встроенное видео.
            </video>
          </div>
        `;
      } else if (post.media_type === 'audio') {
        mediaHtml = `
          <div class="post-media-container" style="padding:10px 0;">
            <audio controls src="${post.media_url}" style="width:100%; border-radius:20px;"></audio>
          </div>
        `;
      } else {
        mediaHtml = `
          <div class="post-media-container">
            <img src="${post.media_url}" alt="Фото" loading="lazy" onclick="app.openLightbox('${post.media_url}')">
          </div>
        `;
      }
    }

    const pollHtml = post.poll ? this.buildPollHTML(post.poll, post.id) : '';

    let commentsListHtml = '';
    if (post.comments && post.comments.length > 0) {
      post.comments.forEach(c => {
        commentsListHtml += this.buildCommentHTML(c);
      });
    }

    card.innerHTML = `
      <div class="post-card-header">
        <div class="post-author-box" onclick="app.openUserProfile('${post.author_username}')">
          <div class="post-avatar" id="author-avatar-${post.id}">👤</div>
          <div class="post-author-info">
            <div class="post-author-name">
              ${this.escapeHTML(post.author_display_name)}
              ${post.author_is_verified ? '<span class="verified-badge" title="Проверенный аккаунт">✔️</span>' : ''}
              <span class="author-handle">@${this.escapeHTML(post.author_username)}</span>
              ${post.is_pinned ? '<span class="pinned-badge">📌 Закреплено</span>' : ''}
            </div>
            <div class="post-meta-sub">
              ${(() => {
                const locStr = post.location || (post.author_city ? `г. ${post.author_city}` : 'Республика Хакасия');
                const cleanLoc = locStr.replace(/^(г\.|с\.|пгт\.)\s*/, '');
                return `<span class="post-location-badge" title="Локация снимка / публикации (нажмите для фильтра)" onclick="event.stopPropagation(); app.filterByLocation('${this.escapeHTML(cleanLoc)}')">📍 ${this.escapeHTML(locStr)}</span>`;
              })()}
              <span>•</span>
              <span>${timeFormatted}</span>
            </div>
          </div>
        </div>

        <div class="post-header-actions">
          ${isAdmin ? `
            <button class="btn-pin-post" title="${post.is_pinned ? 'Открепить запись' : 'Закрепить в топе ленты'}" onclick="app.togglePinPost(${post.id})">
              ${post.is_pinned ? '📌' : '📍'}
            </button>
          ` : ''}
          ${isMine || isAdmin ? `
            <button class="btn-icon-xs" title="Удалить публикацию" onclick="app.deletePost(${post.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          ` : ''}
        </div>
      </div>

      <div class="post-text-content">
        ${this.formatMessageText(post.content)}
      </div>

      ${mediaHtml}
      ${pollHtml}

      <div class="post-actions-bar">
        <button class="btn-post-action ${post.user_has_liked ? 'liked' : ''}" id="like-btn-${post.id}" onclick="app.togglePostLike(${post.id})">
          <span class="like-icon-anim">${post.user_has_liked ? '❤️' : '🤍'}</span>
          <span class="likes-count" id="like-count-${post.id}">${post.likes_count || 0}</span>
        </button>

        <button class="btn-post-action" onclick="document.getElementById('comment-input-${post.id}').focus()">
          <span>💬</span>
          <span id="comment-count-${post.id}">${post.comments_count || 0}</span>
        </button>

        <button class="btn-post-action" title="Поделиться ссылкой" onclick="app.sharePost(${post.id})">
          <span>🔗</span> Поделиться
        </button>

        <button class="btn-post-action btn-report-scam" title="Пожаловаться на мошенничество или спам" onclick="app.openReportModal('post', ${post.id})">
          🚩 Пожаловаться
        </button>
      </div>

      <div class="post-comments-section">
        <div class="comments-list" id="comments-list-${post.id}">
          ${commentsListHtml}
        </div>
        <form class="comment-form" onsubmit="app.handleCommentSubmit(event, ${post.id})">
          <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Написать комментарий..." autocomplete="off">
          <button type="submit" class="btn-send-comment">Ответить</button>
        </form>
      </div>
    `;

    const avEl = card.querySelector(`#author-avatar-${post.id}`);
    this.renderAvatarInto(post.author_avatar, avEl);

    if (post.comments && post.comments.length > 0) {
      post.comments.forEach(c => {
        const cAvEl = card.querySelector(`#comment-av-${c.id}`);
        this.renderAvatarInto(c.author_avatar, cAvEl);
      });
    }

    return card;
  }

  buildPollHTML(poll, postId) {
    const hasVoted = poll.user_voted_option_id !== null;
    return `
      <div class="poll-card" id="poll-${poll.id}">
        <div class="poll-question-title">📊 ${this.escapeHTML(poll.question)}</div>
        <div class="poll-options-list">
          ${poll.options.map(opt => {
            const isMyVote = poll.user_voted_option_id === opt.id;
            if (hasVoted) {
              return `
                <div class="poll-option-row voted">
                  <div class="poll-progress-bg" style="width: ${opt.percentage}%"></div>
                  <div class="poll-option-content">
                    <span class="poll-option-text">${isMyVote ? '✓ ' : ''}${this.escapeHTML(opt.text)}</span>
                    <span class="poll-option-stats">${opt.percentage}% (${opt.votes_count})</span>
                  </div>
                </div>
              `;
            } else {
              return `
                <div class="poll-option-row" onclick="app.voteInPoll(${poll.id}, ${opt.id}, ${postId})">
                  <div class="poll-option-content">
                    <span class="poll-option-text">${this.escapeHTML(opt.text)}</span>
                    <span class="poll-option-stats">Голосовать ➔</span>
                  </div>
                </div>
              `;
            }
          }).join('')}
        </div>
        <div class="poll-footer-info">
          <span>Всего голосов: ${poll.total_votes}</span>
          <span>${hasVoted ? 'Вы проголосовали' : 'Нажмите на вариант для ответа'}</span>
        </div>
      </div>
    `;
  }

  async voteInPoll(pollId, optionId, postId) {
    try {
      window.soundFX && window.soundFX.playPop();
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ optionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка голосования');
      this.onPollUpdated(postId, data.poll);
    } catch (e) {
      alert(e.message);
    }
  }

  onPollUpdated(postId, poll) {
    const pollEl = document.getElementById(`poll-${poll.id}`);
    if (pollEl) {
      const temp = document.createElement('div');
      temp.innerHTML = this.buildPollHTML(poll, postId);
      pollEl.replaceWith(temp.firstElementChild);
    }
  }

  async togglePinPost(postId) {
    try {
      const res = await fetch(`/api/posts/${postId}/pin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (data.success) {
        this.loadFeed();
      }
    } catch (e) {
      alert('Ошибка при закреплении');
    }
  }

  buildCommentHTML(c) {
    const time = new Date(c.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const isMine = this.currentUser && c.author_id === this.currentUser.id;
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';

    return `
      <div class="comment-item" id="comment-${c.id}">
        <div class="user-pill-avatar" id="comment-av-${c.id}" style="width:28px; height:28px; font-size:0.9rem;" onclick="app.openUserProfile('${c.author_username}')">👤</div>
        <div class="comment-bubble">
          <div class="comment-meta">
            <span class="comment-author" onclick="app.openUserProfile('${c.author_username}')">
              ${this.escapeHTML(c.author_display_name)}
              ${c.author_is_verified ? '<span class="verified-badge">✔️</span>' : ''}
            </span>
            <span class="comment-handle">@${this.escapeHTML(c.author_username)}</span>
            <span class="comment-time">${time}</span>
            ${isMine || isAdmin ? `
              <button class="btn-icon-xs" style="margin-left:auto; color:var(--text-dim);" title="Удалить комментарий" onclick="app.deleteComment(${c.id}, ${c.post_id})">✕</button>
            ` : ''}
            <button class="btn-icon-xs" style="color:var(--text-dim);" title="Пожаловаться на комментарий" onclick="app.openReportModal('comment', ${c.id})">🚩</button>
          </div>
          <div class="comment-text">${this.formatMessageText(c.content)}</div>
        </div>
      </div>
    `;
  }

  async deleteComment(commentId, postId) {
    const ok = await this.showConfirmDialog({
      title: 'Удаление комментария',
      message: 'Вы уверены, что хотите удалить этот комментарий?',
      confirmText: 'Удалить 🗑️',
      isDanger: true,
      icon: '🗑️'
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (data.success) {
        const cEl = document.getElementById(`comment-${commentId}`);
        if (cEl) cEl.remove();
        const cntEl = document.getElementById(`comment-count-${postId}`);
        if (cntEl) cntEl.textContent = data.commentsCount;
      }
    } catch (e) {
      alert('Ошибка при удалении комментария');
    }
  }

  async togglePostLike(postId) {
    try {
      window.soundFX && window.soundFX.playPop();
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      this.updatePostLikeDOM(postId, data.likesCount, this.currentUser.id, data.liked);
    } catch (e) {
      console.error(e);
    }
  }

  updatePostLikeDOM(postId, count, userId, liked) {
    const btn = document.getElementById(`like-btn-${postId}`);
    const countEl = document.getElementById(`like-count-${postId}`);
    if (countEl) countEl.textContent = count;

    if (btn && this.currentUser && userId === this.currentUser.id) {
      btn.classList.toggle('liked', liked);
      btn.querySelector('.like-icon-anim').textContent = liked ? '❤️' : '🤍';
    }
  }

  async handleCommentSubmit(e, postId) {
    e.preventDefault();
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      input.value = '';
      window.soundFX && window.soundFX.playSend();
    } catch (err) {
      alert(err.message);
    }
  }

  appendPostCommentDOM(postId, comment, commentsCount) {
    const list = document.getElementById(`comments-list-${postId}`);
    const countEl = document.getElementById(`comment-count-${postId}`);
    if (countEl) countEl.textContent = commentsCount;

    if (list) {
      const temp = document.createElement('div');
      temp.innerHTML = this.buildCommentHTML(comment);
      const commentEl = temp.firstElementChild;
      list.appendChild(commentEl);
      const avEl = commentEl.querySelector(`#comment-av-${comment.id}`);
      this.renderAvatarInto(comment.author_avatar, avEl);
    }
  }

  async deletePost(postId) {
    const ok = await this.showConfirmDialog({
      title: 'Удаление публикации',
      message: 'Вы действительно хотите удалить эту публикацию? Это действие нельзя будет отменить.',
      confirmText: 'Удалить 🗑️',
      isDanger: true,
      icon: '🗑️'
    });
    if (!ok) return;
    try {
      await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const el = document.getElementById(`post-${postId}`);
      if (el) el.remove();
    } catch (e) {
      alert('Ошибка при удалении');
    }
  }

  sharePost(postId) {
    const url = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert(`Ссылка на публикацию скопирована!\n${url}`);
    }).catch(() => {
      alert(`Ссылка: ${url}`);
    });
  }

  // =========================================================================
  // NOTIFICATIONS SYSTEM
  // =========================================================================
  async loadNotifications() {
    if (!this.token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      this.updateNotificationsUI(data.notifications || [], data.unreadCount || 0);
    } catch (e) {}
  }

  updateNotificationsUI(list, unreadCount) {
    if (unreadCount > 0) {
      this.notificationsBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      this.notificationsBadge.classList.remove('hidden');
    } else {
      this.notificationsBadge.classList.add('hidden');
    }

    if (list.length === 0) {
      this.notificationsList.innerHTML = '<div class="notifications-empty">У вас пока нет новых уведомлений</div>';
      return;
    }

    let html = '';
    list.forEach(n => {
      let icon = '🔔';
      if (n.type === 'like') icon = '❤️';
      else if (n.type === 'comment') icon = '💬';
      else if (n.type.startsWith('friend')) icon = '👥';
      else if (n.type === 'dm') icon = '✉️';

      html += `
        <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="app.handleNotificationClick('${n.type}', ${n.target_id}, '${n.target_type}')">
          <div class="notification-avatar" id="notif-av-${n.id}">👤</div>
          <div class="notification-text">
            <div><strong>${this.escapeHTML(n.actor_display_name)}</strong> ${this.escapeHTML(n.content)}</div>
            <div class="notification-time">${icon} ${new Date(n.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      `;
    });
    this.notificationsList.innerHTML = html;

    list.forEach(n => {
      const el = this.notificationsList.querySelector(`#notif-av-${n.id}`);
      this.renderAvatarInto(n.actor_avatar, el);
    });
  }

  async markAllNotificationsRead() {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      this.notificationsBadge.classList.add('hidden');
      this.loadNotifications();
    } catch (e) {}
  }

  handleNotificationClick(type, targetId, targetType) {
    this.notificationsDropdown.classList.add('hidden');
    if (type === 'like' || type === 'comment' || targetType === 'post') {
      this.switchTab('feed');
      const postEl = document.getElementById(`post-${targetId}`);
      if (postEl) {
        postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (type.startsWith('friend')) {
      this.switchTab('friends');
    } else if (type === 'dm') {
      this.switchTab('chat');
      if (targetId) {
        this.startDmWithUser({ id: targetId, display_name: 'Собеседник' });
      }
    }
  }

  // =========================================================================
  // ANTI-SCAM REPORTING & MODERATION (3 Вкладки: Жалобы, Жители, Статистика)
  // =========================================================================
  openReportModal(targetType, targetId) {
    this.reportTargetType.value = targetType;
    this.reportTargetId.value = targetId;
    this.reportDetails.value = '';
    this.reportModal.classList.remove('hidden');
  }

  async handleSendReport(e) {
    e.preventDefault();
    const payload = {
      target_type: this.reportTargetType.value,
      target_id: this.reportTargetId.value,
      reason: this.reportReason.value,
      details: this.reportDetails.value.trim()
    };

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      alert(data.message || 'Жалоба успешно отправлена');
      this.reportModal.classList.add('hidden');
    } catch (err) {
      alert('Не удалось отправить жалобу: ' + err.message);
    }
  }

  async openModerationModal(tab = 'reports') {
    this.currentAdminTab = tab;
    this.moderationModal.classList.remove('hidden');

    this.adminTabReports.classList.toggle('active', tab === 'reports');
    this.adminTabUsers.classList.toggle('active', tab === 'users');
    this.adminTabStats.classList.toggle('active', tab === 'stats');

    if (tab === 'reports') {
      this.renderAdminReports();
    } else if (tab === 'users') {
      this.renderAdminUsers();
    } else if (tab === 'stats') {
      this.renderAdminStats();
    }
  }

  async renderAdminReports() {
    this.moderationContent.innerHTML = '<div class="spinner"></div>';
    try {
      const res = await fetch('/api/admin/reports', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      const reports = data.reports || [];
      if (this.adminPendingCount) this.adminPendingCount.textContent = reports.length;

      if (reports.length === 0) {
        this.moderationContent.innerHTML = `
          <div style="text-align:center; padding:30px; color:var(--accent-green);">
            <div style="font-size:2rem; margin-bottom:8px;">✅</div>
            <strong>Всё чисто! Активных жалоб нет.</strong>
            <p style="font-size:0.8rem; color:var(--text-dim); margin-top:4px;">Сообщество «Хакасия Онлайн» находится в безопасности.</p>
          </div>
        `;
        return;
      }

      let html = '<div class="reports-list">';
      reports.forEach(r => {
        html += `
          <div class="report-item">
            <div class="report-header">
              <span>От: <strong>${this.escapeHTML(r.reporter_name)}</strong> (@${this.escapeHTML(r.reporter_username)})</span>
              <span>Тип: <strong>${r.target_type} #${r.target_id}</strong></span>
            </div>
            <div class="report-reason">🚨 ${this.escapeHTML(r.reason)}</div>
            ${r.details ? `<div class="report-details">${this.escapeHTML(r.details)}</div>` : ''}
            <div class="report-actions">
              ${r.target_type === 'user' ? `
                <button class="btn-primary" style="background:var(--accent-red); font-size:0.8rem; padding:6px 12px;" onclick="app.banScammerUser(${r.target_id}, '${this.escapeHTML(r.reason)}')">🚫 Заблокировать мошенника</button>
              ` : `
                <button class="btn-primary" style="background:var(--accent-red); font-size:0.8rem; padding:6px 12px;" onclick="app.deleteReportedContent('${r.target_type}', ${r.target_id})">🗑️ Удалить контент</button>
              `}
              <button class="btn-secondary" style="font-size:0.8rem; padding:6px 12px;" onclick="app.openUserProfile(${r.target_id})">Перейти</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
      this.moderationContent.innerHTML = html;
    } catch (e) {
      this.moderationContent.innerHTML = `<div style="color:var(--accent-red); padding:20px;">Ошибка доступа к жалобам.</div>`;
    }
  }

  async renderAdminUsers(q = '') {
    this.moderationContent.innerHTML = '<div class="spinner"></div>';
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      const users = data.users || [];

      let html = `
        <div style="margin-bottom:12px;">
          <input type="text" placeholder="Поиск жителя по нику или имени..." style="width:100%; padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-main);" oninput="app.renderAdminUsers(this.value)" value="${this.escapeHTML(q)}">
        </div>
        <div class="admin-users-list">
      `;

      users.forEach(u => {
        html += `
          <div class="admin-user-row">
            <div class="admin-user-info">
              <div class="admin-user-avatar" id="adm-av-${u.id}">👤</div>
              <div>
                <strong onclick="app.openUserProfile('${u.username}')" style="cursor:pointer;">
                  ${this.escapeHTML(u.display_name)}
                  ${u.is_verified ? '<span class="verified-badge">✔️</span>' : ''}
                  ${u.role === 'admin' ? '<span style="color:var(--solar-gold); font-size:0.75rem; font-weight:800; margin-left:4px;">👑 АДМИН</span>' : ''}
                  ${u.is_banned ? '<span style="color:var(--accent-red); font-size:0.75rem; font-weight:800; margin-left:4px;">🚫 ЗАБАНЕН</span>' : ''}
                </strong>
                <div style="font-size:0.78rem; color:var(--text-dim);">@${this.escapeHTML(u.username)} • 📍 ${this.escapeHTML(u.city || 'Абакан')}</div>
              </div>
            </div>
            <div class="admin-user-btns">
              <button class="btn-secondary btn-sm" onclick="app.toggleUserVerify(${u.id})">
                ${u.is_verified ? 'Снять ✔️' : 'Выдать ✔️'}
              </button>
              ${u.id !== this.currentUser.id ? `
                <button class="btn-secondary btn-sm" onclick="app.toggleUserAdmin(${u.id})">
                  ${u.role === 'admin' ? 'Снять админа' : '👑 Сделать админом'}
                </button>
                <button class="btn-sm" style="background:${u.is_banned ? 'var(--accent-green)' : 'var(--accent-red)'}; color:#fff; border:none; border-radius:var(--radius-sm); padding:4px 8px; cursor:pointer;" onclick="${u.is_banned ? `app.unbanUser(${u.id})` : `app.banScammerUser(${u.id}, 'Мошенничество')`}">
                  ${u.is_banned ? 'Разблокировать' : '🚫 Бан'}
                </button>
              ` : ''}
            </div>
          </div>
        `;
      });

      html += '</div>';
      this.moderationContent.innerHTML = html;

      users.forEach(u => {
        const el = this.moderationContent.querySelector(`#adm-av-${u.id}`);
        this.renderAvatarInto(u.avatar, el);
      });
    } catch (e) {
      this.moderationContent.innerHTML = `<div style="color:var(--accent-red); padding:20px;">Ошибка доступа к управлению пользователями.</div>`;
    }
  }

  async renderAdminStats() {
    this.moderationContent.innerHTML = '<div class="spinner"></div>';
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const s = await res.json();

      this.moderationContent.innerHTML = `
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-num">${s.totalUsers}</div>
            <div class="admin-stat-label">👥 Всего жителей</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${s.verifiedUsers}</div>
            <div class="admin-stat-label">✔️ Проверенных</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${s.totalPosts}</div>
            <div class="admin-stat-label">📰 Публикаций</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${s.totalComments}</div>
            <div class="admin-stat-label">💬 Комментариев</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${s.totalMessages}</div>
            <div class="admin-stat-label">✉️ Сообщений в чате</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${s.pendingReports}</div>
            <div class="admin-stat-label">🚨 Активных жалоб</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${s.bannedUsers}</div>
            <div class="admin-stat-label">🚫 Заблокировано</div>
          </div>
        </div>
        <div style="background:var(--bg-input); padding:16px; border-radius:var(--radius-sm); border:1px solid var(--border-color); font-size:0.85rem; line-height:1.5;">
          <strong>🌐 Сервер «Хакасия Онлайн» работает в штатном режиме.</strong>
          <p style="color:var(--text-dim); margin-top:6px;">Все механизмы защиты активны: антифрод, фильтрация фишинга, rate limiting, шифрование сессий и верификация контента.</p>
        </div>
      `;
    } catch (e) {
      this.moderationContent.innerHTML = `<div style="color:var(--accent-red); padding:20px;">Ошибка загрузки статистики.</div>`;
    }
  }

  async toggleUserVerify(userId) {
    try {
      const res = await fetch(`/api/admin/verify/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      alert(data.message || 'Статус верификации обновлен');
      this.renderAdminUsers();
    } catch (e) {
      alert('Ошибка при изменении верификации');
    }
  }

  async toggleUserAdmin(userId) {
    const ok = await this.showConfirmDialog({
      title: 'Права администратора',
      message: 'Вы точно хотите изменить права администратора для этого жителя республики?',
      confirmText: 'Изменить 👑',
      isDanger: false,
      icon: '👑'
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/toggle-admin/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      alert(data.message || 'Роль обновлена');
      this.renderAdminUsers();
    } catch (e) {
      alert('Ошибка при изменении роли');
    }
  }

  async unbanUser(userId) {
    try {
      const res = await fetch(`/api/admin/unban/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      alert(data.message || 'Пользователь разблокирован');
      this.renderAdminUsers();
    } catch (e) {
      alert('Ошибка при разблокировке');
    }
  }

  async banScammerUser(userId, reason) {
    const ok = await this.showConfirmDialog({
      title: 'Блокировка аккаунта',
      message: 'Вы уверены, что хотите заблокировать этого пользователя за мошенничество? Все его сессии будут прерваны.',
      confirmText: 'Заблокировать 🚫',
      isDanger: true,
      icon: '🚫'
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/ban/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      alert(data.message || 'Пользователь заблокирован');
      if (this.currentAdminTab === 'users') {
        this.renderAdminUsers();
      } else {
        this.renderAdminReports();
      }
    } catch (e) {
      alert('Ошибка при блокировке');
    }
  }

  async deleteReportedContent(type, id) {
    if (type === 'post') {
      await this.deletePost(id);
    }
    this.renderAdminReports();
  }

  handleExternalLinkClick(url) {
    this.externalUrlDisplay.textContent = url;
    this.btnProceedExternalLink.href = url;
    this.externalLinkModal.classList.remove('hidden');
  }

  // =========================================================================
  // USER PROFILE VIEW
  // =========================================================================
  async openUserProfile(identifier, pushState = true) {
    this.switchTab('profile', false);

    try {
      const cleanIdent = String(identifier).replace(/^@/, '');
      if (pushState) {
        history.pushState({ tab: 'profile', username: cleanIdent }, '', `/u/${cleanIdent}`);
      }

      const res = await fetch(`/api/users/${cleanIdent}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!res.ok) throw new Error('Пользователь не найден');

      const data = await res.json();
      const u = data.user;
      this.activeProfileUser = u;

      this.renderAvatarInto(u.avatar, this.profileBigAvatar);
      this.profileDisplayName.textContent = u.display_name;
      this.profileVerifiedBadge.classList.toggle('hidden', !u.is_verified);
      this.profileHandle.textContent = `@${u.username}`;
      this.profileBannedBadge.classList.toggle('hidden', !u.is_banned);
      this.profileCity.textContent = u.city ? `г. ${u.city}, Хакасия` : 'Хакасия';
      this.profileStatusText.textContent = u.is_banned ? '🚫 Заблокирован' : (u.status_text || (u.status === 'online' ? 'В сети' : 'Не в сети'));
      this.profileBio.textContent = u.bio || 'Житель Солнечной Хакасии ☀️';

      // Custom Profile Cover (Photo or GIF)
      if (this.profileCoverImg) {
        this.profileCoverImg.src = u.banner || '/images/khakassia-banner.jpg';
      }

      // Profile Extra Details (Любимое место, Telegram, Дата рождения)
      if (this.profileDetailPlace) {
        if (u.favorite_place) {
          this.profilePlaceVal.textContent = u.favorite_place;
          this.profileDetailPlace.classList.remove('hidden');
        } else {
          this.profileDetailPlace.classList.add('hidden');
        }
      }
      if (this.profileDetailTg) {
        if (u.telegram) {
          const cleanTg = u.telegram.replace(/^@/, '');
          this.profileTgVal.textContent = `@${cleanTg}`;
          this.profileDetailTg.href = `https://t.me/${cleanTg}`;
          this.profileDetailTg.classList.remove('hidden');
        } else {
          this.profileDetailTg.classList.add('hidden');
        }
      }
      if (this.profileDetailBirth) {
        if (u.birth_date) {
          const bDate = new Date(u.birth_date);
          const formatted = isNaN(bDate.getTime()) ? u.birth_date : bDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
          this.profileBirthVal.textContent = formatted;
          this.profileDetailBirth.classList.remove('hidden');
        } else {
          this.profileDetailBirth.classList.add('hidden');
        }
      }

      if (this.profileStatPosts) this.profileStatPosts.textContent = data.stats.postsCount || 0;
      if (this.profileStatFriends) this.profileStatFriends.textContent = data.stats.friendsCount || 0;
      if (this.profileStatMusicCount) this.profileStatMusicCount.textContent = data.stats.tracksCount || 0;

      const isMe = this.currentUser && u.id === this.currentUser.id;
      const isAdmin = this.currentUser && this.currentUser.role === 'admin';
      const isCreator = u.username === 'wechazuv' || u.role === 'admin';

      if (this.profileCreatorBadge) {
        this.profileCreatorBadge.classList.toggle('hidden', !isCreator);
      }
      if (this.btnAdjustCover) {
        this.btnAdjustCover.classList.toggle('hidden', !isMe);
      }
      if (this.profileCoverImg && u.cover_position) {
        this.profileCoverImg.style.objectPosition = u.cover_position;
      }

      // Profile Anthem
      if (this.profileAnthemCard) {
        if (u.profile_music) {
          try {
            const m = typeof u.profile_music === 'string' ? JSON.parse(u.profile_music) : u.profile_music;
            if (this.profileAnthemTitle) this.profileAnthemTitle.textContent = m.title || 'Аудиозапись';
            if (this.profileAnthemArtist) this.profileAnthemArtist.textContent = m.artist || 'Исполнитель';
            this.profileAnthemCard.classList.remove('hidden');
            if (this.btnRemoveProfileAnthem) {
              this.btnRemoveProfileAnthem.classList.toggle('hidden', !isMe);
            }
          } catch (e) {
            this.profileAnthemCard.classList.add('hidden');
          }
        } else {
          this.profileAnthemCard.classList.add('hidden');
        }
      }

      this.btnUploadOwnAvatar.classList.toggle('hidden', !isMe);
      if (this.btnChangeCover) {
        this.btnChangeCover.classList.toggle('hidden', !isMe);
      }

      this.profileActionsContainer.innerHTML = '';
      if (isMe) {
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-secondary';
        btnEdit.innerHTML = '✏️ Редактировать профиль';
        btnEdit.onclick = () => this.openEditProfileModal();
        this.profileActionsContainer.appendChild(btnEdit);
      } else {
        const frStatus = data.friendship.status;
        const btnFriend = document.createElement('button');
        btnFriend.className = 'btn-primary';

        if (frStatus === 'friends') {
          btnFriend.className = 'btn-secondary';
          btnFriend.innerHTML = '✔️ В друзьях';
          btnFriend.onclick = () => this.removeFriend(u.id);
        } else if (frStatus === 'pending_sent') {
          btnFriend.className = 'btn-secondary';
          btnFriend.innerHTML = '⏳ Заявка отправлена';
          btnFriend.onclick = () => this.removeFriend(u.id);
        } else if (frStatus === 'pending_received') {
          btnFriend.innerHTML = '➕ Принять заявку в друзья';
          btnFriend.onclick = () => this.acceptFriendRequest(data.friendship.id);
        } else {
          btnFriend.innerHTML = '➕ Добавить в друзья';
          btnFriend.onclick = () => this.sendFriendRequest(u.id);
        }
        this.profileActionsContainer.appendChild(btnFriend);

        const btnMsg = document.createElement('button');
        btnMsg.className = 'btn-secondary';
        btnMsg.innerHTML = '💬 Написать в ЛС';
        btnMsg.onclick = () => this.startDmWithUser(u);
        this.profileActionsContainer.appendChild(btnMsg);

        // Кнопка блокировки (чёрный список)
        const btnBlock = document.createElement('button');
        btnBlock.className = 'btn-secondary';
        if (data.isBlocked) {
          btnBlock.innerHTML = '🔓 Разблокировать';
          btnBlock.onclick = () => this.unblockUser(u.id);
        } else {
          btnBlock.innerHTML = '🚫 В чёрный список';
          btnBlock.onclick = () => this.blockUser(u.id);
        }
        this.profileActionsContainer.appendChild(btnBlock);

        // Кнопка пожаловаться на мошенника
        const btnReport = document.createElement('button');
        btnReport.className = 'btn-secondary';
        btnReport.style.color = 'var(--accent-red)';
        btnReport.innerHTML = '🚩 Пожаловаться';
        btnReport.onclick = () => this.openReportModal('user', u.id);
        this.profileActionsContainer.appendChild(btnReport);

        // Кнопка бана для администратора
        if (isAdmin && !u.is_banned) {
          const btnBan = document.createElement('button');
          btnBan.className = 'btn-secondary';
          btnBan.style.background = 'rgba(239, 68, 68, 0.2)';
          btnBan.style.color = 'var(--accent-red)';
          btnBan.innerHTML = '🚫 Заблокировать аккаунт';
          btnBan.onclick = () => this.banScammerUser(u.id, 'Мошенничество');
          this.profileActionsContainer.appendChild(btnBan);
        }
      }

      // Private profile gate
      if (data.isPrivateLocked) {
        if (this.privateProfileLockBox) this.privateProfileLockBox.classList.remove('hidden');
        this.profilePostsSubcontent.classList.add('hidden');
        if (this.profileFriendsSubcontent) this.profileFriendsSubcontent.classList.add('hidden');
        if (this.profileMusicSubcontent) this.profileMusicSubcontent.classList.add('hidden');
      } else {
        if (this.privateProfileLockBox) this.privateProfileLockBox.classList.add('hidden');
        this.switchProfileSubtab('posts');
        this.loadUserPosts(u.id);
        this.loadUserFriends(u.id);
      }

    } catch (err) {
      alert('Ошибка загрузки профиля: ' + err.message);
    }
  }

  async loadUserPosts(authorId) {
    this.profilePostsStream.innerHTML = '<div class="spinner"></div>';
    try {
      const res = await fetch(`/api/posts?authorId=${authorId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      const posts = data.posts || [];

      this.profilePostsStream.innerHTML = '';
      if (posts.length === 0) {
        this.profilePostsStream.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);">У пользователя пока нет публикаций.</div>`;
        return;
      }
      posts.forEach(p => {
        this.profilePostsStream.appendChild(this.createPostElement(p));
      });
    } catch (e) {
      console.error(e);
    }
  }

  async loadUserFriends(userId) {
    this.profileFriendsGrid.innerHTML = '<div class="spinner"></div>';
    try {
      const res = await fetch(`/api/users/${userId}/friends`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      const friends = data.friends || [];

      this.profileFriendsGrid.innerHTML = '';
      if (friends.length === 0) {
        this.profileFriendsGrid.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim); grid-column:1/-1;">Список друзей пуст.</div>`;
        return;
      }
      friends.forEach(f => {
        this.profileFriendsGrid.appendChild(this.createUserCard(f));
      });
    } catch (e) {
      console.error(e);
    }
  }

  // =========================================================================
  // FRIENDS TAB & SYSTEM
  // =========================================================================
  async loadFriendsTab() {
    this.checkFriendRequests();
    this.loadMyFriends();
    this.loadAllUsers();
  }

  async checkFriendRequests() {
    try {
      const res = await fetch('/api/friends', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      const incoming = data.incoming || [];

      if (incoming.length > 0) {
        this.friendsRequestsBadge.textContent = incoming.length;
        this.friendsRequestsBadge.classList.remove('hidden');
        this.incomingRequestsSection.classList.remove('hidden');
        this.incomingCount.textContent = incoming.length;

        this.incomingRequestsGrid.innerHTML = '';
        incoming.forEach(req => {
          const card = document.createElement('div');
          card.className = 'user-card-item';
          card.innerHTML = `
            <div class="user-card-top" onclick="app.openUserProfile('${req.username}')">
              <div class="user-pill-avatar" id="req-av-${req.id}" style="width:44px; height:44px;">👤</div>
              <div class="user-card-details">
                <span class="user-card-name">
                  ${this.escapeHTML(req.display_name)}
                  ${req.is_verified ? '<span class="verified-badge">✔️</span>' : ''}
                </span>
                <span class="user-card-handle">@${this.escapeHTML(req.username)}</span>
                <span class="user-card-city">📍 ${this.escapeHTML(req.city || 'Хакасия')}</span>
              </div>
            </div>
            <div class="user-card-actions">
              <button class="btn-primary" style="flex:1;" onclick="app.acceptFriendRequest(${req.request_id})">Принять ✔️</button>
              <button class="btn-secondary" onclick="app.removeFriend(${req.id})">Отклонить</button>
            </div>
          `;
          this.incomingRequestsGrid.appendChild(card);
          this.renderAvatarInto(req.avatar, card.querySelector(`#req-av-${req.id}`));
        });
      } else {
        this.friendsRequestsBadge.classList.add('hidden');
        this.incomingRequestsSection.classList.add('hidden');
      }
    } catch (e) {}
  }

  async loadMyFriends() {
    try {
      const res = await fetch('/api/friends', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      const friends = data.friends || [];
      this.myFriendsCount.textContent = friends.length;

      this.myFriendsGrid.innerHTML = '';
      if (friends.length === 0) {
        this.myFriendsGrid.innerHTML = '<div style="color:var(--text-dim); padding:10px; grid-column:1/-1;">У вас пока нет добавленных друзей. Найдите земляков ниже и добавьте их!</div>';
        return;
      }
      friends.forEach(f => {
        this.myFriendsGrid.appendChild(this.createUserCard(f, true));
      });
    } catch (e) {}
  }

  async loadAllUsers(query = '') {
    try {
      let url = '/api/users';
      if (query) url += `?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      const users = (data.users || []).filter(u => this.currentUser && u.id !== this.currentUser.id);

      this.allUsersGrid.innerHTML = '';
      if (users.length === 0) {
        this.allUsersGrid.innerHTML = '<div style="color:var(--text-dim); padding:10px; grid-column:1/-1;">Никого не найдено.</div>';
        return;
      }
      users.forEach(u => {
        this.allUsersGrid.appendChild(this.createUserCard(u));
      });
    } catch (e) {}
  }

  createUserCard(user, isAlreadyFriend = false) {
    const card = document.createElement('div');
    card.className = 'user-card-item';
    card.id = `user-card-${user.id}`;

    card.innerHTML = `
      <div class="user-card-top" onclick="app.openUserProfile('${user.username}')">
        <div class="user-pill-avatar" id="uc-av-${user.id}" style="width:44px; height:44px;">👤</div>
        <div class="user-card-details">
          <span class="user-card-name">
            ${this.escapeHTML(user.display_name)}
            ${user.is_verified ? '<span class="verified-badge">✔️</span>' : ''}
          </span>
          <span class="user-card-handle">@${this.escapeHTML(user.username)}</span>
          <span class="user-card-city">📍 ${this.escapeHTML(user.city || 'Хакасия')}</span>
        </div>
      </div>
      <div class="user-card-bio">${this.escapeHTML(user.bio || 'Житель Республики Хакасия')}</div>
      <div class="user-card-actions">
        <button class="btn-primary" style="flex:1;" onclick="app.sendFriendRequest(${user.id})">
          ${isAlreadyFriend ? '✔️ В друзьях' : '➕ В друзья'}
        </button>
        <button class="btn-secondary btn-dm-action" title="Написать в личные сообщения" onclick="event.stopPropagation(); app.startDmWithUser({ id: ${user.id}, username: '${this.escapeHTML(user.username)}', display_name: '${this.escapeHTML(user.display_name)}', avatar: '${this.escapeHTML(user.avatar || '')}', city: '${this.escapeHTML(user.city || '')}' })">
          💬 ЛС
        </button>
        <button class="btn-secondary" onclick="app.openUserProfile('${user.username}')">Профиль</button>
      </div>
    `;

    this.renderAvatarInto(user.avatar, card.querySelector(`#uc-av-${user.id}`));
    return card;
  }

  async sendFriendRequest(targetUserId) {
    try {
      const res = await fetch(`/api/friends/request/${targetUserId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        this.showToast(data.error || 'Ошибка при отправке заявки', 'error');
        return;
      }
      const isAlready = data.message && data.message.includes('уже');
      this.showToast(data.message, isAlready ? 'warning' : 'success');

      if (this.currentTab === 'profile' && this.activeProfileUser) {
        this.openUserProfile(this.activeProfileUser.username);
      } else {
        this.loadFriendsTab();
      }
    } catch (e) {
      this.showToast('Ошибка при отправке заявки: ' + e.message, 'error');
    }
  }

  async acceptFriendRequest(requestId) {
    try {
      const res = await fetch(`/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        this.showToast(data.error || 'Ошибка принятия заявки', 'error');
        return;
      }
      this.showToast(data.message, 'success');
      this.loadFriendsTab();
      this.checkFriendRequests();
    } catch (e) {
      this.showToast('Ошибка принятия заявки: ' + e.message, 'error');
    }
  }

  async removeFriend(targetUserId) {
    const ok = await this.showConfirmDialog({
      title: 'Удалить из друзей',
      message: 'Вы уверены, что хотите удалить пользователя из друзей или отменить заявку?',
      confirmText: 'Удалить 👥',
      isDanger: true,
      icon: '👥'
    });
    if (!ok) return;
    try {
      await fetch(`/api/friends/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (this.currentTab === 'profile' && this.activeProfileUser) {
        this.openUserProfile(this.activeProfileUser.username);
      } else {
        this.loadFriendsTab();
      }
    } catch (e) {}
  }

  // =========================================================================
  // CHAT (БЕСЕДКИ ХАКАСИИ + ЛС)
  // =========================================================================
  async loadChannels() {
    if (!this.chatChannelsList) return;
    try {
      const res = await fetch('/api/channels', { headers: { 'Authorization': `Bearer ${this.token}` } });
      const data = await res.json();
      this.channels = data.channels || [];
      this.chatChannelsList.innerHTML = '';

      this.channels.forEach(ch => {
        const item = document.createElement('div');
        const isActive = this.currentChatChannelId === ch.id;
        item.className = `chat-channel-item ${isActive ? 'active' : ''}`;
        item.id = `chat-channel-${ch.id}`;
        item.innerHTML = `
          <div class="channel-icon">${this.escapeHTML(ch.icon || '💬')}</div>
          <div class="channel-info">
            <div class="channel-name">${this.escapeHTML(ch.name)}</div>
            <div class="channel-sub">${this.escapeHTML(ch.description || 'Беседка республики')}</div>
          </div>
        `;
        item.onclick = () => this.switchChannel(ch);
        this.chatChannelsList.appendChild(item);
      });
    } catch (e) {
      console.error('loadChannels error:', e);
    }
  }

  switchChannel(ch) {
    this.currentChatChannelId = ch.id;
    this.currentChatDmUserId = null;
    document.querySelectorAll('.chat-channel-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`chat-channel-${ch.id}`);
    if (el) el.classList.add('active');
    this.chatActiveIcon.textContent = ch.icon || '💬';
    this.chatActiveTitle.textContent = ch.name;
    this.chatActiveSubtitle.textContent = ch.description || 'Беседка Республики Хакасия';
    this.loadChatMessages();
  }

  async loadChatDms() {
    try {
      const [convRes, frRes] = await Promise.all([
        fetch('/api/conversations', { headers: { 'Authorization': `Bearer ${this.token}` } }),
        fetch('/api/friends', { headers: { 'Authorization': `Bearer ${this.token}` } })
      ]);
      const convData = await convRes.json();
      const frData = await frRes.json();

      const map = new Map();
      (convData.conversations || []).forEach(u => map.set(u.id, u));
      (frData.friends || []).forEach(u => map.set(u.id, u));

      const users = Array.from(map.values());
      this.chatDmList.innerHTML = '';

      if (users.length === 0) {
        this.chatDmList.innerHTML = `<span style="font-size:0.75rem; color:var(--text-dim); padding:10px 16px;">Напишите землякам в ЛС или добавьте друзей</span>`;
        return;
      }

      users.forEach(f => {
        const item = document.createElement('div');
        const isActive = this.currentChatDmUserId === f.id;
        const unread = f.unread_count || 0;
        item.className = `chat-channel-item ${isActive ? 'active' : ''}`;
        item.id = `dm-item-${f.id}`;

        let subText = '';
        if (f.last_message) {
          subText = `<span style="${unread > 0 ? 'font-weight:600; color:#fff;' : 'color:var(--text-dim);'}">${this.escapeHTML(f.last_message.substring(0, 26))}</span>`;
        } else {
          subText = `@${this.escapeHTML(f.username)} • ${f.status === 'online' ? '<span style="color:#22c55e;">в сети</span>' : 'не в сети'}`;
        }

        item.innerHTML = `
          <div class="user-pill-avatar" id="dm-av-${f.id}" style="width:34px; height:34px; position:relative; flex-shrink:0;">👤</div>
          <div class="channel-info" style="flex:1; min-width:0;">
            <div class="channel-name" style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600;">
                ${this.escapeHTML(f.display_name)}
                ${f.is_verified ? '<span class="verified-badge">✔️</span>' : ''}
              </span>
            </div>
            <div class="channel-sub" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.75rem;">${subText}</div>
          </div>
          <span class="channel-unread-pill dm-unread-badge ${unread > 0 ? '' : 'hidden'}" id="dm-badge-${f.id}">
            ${unread > 99 ? '99+' : unread}
          </span>
        `;
        item.onclick = () => this.startDmWithUser(f);
        this.chatDmList.appendChild(item);
        this.renderAvatarInto(f.avatar, item.querySelector(`#dm-av-${f.id}`));
      });
    } catch (e) {
      console.error('loadChatDms error:', e);
    }
  }

  startDmWithUser(user) {
    this.switchTab('chat');
    this.currentChatChannelId = null;
    this.currentChatDmUserId = user.id;

    document.querySelectorAll('.chat-channel-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.getElementById(`dm-item-${user.id}`);
    if (activeItem) activeItem.classList.add('active');

    const displayName = user.display_name || user.username || 'Собеседник';
    const usernameText = user.username ? ` (@${user.username})` : '';
    this.chatActiveIcon.textContent = '👤';
    this.chatActiveTitle.textContent = `${displayName}${usernameText}`;
    this.chatActiveSubtitle.textContent = user.city ? `г. ${user.city}, Хакасия` : 'Личный чат';

    // Отмечаем сообщения в диалоге как прочитанные
    this.markDmAsRead(user.id);

    this.loadChatMessages();
    setTimeout(() => {
      if (this.chatMessageInput) this.chatMessageInput.focus();
    }, 150);
  }

  async markDmAsRead(senderId) {
    if (!senderId) return;
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ senderId })
      });
      const badge = document.getElementById(`dm-badge-${senderId}`);
      if (badge) {
        badge.textContent = '0';
        badge.classList.add('hidden');
      }
      this.refreshUnreadChatBadge();
    } catch (e) {}
  }

  async refreshUnreadChatBadge() {
    if (!this.token) return;
    try {
      const res = await fetch('/api/messages/unread-count', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      const count = data.unreadCount || 0;
      this.chatUnreadTotal = count;
      if (this.chatUnreadBadge) {
        if (count > 0) {
          this.chatUnreadBadge.textContent = count > 99 ? '99+' : count;
          this.chatUnreadBadge.classList.remove('hidden');
        } else {
          this.chatUnreadBadge.classList.add('hidden');
        }
      }
    } catch (e) {}
  }

  incrementChatUnreadBadge() {
    this.chatUnreadTotal = (this.chatUnreadTotal || 0) + 1;
    if (this.chatUnreadBadge) {
      this.chatUnreadBadge.textContent = this.chatUnreadTotal > 99 ? '99+' : this.chatUnreadTotal;
      this.chatUnreadBadge.classList.remove('hidden');
    }
  }

  async loadChatMessages() {
    this.chatMessagesList.innerHTML = '<div class="spinner"></div>';
    try {
      let url = '/api/messages?limit=60';
      if (this.currentChatChannelId) url += `&channelId=${this.currentChatChannelId}`;
      else if (this.currentChatDmUserId) url += `&dmUserId=${this.currentChatDmUserId}`;

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.token}` } });
      const data = await res.json();
      this.chatMessages = data.messages || [];

      this.chatMessagesList.innerHTML = '';
      this.chatMessages.forEach(msg => {
        this.appendChatMessageDOM(msg);
      });
      this.scrollChatBottom();
      this.loadChannelPinnedMessage();
    } catch (e) {
      console.error(e);
    }
  }

  async loadChannelPinnedMessage() {
    if (!this.chatPinnedBar) return;
    if (!this.currentChatChannelId) {
      this.chatPinnedBar.classList.add('hidden');
      return;
    }
    try {
      const res = await fetch('/api/channels', { headers: { 'Authorization': `Bearer ${this.token}` } });
      const data = await res.json();
      const ch = (data.channels || []).find(c => c.id === this.currentChatChannelId);
      if (ch && ch.pinned_message) {
        this.renderPinnedMessage(ch.pinned_message);
      } else {
        this.chatPinnedBar.classList.add('hidden');
      }
    } catch (e) {
      this.chatPinnedBar.classList.add('hidden');
    }
  }

  renderPinnedMessage(msg) {
    if (!this.chatPinnedBar || !msg) return;
    this.chatPinnedBar.classList.remove('hidden');
    this.chatPinnedAuthor.textContent = `${msg.sender_display_name || 'Создатель'}:`;
    this.chatPinnedText.textContent = msg.content ? msg.content.slice(0, 100) : (msg.attachment_name || 'Вложение');
    this.chatPinnedContent.onclick = () => {
      const targetEl = document.getElementById(`cmsg-${msg.id}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.style.transition = 'background-color 0.4s';
        targetEl.style.backgroundColor = 'rgba(234, 153, 31, 0.25)';
        setTimeout(() => { targetEl.style.backgroundColor = ''; }, 1500);
      }
    };
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    if (this.btnUnpinChatMsg) {
      this.btnUnpinChatMsg.classList.toggle('hidden', !isAdmin);
      this.btnUnpinChatMsg.onclick = () => this.unpinChatMessage();
    }
  }

  async pinChatMessage(msgId) {
    if (!this.currentChatChannelId) return;
    try {
      const res = await fetch(`/api/channels/${this.currentChatChannelId}/pin-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ messageId: msgId })
      });
      const data = await res.json();
      if (data.success && data.pinnedMessage) {
        this.renderPinnedMessage(data.pinnedMessage);
      }
    } catch (e) {
      alert('Ошибка при закреплении сообщения');
    }
  }

  async unpinChatMessage() {
    if (!this.currentChatChannelId) return;
    try {
      await fetch(`/api/channels/${this.currentChatChannelId}/pin-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ messageId: null })
      });
      this.chatPinnedBar.classList.add('hidden');
    } catch (e) {
      alert('Ошибка при откреплении');
    }
  }

  initStickers() {
    if (!this.stickersGrid) return;
    const stickers = [
      { emoji: '☀️', name: 'Солнце Хакасии' },
      { emoji: '🏔️', name: 'Саяны' },
      { emoji: '🦅', name: 'Степной орёл' },
      { emoji: '🐎', name: 'Дикий мустанг' },
      { emoji: '🏕️', name: 'Юрта степняка' },
      { emoji: '🪕', name: 'Хомыс' },
      { emoji: '🌊', name: 'Озеро Белё' },
      { emoji: '🏊', name: 'Озеро Шира' },
      { emoji: '⚡', name: 'СШГЭС' },
      { emoji: '🗿', name: 'Менгир' },
      { emoji: '🌲', name: 'Кедр сибирский' },
      { emoji: '🐺', name: 'Волк степей' },
      { emoji: '🔥', name: 'Таёжный костёр' },
      { emoji: '🦊', name: 'Лиса Саян' },
      { emoji: '🎉', name: 'Привет землякам!' },
      { emoji: '💖', name: 'Люблю Хакасию!' },
      { emoji: '👍', name: 'Одобряю' },
      { emoji: '🚀', name: 'Вперёд, Хакасия!' }
    ];

    this.stickersGrid.innerHTML = '';
    stickers.forEach(s => {
      const item = document.createElement('div');
      item.className = 'sticker-item';
      item.title = s.name;
      item.innerHTML = `
        <span class="sticker-emoji">${s.emoji}</span>
        <span class="sticker-name">${s.name}</span>
      `;
      item.onclick = () => this.sendSticker(s.emoji, s.name);
      this.stickersGrid.appendChild(item);
    });

    if (this.btnChatStickers) {
      this.btnChatStickers.addEventListener('click', () => {
        this.stickersDrawer.classList.toggle('hidden');
      });
    }

    if (this.btnCloseStickers) {
      this.btnCloseStickers.addEventListener('click', () => {
        this.stickersDrawer.classList.add('hidden');
      });
    }
  }

  sendSticker(emoji, name) {
    if (this.stickersDrawer) this.stickersDrawer.classList.add('hidden');
    const stickerText = `[sticker:${emoji}|${name}]`;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'send_message',
      channelId: this.currentChatChannelId,
      receiverId: this.currentChatDmUserId,
      content: stickerText,
      attachment: null,
      replyToId: this.replyingTo ? this.replyingTo.id : null
    }));
    this.cancelChatReply();
    window.soundFX && window.soundFX.playSend();
  }

  appendChatMessageDOM(msg) {
    const el = document.createElement('div');
    el.className = 'comment-item';
    el.style.padding = '8px 0';
    el.id = `cmsg-${msg.id}`;

    const isMine = this.currentUser && msg.sender_id === this.currentUser.id;
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    let attHtml = '';
    if (msg.attachment_url) {
      if (msg.attachment_type === 'audio' || msg.attachment_url.endsWith('.webm') || msg.attachment_url.endsWith('.ogg') || msg.attachment_url.endsWith('.mp3') || msg.attachment_url.endsWith('.wav')) {
        attHtml = `
          <div class="voice-audio-bubble">
            <audio controls src="${msg.attachment_url}" preload="metadata"></audio>
          </div>
        `;
      } else if (msg.attachment_type === 'image') {
        attHtml = `<div style="margin-top:6px;"><img src="${msg.attachment_url}" style="max-width:260px; border-radius:8px; cursor:pointer;" onclick="app.openLightbox('${msg.attachment_url}')"></div>`;
      } else {
        attHtml = `<div style="margin-top:6px;"><a href="${msg.attachment_url}" target="_blank" style="color:var(--solar-gold); font-size:0.85rem;">📎 ${this.escapeHTML(msg.attachment_name || 'Скачать файл')}</a></div>`;
      }
    }

    let msgContentHtml = '';
    const stickerMatch = msg.content && msg.content.match(/^\[sticker:(.*?)\|(.*?)\]$/);
    if (stickerMatch) {
      const [, sEmoji, sTag] = stickerMatch;
      msgContentHtml = `
        <div class="chat-sticker-bubble">
          <span class="sticker-big-emoji">${sEmoji}</span>
          <span class="sticker-tag">${this.escapeHTML(sTag)}</span>
        </div>
      `;
    } else {
      msgContentHtml = `<div class="comment-text">${this.formatMessageText(msg.content)}</div>`;
    }

    el.innerHTML = `
      <div class="user-pill-avatar" id="msg-av-${msg.id}" style="width:36px; height:36px;" onclick="app.openUserProfile('${msg.sender_username}')">👤</div>
      <div class="comment-bubble" style="flex:1;">
        <div class="comment-meta">
          <span class="comment-author" onclick="app.openUserProfile('${msg.sender_username}')">
            ${this.escapeHTML(msg.sender_display_name)}
            ${msg.sender_is_verified ? '<span class="verified-badge">✔️</span>' : ''}
          </span>
          <span class="comment-handle">@${this.escapeHTML(msg.sender_username)}</span>
          <span class="comment-time">${time}</span>
          ${isAdmin && this.currentChatChannelId ? `
            <button class="btn-icon-xs" style="margin-left:auto; color:var(--solar-gold);" title="Закрепить сообщение в общем чате" onclick="app.pinChatMessage(${msg.id})">📌</button>
          ` : ''}
          ${isMine || isAdmin ? `
            <button class="btn-icon-xs" style="${isAdmin && this.currentChatChannelId ? '' : 'margin-left:auto;'} color:var(--text-dim);" title="Удалить сообщение" onclick="app.deleteChatMessage(${msg.id})">🗑️</button>
          ` : ''}
          <button class="btn-icon-xs" style="color:var(--text-dim);" title="Пожаловаться на мошенничество" onclick="app.openReportModal('message', ${msg.id})">🚩</button>
        </div>
        ${msgContentHtml}
        ${attHtml}
      </div>
    `;

    this.chatMessagesList.appendChild(el);
    this.renderAvatarInto(msg.sender_avatar, el.querySelector(`#msg-av-${msg.id}`));
  }

  async deleteChatMessage(msgId) {
    const ok = await this.showConfirmDialog({
      title: 'Удаление сообщения',
      message: 'Вы уверены, что хотите удалить это сообщение из чата?',
      confirmText: 'Удалить 🗑️',
      isDanger: true,
      icon: '🗑️'
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (data.success) {
        const el = document.getElementById(`cmsg-${msgId}`);
        if (el) el.remove();
      }
    } catch (e) {
      alert('Ошибка при удалении сообщения');
    }
  }

  // Voice recording
  async startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };

      this.mediaRecorder.start();
      this.voiceRecordingBar.classList.remove('hidden');
      this.recordSeconds = 0;
      this.recordingTimer.textContent = '00:00';
      this.recordTimer = setInterval(() => {
        this.recordSeconds++;
        const m = String(Math.floor(this.recordSeconds / 60)).padStart(2, '0');
        const s = String(this.recordSeconds % 60).padStart(2, '0');
        this.recordingTimer.textContent = `${m}:${s}`;
      }, 1000);
    } catch (err) {
      alert('Не удалось получить доступ к микрофону: ' + err.message);
    }
  }

  cancelVoiceRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    clearInterval(this.recordTimer);
    this.audioChunks = [];
    this.voiceRecordingBar.classList.add('hidden');
  }

  async sendVoiceRecording() {
    if (!this.mediaRecorder) return;
    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      await new Promise(r => setTimeout(r, 200));
    }
    clearInterval(this.recordTimer);
    this.voiceRecordingBar.classList.add('hidden');

    if (this.audioChunks.length === 0) return;

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob, `voice_${Date.now()}.webm`);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        alert('Чат не подключен');
        return;
      }

      this.ws.send(JSON.stringify({
        type: 'send_message',
        channelId: this.currentChatChannelId,
        receiverId: this.currentChatDmUserId,
        content: '🎙️ Голосовое сообщение',
        attachment: {
          url: data.url,
          name: 'Голосовое сообщение',
          type: 'audio'
        }
      }));
    } catch (err) {
      alert('Ошибка отправки голосового сообщения: ' + err.message);
    }
  }

  onNewChatMessage(msg) {
    const myId = this.currentUser ? this.currentUser.id : null;
    const isFromMe = (msg.sender_id === myId);

    // Активен ли в данный момент этот чат / ЛС на экране?
    const isCurrentChannel = (
      this.currentTab === 'chat' &&
      this.currentChatChannelId &&
      msg.channel_id === this.currentChatChannelId
    );

    const isCurrentDm = (
      this.currentTab === 'chat' &&
      this.currentChatDmUserId && (
        (msg.sender_id === this.currentChatDmUserId && msg.receiver_id === myId) ||
        (msg.sender_id === myId && msg.receiver_id === this.currentChatDmUserId)
      )
    );

    // 1. Сообщение внутри открытого диалога
    if (isCurrentChannel || isCurrentDm) {
      this.appendChatMessageDOM(msg);
      this.scrollChatBottom();
      if (!isFromMe) {
        window.soundFX && window.soundFX.playReceive();
        if (isCurrentDm) {
          this.markDmAsRead(msg.sender_id);
        }
      }
      return;
    }

    // Сообщения от самого себя не требуют фоновых уведомлений
    if (isFromMe) return;

    // 2. Входящее личное сообщение (ЛС)
    if (msg.receiver_id === myId) {
      window.soundFX && window.soundFX.playReceive();

      const senderName = msg.sender_display_name || msg.sender_username || 'Земляк';
      const previewText = msg.content || (msg.attachment_type === 'voice' ? '🎤 Голосовое сообщение' : '📎 Вложение');

      // Показываем интерактивное всплывающее уведомление
      this.showToast({
        title: `💬 Сообщение от ${senderName}`,
        message: previewText,
        type: 'message',
        avatar: msg.sender_avatar,
        duration: 7000,
        onClick: () => {
          this.startDmWithUser({
            id: msg.sender_id,
            username: msg.sender_username,
            display_name: msg.sender_display_name,
            avatar: msg.sender_avatar
          });
        }
      });

      // Увеличиваем общий бейдж чата в навигационной панели
      this.incrementChatUnreadBadge();

      // Обновляем диалог в боковой панели (перемещаем наверх и ставим бейдж)
      this.updateDmItemOnIncomingMessage(msg);
      return;
    }

    // 3. Сообщение в общем чате / канале (когда пользователь на другой вкладке)
    if (msg.channel_id) {
      window.soundFX && window.soundFX.playPop();

      if (this.currentTab !== 'chat') {
        this.incrementChatUnreadBadge();
      }

      // Если вкладка чат открыта, но открыт другой канал или ЛС — помечаем канал
      const chItem = document.getElementById(msg.channel_id === 1 ? 'chatGeneralChannelBtn' : `chat-channel-${msg.channel_id}`);
      if (chItem && !chItem.classList.contains('active')) {
        let pill = chItem.querySelector('.channel-unread-pill');
        if (!pill) {
          pill = document.createElement('span');
          pill.className = 'channel-unread-pill';
          pill.textContent = '1';
          chItem.appendChild(pill);
        } else {
          pill.classList.remove('hidden');
          const current = parseInt(pill.textContent) || 0;
          pill.textContent = (current + 1).toString();
        }
      }
    }
  }

  updateDmItemOnIncomingMessage(msg) {
    if (!this.chatDmList) return;
    const senderId = msg.sender_id;
    const item = document.getElementById(`dm-item-${senderId}`);

    if (item) {
      this.chatDmList.prepend(item);
      const badge = item.querySelector('.dm-unread-badge');
      if (badge) {
        const count = (parseInt(badge.textContent) || 0) + 1;
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      }
      const sub = item.querySelector('.channel-sub');
      if (sub) {
        sub.innerHTML = `<span style="font-weight:600; color:#fff;">${this.escapeHTML((msg.content || '📎 Вложение').substring(0, 26))}</span>`;
      }
    } else {
      this.loadChatDms();
    }
  }

  scrollChatBottom() {
    this.chatMessagesContainer.scrollTop = this.chatMessagesContainer.scrollHeight;
  }

  async handleSendChatMessage(e) {
    e.preventDefault();
    const content = this.chatMessageInput.value.trim();
    if (!content && !this.pendingChatAttachment) return;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      alert('Подключение к чату восстанавливается...');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'send_message',
      channelId: this.currentChatChannelId,
      receiverId: this.currentChatDmUserId,
      content,
      attachment: this.pendingChatAttachment
    }));

    this.chatMessageInput.value = '';
    this.clearChatAttachment();
    window.soundFX && window.soundFX.playSend();
  }

  async handleChatFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);
    this.chatAttachmentText.textContent = `Загрузка ${file.name}...`;
    this.chatAttachmentBar.classList.remove('hidden');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.pendingChatAttachment = data;
      this.chatAttachmentText.textContent = `📎 ${data.name}`;
    } catch (err) {
      alert('Ошибка прикрепления файла: ' + err.message);
      this.clearChatAttachment();
    }
  }

  clearChatAttachment() {
    this.pendingChatAttachment = null;
    this.chatAttachmentBar.classList.add('hidden');
    this.chatFileInput.value = '';
  }

  cancelChatReply() {
    this.replyingTo = null;
    this.chatReplyBar.classList.add('hidden');
  }

  // =========================================================================
  // AVATAR UPLOAD & PROFILE EDIT MODALS
  // =========================================================================
  handleCustomAvatarPreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      this.cropCirclePreview.innerHTML = `<img src="${event.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
  }

  async handleSaveCustomAvatar(e) {
    e.preventDefault();
    const file = this.customAvatarFileInput.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('avatar', file);

    try {
      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.currentUser = data.user;
      this.updateNavbarUser();
      this.avatarUploadModal.classList.add('hidden');
      if (this.currentTab === 'profile') {
        this.openUserProfile(this.currentUser.username);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async handleCoverUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('banner', file);

    try {
      const res = await fetch('/api/upload-banner', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки обложки');

      if (this.currentUser) {
        this.currentUser.banner = data.bannerUrl;
      }
      if (this.profileCoverImg) {
        this.profileCoverImg.src = data.bannerUrl;
      }
      this.coverFileInput.value = '';
    } catch (err) {
      alert('Ошибка при загрузке обложки: ' + err.message);
    }
  }

  openEditProfileModal() {
    const u = this.currentUser;
    if (!u) return;

    this.editDisplayName.value = u.display_name || '';
    if (this.editCitySelect) {
      const knownCities = Array.from(this.editCitySelect.options).map(o => o.value);
      if (knownCities.includes(u.city)) {
        this.editCitySelect.value = u.city;
        this.editCityCustom.classList.add('hidden');
      } else if (u.city) {
        this.editCitySelect.value = 'custom';
        this.editCityCustom.value = u.city;
        this.editCityCustom.classList.remove('hidden');
      } else {
        this.editCitySelect.value = 'Абакан';
        this.editCityCustom.classList.add('hidden');
      }
    }
    this.editBio.value = u.bio || '';
    this.editStatusText.value = u.status_text || '';
    if (this.editFavoritePlace) this.editFavoritePlace.value = u.favorite_place || '';
    if (this.editTelegram) this.editTelegram.value = u.telegram ? `@${u.telegram.replace(/^@/, '')}` : '';
    if (this.editBirthDate) this.editBirthDate.value = u.birth_date || '';
    if (this.editIsPrivate) this.editIsPrivate.checked = Boolean(u.is_private);

    this.editProfileModal.classList.remove('hidden');
  }

  async handleSaveProfileEdit(e) {
    e.preventDefault();

    let cityVal = this.editCitySelect ? this.editCitySelect.value : (this.editCity ? this.editCity.value : '');
    if (cityVal === 'custom') {
      cityVal = this.editCityCustom.value.trim() || 'Хакасия';
    }

    const payload = {
      display_name: this.editDisplayName.value.trim(),
      city: cityVal,
      bio: this.editBio.value.trim(),
      status_text: this.editStatusText.value.trim(),
      favorite_place: this.editFavoritePlace ? this.editFavoritePlace.value.trim() : '',
      telegram: this.editTelegram ? this.editTelegram.value.trim().replace(/^@/, '') : '',
      birth_date: this.editBirthDate ? this.editBirthDate.value.trim() : '',
      is_private: this.editIsPrivate ? (this.editIsPrivate.checked ? 1 : 0) : 0
    };

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.currentUser = data.user;
      this.updateNavbarUser();
      this.editProfileModal.classList.add('hidden');
      this.openUserProfile(this.currentUser.username);
    } catch (err) {
      alert(err.message);
    }
  }

  // =========================================================================
  // AUTH
  // =========================================================================
  switchAuthTab(tab) {
    this.authTabLogin.classList.toggle('active', tab === 'login');
    this.authTabRegister.classList.toggle('active', tab === 'register');
    this.loginForm.classList.toggle('hidden', tab !== 'login');
    this.registerForm.classList.toggle('hidden', tab !== 'register');
    this.loginError.classList.add('hidden');
    this.regError.classList.add('hidden');
  }

  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    this.loginError.classList.add('hidden');
    const btn = document.getElementById('btnLoginSubmit');
    btn.disabled = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('pulse_token', this.token);

      this.hideAuthModal();
      this.updateNavbarUser();
      if (this.currentUser.role === 'admin') {
        this.btnOpenModeration.classList.remove('hidden');
      }
      this.initWebSocket();
      this.loadNotifications();
      this.refreshUnreadChatBadge();
      setInterval(() => {
        this.loadNotifications();
        this.refreshUnreadChatBadge();
      }, 15000);
      this.switchTab('feed');
      this.checkFriendRequests();
    } catch (err) {
      this.loginError.textContent = err.message;
      this.loginError.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const display_name = document.getElementById('regDisplayName').value.trim();
    const city = document.getElementById('regCity').value;
    const password = document.getElementById('regPassword').value;
    const selAv = document.querySelector('#regAvatarPresets .avatar-option.selected');
    const avatar = selAv ? selAv.dataset.avatar : 'preset:cat';

    this.regError.classList.add('hidden');
    const btn = document.getElementById('btnRegisterSubmit');
    btn.disabled = true;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, display_name, city, password, avatar })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('pulse_token', this.token);

      this.hideAuthModal();
      this.updateNavbarUser();
      this.initWebSocket();
      this.loadNotifications();
      this.refreshUnreadChatBadge();
      setInterval(() => {
        this.loadNotifications();
        this.refreshUnreadChatBadge();
      }, 15000);
      this.handleRoute(window.location.pathname);
      this.checkFriendRequests();
    } catch (err) {
      this.regError.textContent = err.message;
      this.regError.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  }

  async handleLogout() {
    const ok = await this.showConfirmDialog({
      title: 'Выход из профиля',
      message: 'Вы уверены, что хотите выйти из аккаунта?',
      confirmText: 'Выйти',
      isDanger: false,
      icon: '🚪'
    });
    if (!ok) return;
    localStorage.removeItem('pulse_token');
    window.location.reload();
  }

  showConfirmDialog({
    title = 'Подтвердите действие',
    message = 'Вы уверены, что хотите продолжить?',
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    isDanger = true,
    icon = '⚠️'
  } = {}) {
    return new Promise((resolve) => {
      const modal = document.getElementById('customConfirmModal');
      if (!modal) {
        resolve(window.confirm(`${title}\n${message}`));
        return;
      }
      const titleEl = document.getElementById('confirmTitle');
      const msgEl = document.getElementById('confirmMessage');
      const iconEl = document.getElementById('confirmIcon');
      const okBtn = document.getElementById('btnConfirmOk');
      const cancelBtn = document.getElementById('btnConfirmCancel');

      titleEl.textContent = title;
      msgEl.textContent = message;
      iconEl.textContent = icon;
      okBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      if (isDanger) {
        okBtn.style.background = 'var(--accent-red)';
      } else {
        okBtn.style.background = 'var(--solar-gradient)';
      }

      modal.classList.remove('hidden');

      const cleanup = (val) => {
        modal.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(val);
      };

      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  // =========================================================================
  // UTILITIES & LINK PHISHING GUARD
  // =========================================================================
  formatMessageText(text) {
    if (!text) return '';
    let html = this.escapeHTML(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Безопасность: перехват кликов по внешним ссылкам (защита от фишинга)
    html = html.replace(/(https?:\/\/[^\s]+)/g, (match, url) => {
      return `<a href="javascript:void(0)" onclick="app.handleExternalLinkClick('${this.escapeHTML(url)}')">${this.escapeHTML(url)}</a>`;
    });

    html = html.replace(/(@[a-zA-Z0-9_]+)/g, '<span style="color:var(--solar-gold); font-weight:600; cursor:pointer;" onclick="app.openUserProfile(\'$1\')">$1</span>');
    html = html.replace(/#([а-яёa-zA-Z0-9_]+)/g, (match, tag) => {
      return `<span class="hashtag-link" onclick="app.filterByTag('${tag}')">#${tag}</span>`;
    });
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  escapeHTML(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  openLightbox(url) {
    this.lightboxImg.src = url;
    this.imageLightbox.classList.remove('hidden');
  }

  // =========================================================================
  // MUSIC SYSTEM & GLOBAL AUDIO PLAYER
  // =========================================================================
  initMusicPlayer() {
    if (!this.globalMusicPlayer) return;

    this.audioPlayer.addEventListener('timeupdate', () => {
      const cur = this.audioPlayer.currentTime;
      const dur = this.audioPlayer.duration;
      if (this.playerCurrentTime) this.playerCurrentTime.textContent = this.formatAudioTime(cur);
      if (this.playerProgressFill && dur > 0) {
        this.playerProgressFill.style.width = `${(cur / dur) * 100}%`;
      }
    });

    this.audioPlayer.addEventListener('loadedmetadata', () => {
      if (this.playerTotalTime) this.playerTotalTime.textContent = this.formatAudioTime(this.audioPlayer.duration);
    });

    this.audioPlayer.addEventListener('play', () => {
      if (this.playerBtnPlay) this.playerBtnPlay.textContent = '⏸️';
      if (this.playerCoverDisc) this.playerCoverDisc.classList.add('rotating');
    });

    this.audioPlayer.addEventListener('pause', () => {
      if (this.playerBtnPlay) this.playerBtnPlay.textContent = '▶️';
      if (this.playerCoverDisc) this.playerCoverDisc.classList.remove('rotating');
    });

    this.audioPlayer.addEventListener('ended', () => {
      this.playNextTrack();
    });

    if (this.playerBtnPlay) {
      this.playerBtnPlay.addEventListener('click', () => {
        if (this.audioPlayer.paused) {
          if (this.audioPlayer.src) this.audioPlayer.play();
          else if (this.currentPlaylist.length > 0) this.playTrack(this.currentPlaylist[0]);
        } else {
          this.audioPlayer.pause();
        }
      });
    }

    if (this.playerBtnPrev) {
      this.playerBtnPrev.addEventListener('click', () => this.playPrevTrack());
    }
    if (this.playerBtnNext) {
      this.playerBtnNext.addEventListener('click', () => this.playNextTrack());
    }

    if (this.playerProgressWrap) {
      this.playerProgressWrap.addEventListener('click', (e) => {
        const rect = this.playerProgressWrap.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        if (this.audioPlayer.duration) {
          this.audioPlayer.currentTime = pos * this.audioPlayer.duration;
        }
      });
    }

    if (this.playerVolumeSlider) {
      this.playerVolumeSlider.addEventListener('input', (e) => {
        this.audioPlayer.volume = Number(e.target.value);
      });
    }

    if (this.playerBtnClose) {
      this.playerBtnClose.addEventListener('click', () => {
        this.audioPlayer.pause();
        this.globalMusicPlayer.classList.add('hidden');
      });
    }

    if (this.playerBtnSave) {
      this.playerBtnSave.addEventListener('click', () => {
        if (this.currentPlayingTrack) {
          this.toggleSaveTrack(this.currentPlayingTrack);
        }
      });
    }

    if (this.playerBtnSetAnthem) {
      this.playerBtnSetAnthem.addEventListener('click', () => {
        if (this.currentPlayingTrack) {
          this.setTrackAsProfileAnthem(this.currentPlayingTrack);
        }
      });
    }

    // Music Search & Genre Chips
    if (this.musicSearchInput) {
      let musicDebounce = null;
      this.musicSearchInput.addEventListener('input', () => {
        const q = this.musicSearchInput.value.trim();
        if (this.btnClearMusicSearch) this.btnClearMusicSearch.classList.toggle('hidden', !q);
        clearTimeout(musicDebounce);
        musicDebounce = setTimeout(() => this.loadMusicList(), 350);
      });
    }
    if (this.btnClearMusicSearch) {
      this.btnClearMusicSearch.addEventListener('click', () => {
        this.musicSearchInput.value = '';
        this.btnClearMusicSearch.classList.add('hidden');
        this.loadMusicList();
      });
    }

    if (this.musicGenreChips) {
      this.musicGenreChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.genre-chip');
        if (!chip) return;
        this.musicGenreChips.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeMusicGenre = chip.dataset.genre;
        this.loadMusicList();
      });
    }

    // Upload Track Modal
    if (this.btnOpenUploadMusic) {
      this.btnOpenUploadMusic.addEventListener('click', () => {
        this.uploadTrackModal.classList.remove('hidden');
      });
    }
    if (this.btnCloseUploadTrack) {
      this.btnCloseUploadTrack.addEventListener('click', () => this.uploadTrackModal.classList.add('hidden'));
    }
    if (this.btnCancelUploadTrack) {
      this.btnCancelUploadTrack.addEventListener('click', () => this.uploadTrackModal.classList.add('hidden'));
    }
    if (this.uploadTrackForm) {
      this.uploadTrackForm.addEventListener('submit', (e) => this.handleUploadTrack(e));
    }
  }

  formatAudioTime(sec) {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  async loadMusicList() {
    if (!this.musicTracksList) return;
    this.musicTracksList.innerHTML = '<div class="spinner"></div>';
    try {
      const q = this.musicSearchInput ? this.musicSearchInput.value.trim() : '';
      let url = '/api/music?';
      if (this.activeMusicGenre === 'saved') {
        url += 'mySaved=1&';
      } else if (this.activeMusicGenre && this.activeMusicGenre !== 'all') {
        url += `genre=${encodeURIComponent(this.activeMusicGenre)}&`;
      }
      if (q) url += `q=${encodeURIComponent(q)}&`;

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.token}` } });
      const data = await res.json();
      this.currentPlaylist = data.tracks || [];

      this.musicTracksList.innerHTML = '';
      if (this.currentPlaylist.length === 0) {
        this.musicTracksList.innerHTML = `
          <div style="text-align:center; padding:40px 20px; color:var(--text-dim);">
            <div style="font-size:2.5rem; margin-bottom:10px;">🎶</div>
            <strong>Треков не найдено</strong>
            <p style="font-size:0.85rem; margin-top:6px;">Загрузите свой любимый трек или выберите другой жанр!</p>
          </div>
        `;
        return;
      }

      this.currentPlaylist.forEach((track) => {
        const el = this.createTrackElement(track);
        this.musicTracksList.appendChild(el);
      });
    } catch (e) {
      console.error('Load music error:', e);
    }
  }

  createTrackElement(track, isProfile = false) {
    const item = document.createElement('div');
    const isPlaying = this.currentPlayingTrack && this.currentPlayingTrack.id === track.id && !this.audioPlayer.paused;
    item.className = `track-item ${isPlaying ? 'playing' : ''}`;
    item.id = `track-item-${track.id}`;

    item.innerHTML = `
      <button type="button" class="track-play-btn" title="Слушать">
        ${isPlaying ? '⏸️' : '▶️'}
      </button>
      <div class="track-info">
        <div class="track-title">${this.escapeHTML(track.title)}</div>
        <div class="track-artist">${this.escapeHTML(track.artist)}</div>
      </div>
      <span class="track-genre-tag">${this.escapeHTML(track.genre || 'Хакасия')}</span>
      <span style="font-size:0.75rem; color:var(--text-dim);">${this.escapeHTML(track.duration || '03:15')}</span>
      <div class="track-actions">
        <button type="button" class="track-btn-save ${track.is_saved ? 'saved' : ''}" title="${track.is_saved ? 'Удалить из сохранённых' : 'Сохранить трек'}">
          ${track.is_saved ? '⭐' : '🤍'}
        </button>
        <button type="button" class="track-btn-anthem" title="Поставить аудиозапись в свой профиль">
          👑 В профиль
        </button>
      </div>
    `;

    const btnPlay = item.querySelector('.track-play-btn');
    btnPlay.onclick = () => {
      if (this.currentPlayingTrack && this.currentPlayingTrack.id === track.id) {
        if (this.audioPlayer.paused) this.audioPlayer.play();
        else this.audioPlayer.pause();
      } else {
        this.playTrack(track);
      }
    };

    const btnSave = item.querySelector('.track-btn-save');
    btnSave.onclick = (e) => {
      e.stopPropagation();
      this.toggleSaveTrack(track, btnSave);
    };

    const btnAnthem = item.querySelector('.track-btn-anthem');
    btnAnthem.onclick = (e) => {
      e.stopPropagation();
      this.setTrackAsProfileAnthem(track);
    };

    return item;
  }

  playTrack(track) {
    if (!track) return;
    this.currentPlayingTrack = track;
    this.currentTrackIndex = this.currentPlaylist.findIndex(t => t.id === track.id);

    if (this.globalMusicPlayer) this.globalMusicPlayer.classList.remove('hidden');
    if (this.playerTrackTitle) this.playerTrackTitle.textContent = track.title;
    if (this.playerTrackArtist) this.playerTrackArtist.textContent = track.artist;
    if (this.playerBtnSave) this.playerBtnSave.textContent = track.is_saved ? '⭐' : '🤍';

    this.audioPlayer.src = track.audio_url;
    this.audioPlayer.play().catch(e => console.warn('Audio play error:', e));

    document.querySelectorAll('.track-item').forEach(el => {
      el.classList.remove('playing');
      const b = el.querySelector('.track-play-btn');
      if (b) b.textContent = '▶️';
    });
    const curEl = document.getElementById(`track-item-${track.id}`);
    if (curEl) {
      curEl.classList.add('playing');
      const b = curEl.querySelector('.track-play-btn');
      if (b) b.textContent = '⏸️';
    }
  }

  playNextTrack() {
    if (this.currentPlaylist.length === 0) return;
    let nextIdx = this.currentTrackIndex + 1;
    if (nextIdx >= this.currentPlaylist.length) nextIdx = 0;
    this.playTrack(this.currentPlaylist[nextIdx]);
  }

  playPrevTrack() {
    if (this.currentPlaylist.length === 0) return;
    let prevIdx = this.currentTrackIndex - 1;
    if (prevIdx < 0) prevIdx = this.currentPlaylist.length - 1;
    this.playTrack(this.currentPlaylist[prevIdx]);
  }

  async toggleSaveTrack(track, btnEl = null) {
    const isSaved = Boolean(track.is_saved);
    const method = isSaved ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/music/${track.id}/save`, {
        method,
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      track.is_saved = !isSaved;
      if (btnEl) {
        btnEl.textContent = track.is_saved ? '⭐' : '🤍';
        btnEl.classList.toggle('saved', track.is_saved);
      }
      if (this.playerBtnSave && this.currentPlayingTrack && this.currentPlayingTrack.id === track.id) {
        this.playerBtnSave.textContent = track.is_saved ? '⭐' : '🤍';
      }
      if (this.profileStatMusicCount && this.activeProfileUser && this.currentUser && this.activeProfileUser.id === this.currentUser.id) {
        this.profileStatMusicCount.textContent = data.count;
      }
    } catch (e) {
      alert('Ошибка при сохранении трека');
    }
  }

  async setTrackAsProfileAnthem(track) {
    try {
      const trackData = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        audio_url: track.audio_url
      };
      const res = await fetch('/api/users/profile-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ profile_music: JSON.stringify(trackData) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (this.currentUser) this.currentUser.profile_music = JSON.stringify(trackData);
      alert(`Трек "${track.title}" установлен в ваш профиль! 🌟`);
    } catch (e) {
      alert('Ошибка установки трека в профиль');
    }
  }

  async handleUploadTrack(e) {
    e.preventDefault();
    const file = this.trackFileInput.files[0];
    if (!file) return alert('Выберите аудиофайл');

    const title = this.trackTitleInput.value.trim();
    const artist = this.trackArtistInput.value.trim();
    const genre = this.trackGenreSelect.value;

    const fd = new FormData();
    fd.append('audio', file);
    fd.append('title', title);
    fd.append('artist', artist);
    fd.append('genre', genre);

    const btn = document.getElementById('btnSubmitUploadTrack');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Загрузка...';
    }

    try {
      const res = await fetch('/api/music/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки трека');

      this.uploadTrackModal.classList.add('hidden');
      this.uploadTrackForm.reset();
      alert('Трек успешно опубликован и добавлен в вашу музыку! 🎵');
      this.loadMusicList();
      window.soundFX && window.soundFX.playSend();
    } catch (err) {
      alert(err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Опубликовать трек 🚀';
      }
    }
  }

  // =========================================================================
  // CHANNELS, COVER POSITION, ANTHEM, USER BLOCKING, CITIES FILTER
  // =========================================================================
  initChannelEvents() {
    if (this.btnOpenCreateChannel) {
      this.btnOpenCreateChannel.addEventListener('click', () => {
        this.createChannelModal.classList.remove('hidden');
      });
    }
    if (this.btnCloseCreateChannel) {
      this.btnCloseCreateChannel.addEventListener('click', () => this.createChannelModal.classList.add('hidden'));
    }
    if (this.btnCancelCreateChannel) {
      this.btnCancelCreateChannel.addEventListener('click', () => this.createChannelModal.classList.add('hidden'));
    }
    if (this.channelEmojiPicker) {
      this.channelEmojiPicker.addEventListener('click', (e) => {
        const opt = e.target.closest('.emoji-opt');
        if (!opt) return;
        this.channelEmojiPicker.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        if (this.newChannelIcon) this.newChannelIcon.value = opt.dataset.icon || opt.textContent.trim();
      });
    }
    if (this.createChannelForm) {
      this.createChannelForm.addEventListener('submit', (e) => this.handleCreateChannel(e));
    }
  }

  async handleCreateChannel(e) {
    e.preventDefault();
    const name = this.newChannelName.value.trim();
    const description = this.newChannelDesc.value.trim();
    const icon = this.newChannelIcon.value.trim() || '💬';

    if (!name) return alert('Введите название чата');

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ name, description, icon })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка создания чата');

      this.createChannelModal.classList.add('hidden');
      this.newChannelName.value = '';
      this.newChannelDesc.value = '';
      await this.loadChannels();
      this.switchChannel(data.channel);
      window.soundFX && window.soundFX.playSend();
    } catch (err) {
      alert(err.message);
    }
  }

  initCoverAdjustEvents() {
    if (this.btnAdjustCover) {
      this.btnAdjustCover.addEventListener('click', () => {
        this.adjustCoverModal.classList.remove('hidden');
      });
    }
    if (this.btnCloseAdjustCover) {
      this.btnCloseAdjustCover.addEventListener('click', () => this.adjustCoverModal.classList.add('hidden'));
    }
    if (this.btnCancelAdjustCover) {
      this.btnCancelAdjustCover.addEventListener('click', () => this.adjustCoverModal.classList.add('hidden'));
    }

    document.querySelectorAll('.cover-pos-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pos = btn.dataset.pos;
        if (this.profileCoverImg) {
          this.profileCoverImg.style.objectPosition = pos;
        }
        try {
          await fetch('/api/users/cover-position', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ cover_position: pos })
          });
          if (this.currentUser) this.currentUser.cover_position = pos;
          this.adjustCoverModal.classList.add('hidden');
        } catch (e) {
          console.error('Save cover position error:', e);
        }
      });
    });
  }

  initProfileAnthemEvents() {
    if (this.btnProfileAnthemPlay) {
      this.btnProfileAnthemPlay.addEventListener('click', () => {
        if (this.activeProfileUser && this.activeProfileUser.profile_music) {
          try {
            const track = typeof this.activeProfileUser.profile_music === 'string'
              ? JSON.parse(this.activeProfileUser.profile_music)
              : this.activeProfileUser.profile_music;
            this.playTrack(track);
          } catch (e) {
            console.error(e);
          }
        }
      });
    }
    if (this.btnRemoveProfileAnthem) {
      this.btnRemoveProfileAnthem.addEventListener('click', async () => {
        try {
          await fetch('/api/users/profile-music', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ profile_music: '' })
          });
          if (this.currentUser) this.currentUser.profile_music = '';
          this.profileAnthemCard.classList.add('hidden');
        } catch (e) {}
      });
    }

    if (this.profileStatMusicBox) {
      this.profileStatMusicBox.addEventListener('click', () => {
        this.switchProfileSubtab('music');
      });
    }

    if (this.subtabMusic) {
      this.subtabMusic.addEventListener('click', () => {
        this.switchProfileSubtab('music');
      });
    }
  }

  switchProfileSubtab(tab) {
    document.querySelectorAll('.profile-subtab').forEach(b => b.classList.remove('active'));
    this.profilePostsSubcontent.classList.add('hidden');
    this.profileFriendsSubcontent.classList.add('hidden');
    if (this.profileMusicSubcontent) this.profileMusicSubcontent.classList.add('hidden');

    if (tab === 'posts') {
      this.subtabPosts.classList.add('active');
      this.profilePostsSubcontent.classList.remove('hidden');
    } else if (tab === 'friends') {
      this.subtabFriends.classList.add('active');
      this.profileFriendsSubcontent.classList.remove('hidden');
    } else if (tab === 'music') {
      if (this.subtabMusic) this.subtabMusic.classList.add('active');
      if (this.profileMusicSubcontent) this.profileMusicSubcontent.classList.remove('hidden');
      if (this.activeProfileUser) {
        this.loadUserMusic(this.activeProfileUser.id);
      }
    }
  }

  async loadUserMusic(userId) {
    if (!this.profileTracksList) return;
    this.profileTracksList.innerHTML = '<div class="spinner"></div>';
    try {
      const res = await fetch(`/api/users/${userId}/music`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (data.locked) {
        this.profileTracksList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);">🔒 Аудиозаписи скрыты настройками приватности.</div>`;
        return;
      }
      const tracks = data.tracks || [];
      this.profileTracksList.innerHTML = '';
      if (tracks.length === 0) {
        this.profileTracksList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);">У пользователя пока нет сохранённых треков.</div>`;
        return;
      }
      tracks.forEach(track => {
        this.profileTracksList.appendChild(this.createTrackElement(track, true));
      });
    } catch (e) {
      this.profileTracksList.innerHTML = `<div style="color:var(--accent-red); padding:20px;">Ошибка загрузки треков</div>`;
    }
  }

  async blockUser(targetId) {
    const ok = await this.showConfirmDialog({
      title: 'Заблокировать пользователя?',
      message: 'Этот житель будет добавлен в ваш чёрный список и больше не появится в списке земляков.',
      confirmText: 'Заблокировать',
      isDanger: true,
      icon: '🚫'
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/users/${targetId}/block`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Пользователь добавлен в чёрный список');
      if (this.activeProfileUser) {
        this.openUserProfile(this.activeProfileUser.username);
      } else {
        this.loadFriendsTab();
      }
    } catch (e) {
      alert(e.message || 'Ошибка блокировки');
    }
  }

  async unblockUser(targetId) {
    try {
      const res = await fetch(`/api/users/${targetId}/unblock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Пользователь разблокирован');
      if (this.activeProfileUser) {
        this.openUserProfile(this.activeProfileUser.username);
      }
    } catch (e) {
      alert(e.message || 'Ошибка');
    }
  }

  initSidebarCityEvents() {
    const wrap = document.getElementById('sidebarCitiesTags');
    if (wrap) {
      wrap.addEventListener('click', (e) => {
        const tag = e.target.closest('.city-tag');
        if (tag) {
          const city = tag.dataset.city || tag.textContent.trim();
          this.filterByLocation(city);
        }
      });
    }
  }

  clearLocationFilter() {
    this.activeLocation = null;
    document.querySelectorAll('.city-tag').forEach(t => t.classList.remove('active'));
    this.loadFeed();
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SunnyKhakassiaApp();
});

// Глобальная замена стандартного браузерного alert() на стильные плавающие тосты
window.alert = function(msg) {
  if (window.app && typeof window.app.showToast === 'function') {
    window.app.showToast(msg, 'info');
  } else {
    console.warn('[Alert]', msg);
  }
};
window.showToast = function(msg, type, opts) {
  if (window.app && typeof window.app.showToast === 'function') {
    window.app.showToast(msg, type, opts);
  }
};
