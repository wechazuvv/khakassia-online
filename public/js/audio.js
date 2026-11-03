/**
 * ХАКАССКАЯ МУЗЫКА И АТМОСФЕРА СТЕПЕЙ (Web Audio Synthesizer)
 * Аутентичные звуки хакасского хомыса, чатхана и горного степного ветра
 */
class KhakassiaAudioPlayer {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.volume = 0.7;
    this.timer = null;
    this.windNode = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  toggle() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  start() {
    this.isPlaying = true;
    this.startSteppeWind();
    this.startMelody();
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.windNode) {
      try {
        this.windNode.stop();
        this.windNode.disconnect();
      } catch (e) {}
      this.windNode = null;
    }
  }

  // Степной ветер (Розовый шум с плавающим фильтром)
  startSteppeWind() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, this.ctx.currentTime);

    // Модуляция фильтра ветром
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.masterGain);

    whiteNoise.start();
    this.windNode = whiteNoise;
  }

  // Мелодия хакасского хомыса и чатхана (пентатоника Dm: Ре, Фа, Соль, Ля, До)
  startMelody() {
    const scale = [
      146.83, // D3
      174.61, // F3
      196.00, // G3
      220.00, // A3
      261.63, // C4
      293.66, // D4
      349.23, // F4
      392.00, // G4
      440.00  // A4
    ];

    const playKhomysNote = (freq, duration = 1.2) => {
      if (!this.isPlaying || !this.ctx) return;
      const t = this.ctx.currentTime;

      // Основной тон + обертоны щипкового инструмента
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      // Резонансный фильтр тела хомыса (деревянный корпус)
      const bodyFilter = this.ctx.createBiquadFilter();
      bodyFilter.type = 'bandpass';
      bodyFilter.frequency.setValueAtTime(freq * 1.5, t);
      bodyFilter.Q.setValueAtTime(4.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(bodyFilter);
      bodyFilter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + duration);
    };

    // Традиционный ритмический рисунок степных наигрышей
    let step = 0;
    const pattern = [0, 2, 3, 5, 4, 3, 2, 0, 1, 3, 5, 7, 5, 3, 2, 0];

    this.timer = setInterval(() => {
      if (!this.isPlaying) return;
      const noteIndex = pattern[step % pattern.length];
      const freq = scale[noteIndex];
      playKhomysNote(freq, (step % 4 === 0) ? 1.8 : 0.9);

      // Иногда добавляем щипок бурдонной струны (D3)
      if (step % 4 === 0) {
        playKhomysNote(scale[0], 2.2);
      }

      step++;
    }, 450);
  }
}

window.khakassiaMusic = new KhakassiaAudioPlayer();
