(() => {
  'use strict';

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  const state = {
    playlist: [],       // { id, file, url, title, duration, thumb }
    currentIndex: -1,
    repeatOne: false,
    repeatAll: false,
    ab: { a: null, b: null, active: false },
    theater: false,
    speeds: [1, 1.25, 1.5, 1.75, 2, 0.5, 0.75],
    speedIdx: 0,
    query: '',
  };

  // ---------------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  const video = $('videoEl');
  const emptyState = $('emptyState');
  const centerPlayBtn = $('centerPlayBtn');
  const centerPlayIcon = $('centerPlayIcon');

  const folderInput = $('folderInput');
  const videoInput = $('videoInput');
  const uploadFolderBtn = $('uploadFolderBtn');
  const uploadVideoBtn = $('uploadVideoBtn');
  const uploadError = $('uploadError');

  const playlistList = $('playlistList');
  const playlistEmpty = $('playlistEmpty');
  const playlistNoMatch = $('playlistNoMatch');
  const playlistCount = $('playlistCount');
  const nowPlayingLabel = $('nowPlayingLabel');
  const clearPlaylistBtn = $('clearPlaylistBtn');
  const searchInput = $('searchInput');
  const searchClearBtn = $('searchClearBtn');

  const playPauseBtn = $('playPauseBtn');
  const playIcon = $('playIcon');
  const pauseIcon = $('pauseIcon');
  const prevBtn = $('prevBtn');
  const nextBtn = $('nextBtn');
  const repeatOneBtn = $('repeatOneBtn');
  const repeatAllBtn = $('repeatAllBtn');
  const abRepeatBtn = $('abRepeatBtn');
  const abBadge = $('abBadge');
  const abRange = $('abRange');
  const pipBtn = $('pipBtn');
  const fullscreenBtn = $('fullscreenBtn');
  const theaterBtn = $('theaterBtn');
  const theaterToggleTop = $('theaterToggleTop');
  const speedBtn = $('speedBtn');
  const volBtn = $('volBtn');
  const volIcon = $('volIcon');
  const volRange = $('volRange');
  const timeLabel = $('timeLabel');

  const seekBar = $('seekBar');
  const seekProgress = $('seekProgress');
  const seekBuffered = $('seekBuffered');
  const seekThumb = $('seekThumb');

  const playerWrap = $('playerWrap');

  const thumbCapture = $('thumbCapture');
  const thumbCanvas = $('thumbCanvas');

  let idSeq = 1;

  // ---------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------
  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function titleFromFilename(name) {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  }

  function isVideoFile(file) {
    if (file.type && file.type.startsWith('video/')) return true;
    return /\.(mp4|webm|ogg|ogv|mov|mkv|m4v|avi)$/i.test(file.name);
  }

  function showUploadError(msg) {
    uploadError.textContent = msg;
    uploadError.classList.remove('hidden');
    clearTimeout(showUploadError._t);
    showUploadError._t = setTimeout(() => uploadError.classList.add('hidden'), 3200);
  }

  function titleExists(title) {
    return state.playlist.some(
      (item) => item.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
  }

  // ---------------------------------------------------------------
  // Thumbnail generation
  // ---------------------------------------------------------------
  function captureThumbnail(url) {
    return new Promise((resolve) => {
      const onLoaded = () => {
        const target = Math.min(1, (thumbCapture.duration || 1) / 3);
        thumbCapture.currentTime = target || 0.1;
      };
      const onSeeked = () => {
        try {
          thumbCanvas.width = 320;
          thumbCanvas.height = 180;
          const ctx = thumbCanvas.getContext('2d');
          const vw = thumbCapture.videoWidth || 320;
          const vh = thumbCapture.videoHeight || 180;
          const scale = Math.max(320 / vw, 180 / vh);
          const dw = vw * scale, dh = vh * scale;
          ctx.drawImage(thumbCapture, (320 - dw) / 2, (180 - dh) / 2, dw, dh);
          resolve(thumbCanvas.toDataURL('image/jpeg', 0.72));
        } catch (e) {
          resolve(null);
        } finally {
          cleanup();
        }
      };
      const onError = () => { resolve(null); cleanup(); };
      function cleanup() {
        thumbCapture.removeEventListener('loadedmetadata', onLoaded);
        thumbCapture.removeEventListener('seeked', onSeeked);
        thumbCapture.removeEventListener('error', onError);
      }
      thumbCapture.addEventListener('loadedmetadata', onLoaded, { once: true });
      thumbCapture.addEventListener('seeked', onSeeked, { once: true });
      thumbCapture.addEventListener('error', onError, { once: true });
      thumbCapture.src = url;
    });
  }

  function probeDuration(url) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.addEventListener('loadedmetadata', () => resolve(v.duration || 0), { once: true });
      v.addEventListener('error', () => resolve(0), { once: true });
      v.src = url;
    });
  }

  // ---------------------------------------------------------------
  // Playlist management
  // ---------------------------------------------------------------
  async function addFiles(fileList, { fromFolder = false } = {}) {
    const files = Array.from(fileList).filter(isVideoFile);
    if (files.length === 0) {
      showUploadError('Tidak ditemukan berkas video yang valid.');
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const title = titleFromFilename(file.name);
      if (titleExists(title)) {
        skippedCount++;
        continue;
      }
      const url = URL.createObjectURL(file);
      const item = {
        id: idSeq++,
        file,
        url,
        title,
        duration: 0,
        thumb: null,
      };
      state.playlist.push(item);
      addedCount++;
      renderPlaylist();

      // enrich async (thumbnail + duration) without blocking UI
      probeDuration(url).then((d) => {
        item.duration = d;
        renderPlaylist();
      });
      captureThumbnail(url).then((dataUrl) => {
        item.thumb = dataUrl;
        renderPlaylist();
      });
    }

    if (skippedCount > 0) {
      showUploadError(
        `${skippedCount} video dilewati karena judul sudah ada di daftar putar.`
      );
    }

    // Auto-play first item if nothing is currently loaded
    if (state.currentIndex === -1 && state.playlist.length > 0) {
      playIndex(0);
    }
  }

  function removeItem(id) {
    const idx = state.playlist.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const removingCurrent = idx === state.currentIndex;
    URL.revokeObjectURL(state.playlist[idx].url);
    state.playlist.splice(idx, 1);

    if (removingCurrent) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      state.currentIndex = -1;
      if (state.playlist.length > 0) {
        playIndex(Math.min(idx, state.playlist.length - 1));
      } else {
        showEmptyPlayer();
      }
    } else if (idx < state.currentIndex) {
      state.currentIndex--;
    }
    renderPlaylist();
  }

  function clearPlaylist() {
    if (state.playlist.length === 0) return;
    const ok = confirm(`Bersihkan seluruh daftar putar (${state.playlist.length} video)? Tindakan ini tidak dapat dibatalkan.`);
    if (!ok) return;

    state.playlist.forEach((item) => URL.revokeObjectURL(item.url));
    state.playlist = [];
    state.currentIndex = -1;

    video.pause();
    video.removeAttribute('src');
    video.load();
    showEmptyPlayer();
    renderPlaylist();
  }

  function renderPlaylist() {
    const q = state.query.trim().toLowerCase();
    const visible = state.playlist
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => !q || item.title.toLowerCase().includes(q));

    playlistCount.textContent = q
      ? `${visible.length} dari ${state.playlist.length} video`
      : `${state.playlist.length} video`;

    const hasPlaylist = state.playlist.length > 0;
    const hasResults = visible.length > 0;

    playlistEmpty.classList.toggle('hidden', hasPlaylist);
    playlistNoMatch.classList.toggle('hidden', !hasPlaylist || hasResults);
    playlistList.classList.toggle('hidden', !hasPlaylist || !hasResults);

    playlistList.innerHTML = '';
    visible.forEach(({ item, idx }) => {
      const li = document.createElement('li');
      li.className = 'pl-item' + (idx === state.currentIndex ? ' is-current' : '');
      li.dataset.id = item.id;

      const thumbInner = item.thumb
        ? `<img src="${item.thumb}" alt="">`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A5A6B" stroke-width="1.6"><path d="M8 5v14l11-7-11-7z"/></svg>`;

      const playingBadge =
        idx === state.currentIndex && !video.paused
          ? `<div class="pl-playing-badge"><span class="pl-bar"></span><span class="pl-bar"></span><span class="pl-bar"></span></div>`
          : '';

      li.innerHTML = `
        <div class="pl-thumb-wrap">
          ${thumbInner}
          ${item.duration ? `<span class="pl-duration">${formatTime(item.duration)}</span>` : ''}
          ${playingBadge}
        </div>
        <div class="pl-info">
          <span class="pl-title">${idx + 1}. ${escapeHtml(item.title)}</span>
          <span class="pl-meta">${(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
        </div>
        <button class="pl-remove" title="Hapus dari daftar" data-remove="${item.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove]')) return;
        playIndex(idx);
      });
      li.querySelector('[data-remove]').addEventListener('click', (e) => {
        e.stopPropagation();
        removeItem(item.id);
      });

      playlistList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------
  function showEmptyPlayer() {
    video.classList.add('hidden');
    emptyState.classList.remove('hidden');
    centerPlayBtn.classList.add('hidden');
    nowPlayingLabel.textContent = 'Tidak ada video yang diputar';
    resetAbRepeat();
  }

  function playIndex(idx) {
    if (idx < 0 || idx >= state.playlist.length) return;
    state.currentIndex = idx;
    const item = state.playlist[idx];

    resetAbRepeat();
    video.src = item.url;
    video.classList.remove('hidden');
    emptyState.classList.add('hidden');
    centerPlayBtn.classList.remove('hidden');
    nowPlayingLabel.textContent = `Memutar: ${item.title}`;

    video.play().catch(() => {/* autoplay might be blocked; user can press play */});
    renderPlaylist();
  }

  function togglePlayPause() {
    if (state.currentIndex === -1) {
      if (state.playlist.length > 0) playIndex(0);
      return;
    }
    if (video.paused) video.play();
    else video.pause();
  }

  function goNext({ userTriggered = true } = {}) {
    if (state.playlist.length === 0) return;
    let next = state.currentIndex + 1;
    if (next >= state.playlist.length) {
      if (state.repeatAll || userTriggered) {
        next = 0;
        if (!state.repeatAll && !userTriggered) return; // natural end, no repeat-all -> stop
      } else {
        return;
      }
    }
    playIndex(next);
  }

  function goPrev() {
    if (state.playlist.length === 0) return;
    let prev = state.currentIndex - 1;
    if (prev < 0) prev = state.playlist.length - 1;
    playIndex(prev);
  }

  video.addEventListener('ended', () => {
    if (state.repeatOne) {
      video.currentTime = 0;
      video.play();
      return;
    }
    const isLast = state.currentIndex === state.playlist.length - 1;
    if (isLast) {
      if (state.repeatAll) playIndex(0);
      // else: just stop
    } else {
      playIndex(state.currentIndex + 1);
    }
  });

  // ---------------------------------------------------------------
  // Repeat toggles
  // ---------------------------------------------------------------
  function toggleRepeatOne() {
    state.repeatOne = !state.repeatOne;
    if (state.repeatOne) state.repeatAll = false;
    repeatOneBtn.classList.toggle('is-active', state.repeatOne);
    repeatAllBtn.classList.toggle('is-active', state.repeatAll);
  }

  function toggleRepeatAll() {
    state.repeatAll = !state.repeatAll;
    if (state.repeatAll) state.repeatOne = false;
    repeatAllBtn.classList.toggle('is-active', state.repeatAll);
    repeatOneBtn.classList.toggle('is-active', state.repeatOne);
  }

  // ---------------------------------------------------------------
  // A-B Repeat
  // ---------------------------------------------------------------
  function resetAbRepeat() {
    state.ab = { a: null, b: null, active: false };
    abBadge.classList.add('hidden');
    abRange.classList.add('hidden');
    abRepeatBtn.classList.remove('is-active');
  }

  function handleAbRepeatClick() {
    if (!state.ab.a) {
      state.ab.a = video.currentTime;
      abRepeatBtn.classList.add('is-active');
    } else if (!state.ab.b || state.ab.active) {
      if (video.currentTime <= state.ab.a) {
        showUploadError('Titik B harus setelah titik A.');
        return;
      }
      state.ab.b = video.currentTime;
      state.ab.active = true;
      abBadge.classList.remove('hidden');
      updateAbRangeVisual();
      abRange.classList.remove('hidden');
    } else {
      resetAbRepeat();
    }
  }

  function updateAbRangeVisual() {
    if (state.ab.a == null || state.ab.b == null || !video.duration) return;
    const left = (state.ab.a / video.duration) * 100;
    const width = ((state.ab.b - state.ab.a) / video.duration) * 100;
    abRange.style.left = `${left}%`;
    abRange.style.width = `${width}%`;
  }

  video.addEventListener('timeupdate', () => {
    if (state.ab.active && state.ab.b != null && video.currentTime >= state.ab.b) {
      video.currentTime = state.ab.a;
    }
    updateSeekUI();
  });

  // ---------------------------------------------------------------
  // Seek bar / progress
  // ---------------------------------------------------------------
  function updateSeekUI() {
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    seekProgress.style.width = `${pct}%`;
    seekThumb.style.left = `${pct}%`;
    timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;

    if (video.buffered.length > 0) {
      const bufEnd = video.buffered.end(video.buffered.length - 1);
      seekBuffered.style.width = `${(bufEnd / video.duration) * 100}%`;
    }
  }

  video.addEventListener('loadedmetadata', () => {
    updateSeekUI();
    updateAbRangeVisual();
  });

  function seekTo(clientX) {
    if (!video.duration) return;
    const rect = seekBar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    updateSeekUI();
  }

  let seeking = false;
  seekBar.addEventListener('mousedown', (e) => { seeking = true; seekTo(e.clientX); });
  window.addEventListener('mousemove', (e) => { if (seeking) seekTo(e.clientX); });
  window.addEventListener('mouseup', () => { seeking = false; });
  seekBar.addEventListener('touchstart', (e) => seekTo(e.touches[0].clientX));
  seekBar.addEventListener('touchmove', (e) => seekTo(e.touches[0].clientX));

  // ---------------------------------------------------------------
  // Play/pause icon sync
  // ---------------------------------------------------------------
  function syncPlayIcon() {
    const playing = !video.paused && !video.ended;
    playIcon.classList.toggle('hidden', playing);
    pauseIcon.classList.toggle('hidden', !playing);
    centerPlayIcon.innerHTML = playing
      ? '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>'
      : '<path d="M8 5v14l11-7-11-7z"/>';
    renderPlaylist();
  }
  video.addEventListener('play', syncPlayIcon);
  video.addEventListener('pause', syncPlayIcon);
  video.addEventListener('ended', syncPlayIcon);

  // ---------------------------------------------------------------
  // Volume
  // ---------------------------------------------------------------
  function updateVolIcon() {
    const muted = video.muted || video.volume === 0;
    volIcon.innerHTML = muted
      ? '<path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.53l2.48 2.48c.01-.16.02-.32.02-.98zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.94 8.94 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>'
      : '<path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12z"/>';
  }
  volRange.addEventListener('input', () => {
    video.volume = parseFloat(volRange.value);
    video.muted = video.volume === 0;
    updateVolIcon();
  });
  volBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    volRange.value = video.muted ? 0 : video.volume;
    updateVolIcon();
  });

  // ---------------------------------------------------------------
  // Playback speed
  // ---------------------------------------------------------------
  speedBtn.addEventListener('click', () => {
    state.speedIdx = (state.speedIdx + 1) % state.speeds.length;
    const s = state.speeds[state.speedIdx];
    video.playbackRate = s;
    speedBtn.textContent = `${s}x`;
  });

  // ---------------------------------------------------------------
  // PiP / Fullscreen / Theater
  // ---------------------------------------------------------------
  pipBtn.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && video.src) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      showUploadError('Picture-in-picture tidak didukung untuk video ini.');
    }
  });

  fullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      playerWrap.requestFullscreen?.();
    }
  });

  function toggleTheater() {
    state.theater = !state.theater;
    document.body.classList.toggle('theater', state.theater);
    theaterBtn.classList.toggle('is-active', state.theater);
    theaterToggleTop.classList.toggle('is-active', state.theater);
  }
  theaterBtn.addEventListener('click', toggleTheater);
  theaterToggleTop.addEventListener('click', toggleTheater);

  // ---------------------------------------------------------------
  // Center overlay + basic controls wiring
  // ---------------------------------------------------------------
  centerPlayBtn.addEventListener('click', togglePlayPause);
  playPauseBtn.addEventListener('click', togglePlayPause);
  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', () => goNext({ userTriggered: true }));
  repeatOneBtn.addEventListener('click', toggleRepeatOne);
  repeatAllBtn.addEventListener('click', toggleRepeatAll);
  abRepeatBtn.addEventListener('click', handleAbRepeatClick);

  // ---------------------------------------------------------------
  // Auto-hide cursor & center play/pause icon when idle
  // ---------------------------------------------------------------
  const IDLE_DELAY = 2000; // ms of no mouse movement before hiding
  let idleTimer = null;

  function showPlayerOverlay() {
    playerWrap.classList.remove('is-idle');
  }

  function scheduleIdleHide() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!video.paused) playerWrap.classList.add('is-idle');
    }, IDLE_DELAY);
  }

  playerWrap.addEventListener('mousemove', () => {
    showPlayerOverlay();
    scheduleIdleHide();
  });
  playerWrap.addEventListener('mouseleave', () => {
    clearTimeout(idleTimer);
    showPlayerOverlay();
  });
  video.addEventListener('play', scheduleIdleHide);
  video.addEventListener('pause', () => {
    clearTimeout(idleTimer);
    showPlayerOverlay();
  });

  // ---------------------------------------------------------------
  // Upload handling
  // ---------------------------------------------------------------
  uploadFolderBtn.addEventListener('click', () => folderInput.click());
  uploadVideoBtn.addEventListener('click', () => videoInput.click());
  clearPlaylistBtn.addEventListener('click', clearPlaylist);

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    searchClearBtn.classList.toggle('hidden', state.query.length === 0);
    renderPlaylist();
  });
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.query = '';
    searchClearBtn.classList.add('hidden');
    renderPlaylist();
    searchInput.focus();
  });

  folderInput.addEventListener('change', (e) => {
    if (e.target.files.length) addFiles(e.target.files, { fromFolder: true });
    folderInput.value = '';
  });

  videoInput.addEventListener('change', (e) => {
    if (e.target.files.length) addFiles(e.target.files, { fromFolder: false });
    videoInput.value = '';
  });

  // ---------------------------------------------------------------
  // Keyboard shortcuts (space = play/pause, arrows = seek/volume,
  // n/p = next/previous video)
  // ---------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlayPause(); }
    if (e.code === 'ArrowRight') video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
    if (e.code === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - 5);
    if (e.key.toLowerCase() === 'f') fullscreenBtn.click();
    if (e.key.toLowerCase() === 't') toggleTheater();
    if (e.key.toLowerCase() === 'n') goNext({ userTriggered: true });
    if (e.key.toLowerCase() === 'p') goPrev();
  });

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  updateVolIcon();
  showEmptyPlayer();
})();
