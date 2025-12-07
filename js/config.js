/**
 * Voice Ripple Piano - 設定模組
 * 所有可調參數集中管理
 */

// ============================================
// CONFIG - 所有可調參數
// ============================================
export const CONFIG = {
  // 音頻參數
  BASE_THRESHOLD: 0.025,     // 基礎音量閾值 (0-1) - 平衡靈敏度與抗噪
  COOLDOWN_MS: 220,          // 觸發後冷卻時間（加長防回授）
  SILENCE_MS: 100,           // 觸發後靜音期（加長防回授）
  DYNAMIC_BOOST: 0.06,       // 動態閾值提升量（加大防回授）
  THRESHOLD_RESTORE_MS: 600, // 閾值恢復延遲（需大於合成器 release 0.4s）

  // 視覺參數
  BG_COLOR: '#1a1d2e',       // 背景色（深藍黑）
  BASE_RADIUS: 140,          // 中央波形基礎半徑
  WAVE_MULTIPLIER: 450,      // 波形放大倍率
  RIPPLE_EXPAND_SPEED: 3.5,  // 漣漪擴散速度
  RIPPLE_FADE_SPEED: 2,      // 漣漪淡出速度
  MAX_RIPPLES: 30,           // 最大同時存在漣漪數

  // Lydian 調式音階 (C Lydian 跨三個八度)
  // Lydian 特色：升四度(F#)，聽起來飄浮、夢幻
  SCALE: [
    'C3', 'D3', 'E3', 'F#3', 'G3', 'A3', 'B3',
    'C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4',
    'C5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5'
  ],

  // 旋律生成設定 (Markov Chain)
  MELODY: {
    // 轉移機率：略偏上行，符合 Lydian 飄浮感
    TRANSITIONS: [
      { delta: -3, prob: 0.05 },      // 跳進下行（三度）
      { delta: -2, prob: 0.10 },      // 跳進下行（二度）
      { delta: -1, prob: 0.20 },      // 級進下行
      { delta: 0,  prob: 0.10 },      // 同音重複
      { delta: 1,  prob: 0.25 },      // 級進上行
      { delta: 2,  prob: 0.15 },      // 跳進上行（二度）
      { delta: 3,  prob: 0.05 },      // 跳進上行（三度）
      { delta: 'tonic', prob: 0.10 }  // 回主音 C
    ],
    NOTES_PER_OCTAVE: 7,   // Lydian 每個八度 7 個音
    TONIC_INDEX: 7,        // 第一個音固定 C4 (index 7)
    TONIC_OFFSET: 0        // 主音在八度內的位置 (C = 0)
  },

  // 動態表現設定（只影響力度）
  DYNAMICS: {
    MIN_VELOCITY: 0.3,     // 最小力度
    MAX_VELOCITY: 1.0      // 最大力度
  }
};

// ============================================
// 風格設定
// ============================================
export const WAVE_STYLES = [
  { name: '直線', key: 'straight' },
  { name: '螺旋', key: 'spiral' },
  { name: '波浪', key: 'wavy' },
  { name: '有機', key: 'organic' },
  { name: '花瓣', key: 'petal' }
];
