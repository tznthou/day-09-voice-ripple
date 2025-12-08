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
  cleanup,
  enumerateMicrophones
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
let micSelector;
let micSelect;

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
  micSelector = document.getElementById('mic-selector');
  micSelect = document.getElementById('mic-select');

  // 綁定開始按鈕
  startBtn.addEventListener('click', handleStart, { once: true });

  // 綁定風格切換按鈕
  if (styleBtn) {
    styleBtn.addEventListener('click', handleCycleStyle);
  }

  // 初始化麥克風選擇器
  initMicrophoneSelector();
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
    // 取得選中的裝置 ID
    const selectedDeviceId = micSelect?.value || '';

    await initAudio(selectedDeviceId);

    // 成功：隱藏開始畫面
    startScreen.style.opacity = '0';
    setTimeout(() => {
      startScreen.style.display = 'none';
      // 顯示風格切換按鈕
      if (styleControl) {
        styleControl.style.opacity = '1';
      }
    }, 300);

    // 授權後更新裝置清單（現在可以看到完整 label）
    refreshMicrophoneList();

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
// 麥克風選擇器
// ============================================

/**
 * 初始化麥克風選擇器
 */
async function initMicrophoneSelector() {
  const microphones = await enumerateMicrophones();

  // 只有多於一個裝置時才顯示選擇器
  if (microphones.length > 1) {
    populateMicrophoneSelect(microphones);
    micSelector.classList.remove('hidden');
  }

  // 監聽裝置變更（熱插拔）
  if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', refreshMicrophoneList);
  }
}

/**
 * 填充麥克風下拉選單
 * @param {MediaDeviceInfo[]} microphones - 麥克風裝置陣列
 */
function populateMicrophoneSelect(microphones) {
  // 保留「預設麥克風」選項
  micSelect.innerHTML = '<option value="">預設麥克風</option>';

  microphones.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    // 處理空 label（尚未授權）
    option.textContent = device.label || `麥克風 ${index + 1}`;
    micSelect.appendChild(option);
  });
}

/**
 * 更新麥克風清單（裝置變更或授權後）
 */
async function refreshMicrophoneList() {
  const microphones = await enumerateMicrophones();

  if (microphones.length > 1) {
    const currentValue = micSelect.value;
    populateMicrophoneSelect(microphones);

    // 嘗試保留之前的選擇
    if (currentValue && microphones.some(m => m.deviceId === currentValue)) {
      micSelect.value = currentValue;
    }

    micSelector.classList.remove('hidden');
  } else if (microphones.length <= 1) {
    micSelector.classList.add('hidden');
  }
}

// ============================================
// 頁面卸載清理
// ============================================
window.addEventListener('beforeunload', cleanup);
