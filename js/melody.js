/**
 * Voice Ripple Piano - 旋律生成模組
 * Markov Chain 選音 + 動態力度
 */

import { CONFIG } from './config.js';

// ============================================
// 狀態
// ============================================
let lastNoteIndex = -1;  // 上一個音符的 index，-1 表示尚未播放

// ============================================
// Markov Chain 選音
// ============================================

/**
 * 根據 Markov Chain 轉移機率選擇下一個音符的 index
 * @returns {number} 音符在 CONFIG.SCALE 中的 index
 */
function getNextNoteIndex() {
  const scaleLength = CONFIG.SCALE.length;

  // 第一個音：固定 C4 (index 7)
  if (lastNoteIndex < 0) {
    return CONFIG.MELODY.TONIC_INDEX;
  }

  // 根據轉移機率選擇 delta
  const rand = Math.random();
  let cumulative = 0;
  let selectedDelta = 0;

  for (const t of CONFIG.MELODY.TRANSITIONS) {
    cumulative += t.prob;
    if (rand < cumulative) {
      selectedDelta = t.delta;
      break;
    }
  }

  // 處理「回主音」
  if (selectedDelta === 'tonic') {
    // 回到當前八度的主音 C
    const currentOctave = Math.floor(lastNoteIndex / CONFIG.MELODY.NOTES_PER_OCTAVE);
    return currentOctave * CONFIG.MELODY.NOTES_PER_OCTAVE + CONFIG.MELODY.TONIC_OFFSET;
  }

  // 計算新 index
  let newIndex = lastNoteIndex + selectedDelta;

  // 邊界反彈：超出範圍時反彈回來
  if (newIndex < 0) {
    newIndex = -newIndex;
  } else if (newIndex >= scaleLength) {
    newIndex = scaleLength - 1 - (newIndex - scaleLength + 1);
  }

  // 確保在有效範圍內
  return Math.max(0, Math.min(scaleLength - 1, newIndex));
}

// ============================================
// 動態表現
// ============================================

/**
 * 根據音量計算力度 (velocity)
 * @param {number} volume - 當前音量 (0-1)
 * @returns {number} velocity (0.3-1.0)
 */
function getVelocity(volume) {
  const { MIN_VELOCITY, MAX_VELOCITY } = CONFIG.DYNAMICS;
  // 線性映射：音量越大，力度越強
  return MIN_VELOCITY + (MAX_VELOCITY - MIN_VELOCITY) * volume;
}

// ============================================
// 公開 API
// ============================================

/**
 * 取得下一個要播放的音符和力度
 * @param {number} volume - 當前音量 (0-1)
 * @returns {{ note: string, velocity: number }}
 */
export function getNextNote(volume) {
  // 1. Markov Chain 選音
  const noteIndex = getNextNoteIndex();

  // 2. 計算力度
  const velocity = getVelocity(volume);

  // 3. 記住這次的音符
  lastNoteIndex = noteIndex;

  // 4. 回傳音符名稱和力度
  return {
    note: CONFIG.SCALE[noteIndex],
    velocity
  };
}

/**
 * 重置旋律狀態（用於重新開始）
 */
export function resetMelody() {
  lastNoteIndex = -1;
}
