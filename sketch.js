/**
 * Voice Ripple Piano - 聲控雨滴鋼琴
 * 使用 p5.js (視覺) + Tone.js (音頻)
 */

// ============================================
// CONFIG - 所有可調參數
// ============================================
const CONFIG = {
  // 音頻參數
  BASE_THRESHOLD: 0.02,      // 基礎音量閾值 (0-1) - 降低讓行動端更靈敏
  COOLDOWN_MS: 180,          // 觸發後冷卻時間
  SILENCE_MS: 80,            // 觸發後靜音期
  DYNAMIC_BOOST: 0.04,       // 動態閾值提升量

  // 視覺參數
  BG_COLOR: '#1a1d2e',       // 背景色（深藍黑）
  BASE_RADIUS: 140,          // 中央波形基礎半徑 - 再增大
  WAVE_MULTIPLIER: 450,      // 波形放大倍率 - 更誇張
  RIPPLE_EXPAND_SPEED: 3.5,  // 漣漪擴散速度 - 加快
  RIPPLE_FADE_SPEED: 2,      // 漣漪淡出速度 - 減慢讓漣漪持續更久
  MAX_RIPPLES: 30,           // 最大同時存在漣漪數

  // 五聲音階 (C Major Pentatonic 跨三個八度)
  PENTATONIC: [
    'C3', 'D3', 'E3', 'G3', 'A3',
    'C4', 'D4', 'E4', 'G4', 'A4',
    'C5', 'D5', 'E5', 'G5', 'A5'
  ]
};

// ============================================
// 風格設定
// ============================================
const WAVE_STYLES = [
  { name: '直線', key: 'straight' },
  { name: '螺旋', key: 'spiral' },
  { name: '波浪', key: 'wavy' },
  { name: '有機', key: 'organic' },
  { name: '花瓣', key: 'petal' }
];
let currentStyleIndex = 0;

// ============================================
// 狀態變數
// ============================================
let mic = null;
let meter = null;
let waveform = null;
let synth = null;

let isRunning = false;
let isCoolingDown = false;
let isSilenced = false;
let currentThreshold = CONFIG.BASE_THRESHOLD;

let ripples = [];
let waveformData = [];
let currentVolume = 0;
let noiseOffset = 0; // 用於有機風格的 Perlin noise

// DOM 元素
let startScreen;
let startBtn;
let styleBtn;
let styleLabel;

// ============================================
// p5.js 生命週期
// ============================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();

  // 取得 DOM 元素
  startScreen = document.getElementById('start-screen');
  startBtn = document.getElementById('start-btn');
  styleBtn = document.getElementById('style-btn');
  styleLabel = document.getElementById('style-label');

  // 綁定開始按鈕（只觸發一次）
  startBtn.addEventListener('click', initAudio, { once: true });

  // 綁定風格切換按鈕
  if (styleBtn) {
    styleBtn.addEventListener('click', cycleStyle);
  }
}

// 切換風格
function cycleStyle() {
  currentStyleIndex = (currentStyleIndex + 1) % WAVE_STYLES.length;
  if (styleLabel) {
    styleLabel.textContent = WAVE_STYLES[currentStyleIndex].name;
  }
}

function draw() {
  // 深色背景
  background(225, 35, 12); // HSB: 深藍黑

  if (!isRunning) return;

  // 讀取音頻數據
  currentVolume = meter.getValue();
  waveformData = waveform.getValue();

  // 更新 noise offset（用於有機風格）
  noiseOffset += 0.02;

  // 檢查是否觸發
  checkAndTrigger();

  // 繪製視覺效果
  drawCentralWaveform();
  updateAndDrawRipples();
  drawVolumeIndicator();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ============================================
// 音頻系統
// ============================================
async function initAudio() {
  try {
    // 啟動 Tone.js AudioContext
    await Tone.start();

    // 初始化麥克風
    mic = new Tone.UserMedia();
    await mic.open();
    mic.volume.value = 6;  // 提升麥克風增益 6dB，改善行動端靈敏度

    // 初始化分析器 - smoothing 降低讓反應更即時
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
        decay: 0.3,
        sustain: 0.15,
        release: 1.2
      }
    }).toDestination();
    synth.volume.value = -8;

    // 成功：隱藏開始畫面，顯示風格按鈕
    startScreen.style.opacity = '0';
    setTimeout(() => {
      startScreen.style.display = 'none';
      // 顯示風格切換按鈕
      const styleControl = document.getElementById('style-control');
      if (styleControl) {
        styleControl.style.opacity = '1';
      }
    }, 300);

    isRunning = true;

  } catch (err) {
    console.error('麥克風初始化失敗:', err);

    // 根據錯誤類型提供不同訊息
    let errorMsg = '';
    if (err.name === 'NotAllowedError') {
      errorMsg = '你拒絕了麥克風權限。請重新整理頁面並允許麥克風存取。';
    } else if (err.name === 'NotFoundError') {
      errorMsg = '找不到麥克風裝置。請檢查麥克風是否已連接。';
    } else if (err.name === 'NotSupportedError') {
      errorMsg = '此瀏覽器不支援麥克風存取。請使用 Chrome、Firefox 或 Edge。';
    } else {
      errorMsg = `麥克風初始化失敗：${err.message || '未知錯誤'}`;
    }

    alert(errorMsg);

    // 重新綁定按鈕讓使用者可以重試
    startBtn.addEventListener('click', initAudio, { once: true });
  }
}

function checkAndTrigger() {
  // 如果在靜音期或冷卻中，跳過
  if (isSilenced || isCoolingDown) return;

  // 音量超過閾值則觸發
  if (currentVolume > currentThreshold) {
    triggerNote();
    createRipple(currentVolume);
    startFeedbackProtection();
  }
}

function triggerNote() {
  // 隨機選擇一個音符
  const note = random(CONFIG.PENTATONIC);
  synth.triggerAttackRelease(note, '8n');
}

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
    // 稍後恢復原始閾值
    setTimeout(() => {
      currentThreshold = CONFIG.BASE_THRESHOLD;
    }, 150);
  }, CONFIG.COOLDOWN_MS);
}

// ============================================
// 視覺系統 - 中央波形（根據風格繪製）
// ============================================
function drawCentralWaveform() {
  const cx = width / 2;
  const cy = height / 2;

  push();
  translate(cx, cy);

  // 根據當前風格繪製
  const style = WAVE_STYLES[currentStyleIndex].key;
  switch (style) {
    case 'straight': drawStraightStyle(); break;
    case 'spiral':   drawSpiralStyle();   break;
    case 'wavy':     drawWavyStyle();     break;
    case 'organic':  drawOrganicStyle();  break;
    case 'petal':    drawPetalStyle();    break;
  }

  // 內層：閉合曲線（呼吸圓形）- 所有風格共用
  drawInnerCurve();

  // 中心圓點
  noStroke();
  fill(0, 0, 85, 60); // 亮色
  circle(0, 0, 12);

  pop();
}

// 內層閉合曲線（所有風格共用）
function drawInnerCurve() {
  noFill();
  strokeWeight(4);
  stroke(200, 50, 90, 80); // 亮藍色

  beginShape();
  for (let i = 0; i < waveformData.length; i++) {
    const angle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS * 1.0 + amp * CONFIG.WAVE_MULTIPLIER * 0.85;
    curveVertex(cos(angle) * r, sin(angle) * r);
  }
  for (let i = 0; i < 3; i++) {
    const angle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS * 1.0 + amp * CONFIG.WAVE_MULTIPLIER * 0.85;
    curveVertex(cos(angle) * r, sin(angle) * r);
  }
  endShape();
}

// 風格 1：直線輻射
function drawStraightStyle() {
  strokeWeight(1.5);
  for (let i = 0; i < waveformData.length; i++) {
    const angle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;
    stroke(0, 0, 88, 25 + amp * 50); // 亮白色
    line(0, 0, cos(angle) * r, sin(angle) * r);
  }
}

// 風格 2：螺旋輻射
function drawSpiralStyle() {
  strokeWeight(1.5);
  noFill();
  for (let i = 0; i < waveformData.length; i++) {
    const baseAngle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;

    stroke(0, 0, 88, 25 + amp * 50); // 亮白色

    // 螺旋弧線
    beginShape();
    for (let t = 0; t <= 1; t += 0.1) {
      const spiralAngle = baseAngle + t * 0.5; // 旋轉偏移
      const spiralR = t * r;
      curveVertex(cos(spiralAngle) * spiralR, sin(spiralAngle) * spiralR);
    }
    endShape();
  }
}

// 風格 3：波浪輻射
function drawWavyStyle() {
  strokeWeight(1.5);
  noFill();
  for (let i = 0; i < waveformData.length; i++) {
    const angle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;

    stroke(0, 0, 88, 25 + amp * 50); // 亮白色

    // S 形波浪線
    beginShape();
    for (let t = 0; t <= 1; t += 0.05) {
      const wave = sin(t * PI * 3) * 15 * amp; // 波浪偏移
      const currentR = t * r;
      const perpAngle = angle + HALF_PI;
      const x = cos(angle) * currentR + cos(perpAngle) * wave;
      const y = sin(angle) * currentR + sin(perpAngle) * wave;
      vertex(x, y);
    }
    endShape();
  }
}

// 風格 4：有機/觸手（Perlin noise）
function drawOrganicStyle() {
  strokeWeight(2);
  noFill();
  for (let i = 0; i < waveformData.length; i++) {
    const angle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;

    stroke(0, 0, 88, 30 + amp * 50); // 亮白色

    // 用 Perlin noise 產生不規則曲線
    beginShape();
    for (let t = 0; t <= 1; t += 0.05) {
      const noiseVal = noise(i * 0.1, t * 2, noiseOffset) - 0.5;
      const wobble = noiseVal * 40 * (1 + amp * 2);
      const currentR = t * r;
      const perpAngle = angle + HALF_PI;
      const x = cos(angle) * currentR + cos(perpAngle) * wobble;
      const y = sin(angle) * currentR + sin(perpAngle) * wobble;
      curveVertex(x, y);
    }
    endShape();
  }
}

// 風格 5：花瓣綻放（貝茲曲線）
function drawPetalStyle() {
  strokeWeight(1.5);
  noFill();

  const petalCount = 32; // 花瓣數量
  for (let i = 0; i < petalCount; i++) {
    const dataIndex = floor(map(i, 0, petalCount, 0, waveformData.length));
    const angle = map(i, 0, petalCount, 0, TWO_PI);
    const amp = abs(waveformData[dataIndex]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;

    stroke(0, 0, 88, 30 + amp * 50); // 亮白色

    // 花瓣形狀用貝茲曲線
    const petalWidth = PI / petalCount * 0.8;
    const cp1Angle = angle - petalWidth;
    const cp2Angle = angle + petalWidth;
    const cpR = r * 0.6;

    beginShape();
    vertex(0, 0);
    bezierVertex(
      cos(cp1Angle) * cpR, sin(cp1Angle) * cpR,
      cos(cp2Angle) * cpR, sin(cp2Angle) * cpR,
      cos(angle) * r, sin(angle) * r
    );
    endShape();
  }
}

// ============================================
// 視覺系統 - 漣漪
// ============================================
function createRipple(volume) {
  // 限制最大數量
  if (ripples.length >= CONFIG.MAX_RIPPLES) {
    ripples.shift(); // 移除最舊的
  }

  ripples.push({
    x: width / 2,
    y: height / 2,
    radius: CONFIG.BASE_RADIUS + 20,
    opacity: 70 + volume * 30, // 音量越大越亮
    hue: random(360),          // 隨機顏色
    strokeWeight: 4 + volume * 4  // 加粗漣漪線條
  });
}

function updateAndDrawRipples() {
  noFill();

  // 用 filter 取代 splice，效能更好
  ripples = ripples.filter(r => {
    // 繪製
    stroke(r.hue, 70, 80, r.opacity);
    strokeWeight(r.strokeWeight);
    circle(r.x, r.y, r.radius * 2);

    // 更新
    r.radius += CONFIG.RIPPLE_EXPAND_SPEED;
    r.opacity -= CONFIG.RIPPLE_FADE_SPEED;
    r.strokeWeight *= 0.98; // 線條逐漸變細

    // 保留 opacity > 0 的漣漪
    return r.opacity > 0;
  });
}

// ============================================
// 視覺系統 - 音量指示器
// ============================================
function drawVolumeIndicator() {
  const barWidth = 200;
  const barHeight = 4;
  const x = width / 2 - barWidth / 2;
  const y = height - 40;

  // 背景軌道
  noStroke();
  fill(0, 0, 25); // 深灰色軌道
  rect(x, y, barWidth, barHeight, barHeight / 2);

  // 填充部分
  const fillWidth = currentVolume * barWidth;
  // 顏色漸變：綠 → 黃 → 紅
  const hue = map(currentVolume, 0, 1, 120, 0); // 120=綠, 60=黃, 0=紅
  fill(hue, 70, 70);
  rect(x, y, fillWidth, barHeight, barHeight / 2);

  // 閾值標記
  const thresholdX = x + currentThreshold * barWidth;
  stroke(0, 0, 60); // 亮一點的灰色
  strokeWeight(1);
  line(thresholdX, y - 2, thresholdX, y + barHeight + 2);
}

// ============================================
// 資源清理
// ============================================
function cleanup() {
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
}

// 頁面卸載時清理資源
window.addEventListener('beforeunload', cleanup);
