/**
 * Voice Ripple Piano - 主入口
 * p5.js 生命週期 + DOM 事件
 */

import {
  initAudio,
  getErrorMessage,
  updateAudioData,
  checkAndTrigger,
  getCurrentVolume,
  getWaveformData,
  getCurrentThreshold,
  getIsRunning,
  cleanup
} from './audio.js';

import {
  drawCentralWaveform,
  updateAndDrawRipples,
  drawVolumeIndicator,
  cycleStyle
} from './visual.js';

// ============================================
// DOM 元素
// ============================================
let startScreen;
let startBtn;
let styleBtn;
let styleLabel;
let styleControl;

// ============================================
// p5.js 生命週期
// ============================================

window.setup = function() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();

  // 取得 DOM 元素
  startScreen = document.getElementById('start-screen');
  startBtn = document.getElementById('start-btn');
  styleBtn = document.getElementById('style-btn');
  styleLabel = document.getElementById('style-label');
  styleControl = document.getElementById('style-control');

  // 綁定開始按鈕
  startBtn.addEventListener('click', handleStart, { once: true });

  // 綁定風格切換按鈕
  if (styleBtn) {
    styleBtn.addEventListener('click', handleCycleStyle);
  }
};

window.draw = function() {
  // 深色背景
  background(225, 35, 12);

  if (!getIsRunning()) return;

  // 更新音頻數據
  updateAudioData();

  // 檢查是否觸發
  checkAndTrigger();

  // 繪製視覺效果
  drawCentralWaveform(getWaveformData());
  updateAndDrawRipples();
  drawVolumeIndicator(getCurrentVolume(), getCurrentThreshold());
};

window.windowResized = function() {
  resizeCanvas(windowWidth, windowHeight);
};

// ============================================
// 事件處理
// ============================================

async function handleStart() {
  try {
    await initAudio();

    // 成功：隱藏開始畫面
    startScreen.style.opacity = '0';
    setTimeout(() => {
      startScreen.style.display = 'none';
      // 顯示風格切換按鈕
      if (styleControl) {
        styleControl.style.opacity = '1';
      }
    }, 300);

  } catch (err) {
    const errorMsg = getErrorMessage(err);
    alert(errorMsg);

    // 重新綁定按鈕讓使用者可以重試
    startBtn.addEventListener('click', handleStart, { once: true });
  }
}

function handleCycleStyle() {
  const newStyleName = cycleStyle();
  if (styleLabel) {
    styleLabel.textContent = newStyleName;
  }
}

// ============================================
// 頁面卸載清理
// ============================================
window.addEventListener('beforeunload', cleanup);
