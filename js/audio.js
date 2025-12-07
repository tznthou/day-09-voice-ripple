/**
 * Voice Ripple Piano - 音頻模組
 * 麥克風輸入、合成器、回授防護
 */

import { CONFIG } from './config.js';
import { getNextNote } from './melody.js';
import { createRipple } from './visual.js';

// ============================================
// 狀態
// ============================================
let mic = null;
let meter = null;
let waveform = null;
let synth = null;

let isRunning = false;
let isCoolingDown = false;
let isSilenced = false;
let currentThreshold = CONFIG.BASE_THRESHOLD;

// 對外暴露的數據
let currentVolume = 0;
let waveformData = [];

// ============================================
// Getters（供外部模組讀取）
// ============================================
export function getCurrentVolume() {
  return currentVolume;
}

export function getWaveformData() {
  return waveformData;
}

export function getCurrentThreshold() {
  return currentThreshold;
}

export function getIsRunning() {
  return isRunning;
}

// ============================================
// 音頻初始化
// ============================================

/**
 * 初始化音頻系統
 * @returns {Promise<boolean>} 是否成功
 */
export async function initAudio() {
  try {
    // 啟動 Tone.js AudioContext
    await Tone.start();

    // 初始化麥克風
    mic = new Tone.UserMedia();
    await mic.open();
    mic.volume.value = 3;  // 提升麥克風增益 3dB

    // 初始化分析器
    meter = new Tone.Meter({ normalRange: true, smoothing: 0.3 });
    waveform = new Tone.Waveform(128);

    // 連接音頻路徑
    mic.connect(meter);
    mic.connect(waveform);

    // 初始化合成器
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.02,
        decay: 0.15,
        sustain: 0.05,
        release: 0.4
      }
    }).toDestination();
    synth.volume.value = -8;

    isRunning = true;
    return true;

  } catch (err) {
    console.error('麥克風初始化失敗:', err);
    throw err;  // 讓呼叫端處理錯誤
  }
}

/**
 * 取得友善的錯誤訊息
 * @param {Error} err - 錯誤物件
 * @returns {string} 錯誤訊息
 */
export function getErrorMessage(err) {
  if (err.name === 'NotAllowedError') {
    return '你拒絕了麥克風權限。請重新整理頁面並允許麥克風存取。';
  } else if (err.name === 'NotFoundError') {
    return '找不到麥克風裝置。請檢查麥克風是否已連接。';
  } else if (err.name === 'NotSupportedError') {
    return '此瀏覽器不支援麥克風存取。請使用 Chrome、Firefox 或 Edge。';
  } else {
    return `麥克風初始化失敗：${err.message || '未知錯誤'}`;
  }
}

// ============================================
// 音頻處理（每幀呼叫）
// ============================================

/**
 * 更新音頻數據（在 draw 中呼叫）
 */
export function updateAudioData() {
  if (!isRunning) return;

  currentVolume = meter.getValue();
  waveformData = waveform.getValue();
}

/**
 * 檢查是否觸發音符
 */
export function checkAndTrigger() {
  // 如果在靜音期或冷卻中，跳過
  if (isSilenced || isCoolingDown) return;

  // 音量超過閾值則觸發
  if (currentVolume > currentThreshold) {
    triggerNote();
    createRipple(currentVolume);
    startFeedbackProtection();
  }
}

/**
 * 觸發音符（使用 Markov Chain）
 */
function triggerNote() {
  // 取得下一個音符和力度
  const { note, velocity } = getNextNote(currentVolume);

  // 播放音符
  synth.triggerAttackRelease(note, '8n', undefined, velocity);
}

/**
 * 啟動回授防護機制
 */
function startFeedbackProtection() {
  // 1. 設定冷卻狀態
  isCoolingDown = true;

  // 2. 設定靜音期（完全停止監測）
  isSilenced = true;
  setTimeout(() => {
    isSilenced = false;
  }, CONFIG.SILENCE_MS);

  // 3. 動態提升閾值
  currentThreshold = CONFIG.BASE_THRESHOLD + CONFIG.DYNAMIC_BOOST;

  // 4. 冷卻結束後重置
  setTimeout(() => {
    isCoolingDown = false;
  }, CONFIG.COOLDOWN_MS);

  // 5. 延遲恢復閾值（需等合成器聲音完全消失）
  setTimeout(() => {
    currentThreshold = CONFIG.BASE_THRESHOLD;
  }, CONFIG.THRESHOLD_RESTORE_MS);
}

// ============================================
// 資源清理
// ============================================

/**
 * 清理所有音頻資源
 */
export function cleanup() {
  if (mic) {
    mic.close();
    mic.dispose();
    mic = null;
  }
  if (synth) {
    synth.dispose();
    synth = null;
  }
  if (meter) {
    meter.dispose();
    meter = null;
  }
  if (waveform) {
    waveform.dispose();
    waveform = null;
  }
  isRunning = false;
}
