/**
 * Voice Ripple Piano - 視覺模組
 * 波形繪製（5種風格）、漣漪系統、音量指示器
 */

import { CONFIG, WAVE_STYLES } from './config.js';

// ============================================
// 狀態
// ============================================
let ripples = [];
let currentStyleIndex = 0;
let noiseOffset = 0;  // 用於有機風格的 Perlin noise

// ============================================
// 風格切換
// ============================================

/**
 * 切換到下一個視覺風格
 * @returns {string} 新風格的名稱
 */
export function cycleStyle() {
  currentStyleIndex = (currentStyleIndex + 1) % WAVE_STYLES.length;
  return WAVE_STYLES[currentStyleIndex].name;
}

/**
 * 取得當前風格名稱
 */
export function getCurrentStyleName() {
  return WAVE_STYLES[currentStyleIndex].name;
}

// ============================================
// 中央波形繪製
// ============================================

/**
 * 繪製中央波形視覺化
 * @param {Float32Array} waveformData - 波形數據
 */
export function drawCentralWaveform(waveformData) {
  const cx = width / 2;
  const cy = height / 2;

  push();
  translate(cx, cy);

  // 更新 noise offset（用於有機風格）
  noiseOffset += 0.02;

  // 根據當前風格繪製
  const style = WAVE_STYLES[currentStyleIndex].key;
  switch (style) {
    case 'straight': drawStraightStyle(waveformData); break;
    case 'spiral':   drawSpiralStyle(waveformData);   break;
    case 'wavy':     drawWavyStyle(waveformData);     break;
    case 'organic':  drawOrganicStyle(waveformData);  break;
    case 'petal':    drawPetalStyle(waveformData);    break;
  }

  // 內層：閉合曲線（呼吸圓形）- 所有風格共用
  drawInnerCurve(waveformData);

  // 中心圓點
  noStroke();
  fill(0, 0, 85, 60);
  circle(0, 0, 12);

  pop();
}

// 內層閉合曲線（所有風格共用）
function drawInnerCurve(waveformData) {
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
  // 閉合曲線需要額外幾個點
  for (let i = 0; i < 3; i++) {
    const angle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS * 1.0 + amp * CONFIG.WAVE_MULTIPLIER * 0.85;
    curveVertex(cos(angle) * r, sin(angle) * r);
  }
  endShape();
}

// 風格 1：直線輻射
function drawStraightStyle(waveformData) {
  strokeWeight(1.5);
  for (let i = 0; i < waveformData.length; i++) {
    const angle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;
    stroke(0, 0, 88, 25 + amp * 50);
    line(0, 0, cos(angle) * r, sin(angle) * r);
  }
}

// 風格 2：螺旋輻射
function drawSpiralStyle(waveformData) {
  strokeWeight(1.5);
  noFill();
  for (let i = 0; i < waveformData.length; i++) {
    const baseAngle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;

    stroke(0, 0, 88, 25 + amp * 50);

    beginShape();
    for (let t = 0; t <= 1; t += 0.1) {
      const spiralAngle = baseAngle + t * 0.5;
      const spiralR = t * r;
      curveVertex(cos(spiralAngle) * spiralR, sin(spiralAngle) * spiralR);
    }
    endShape();
  }
}

// 風格 3：波浪輻射
function drawWavyStyle(waveformData) {
  strokeWeight(1.5);
  noFill();
  for (let i = 0; i < waveformData.length; i++) {
    const angle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;

    stroke(0, 0, 88, 25 + amp * 50);

    beginShape();
    for (let t = 0; t <= 1; t += 0.05) {
      const wave = sin(t * PI * 3) * 15 * amp;
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
function drawOrganicStyle(waveformData) {
  strokeWeight(2);
  noFill();
  for (let i = 0; i < waveformData.length; i++) {
    const angle = map(i, 0, waveformData.length, 0, TWO_PI);
    const amp = abs(waveformData[i]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;

    stroke(0, 0, 88, 30 + amp * 50);

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
function drawPetalStyle(waveformData) {
  strokeWeight(1.5);
  noFill();

  const petalCount = 32;
  for (let i = 0; i < petalCount; i++) {
    const dataIndex = floor(map(i, 0, petalCount, 0, waveformData.length));
    const angle = map(i, 0, petalCount, 0, TWO_PI);
    const amp = abs(waveformData[dataIndex]);
    const r = CONFIG.BASE_RADIUS + amp * CONFIG.WAVE_MULTIPLIER;

    stroke(0, 0, 88, 30 + amp * 50);

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
// 漣漪系統
// ============================================

/**
 * 創建新漣漪
 * @param {number} volume - 當前音量
 */
export function createRipple(volume) {
  // 限制最大數量
  if (ripples.length >= CONFIG.MAX_RIPPLES) {
    ripples.shift();
  }

  ripples.push({
    x: width / 2,
    y: height / 2,
    radius: CONFIG.BASE_RADIUS + 20,
    opacity: 70 + volume * 30,
    hue: random(360),
    strokeWeight: 4 + volume * 4
  });
}

/**
 * 更新並繪製所有漣漪
 */
export function updateAndDrawRipples() {
  noFill();

  ripples = ripples.filter(r => {
    // 繪製
    stroke(r.hue, 70, 80, r.opacity);
    strokeWeight(r.strokeWeight);
    circle(r.x, r.y, r.radius * 2);

    // 更新
    r.radius += CONFIG.RIPPLE_EXPAND_SPEED;
    r.opacity -= CONFIG.RIPPLE_FADE_SPEED;
    r.strokeWeight *= 0.98;

    // 保留 opacity > 0 的漣漪
    return r.opacity > 0;
  });
}

// ============================================
// 音量指示器
// ============================================

/**
 * 繪製音量指示器
 * @param {number} currentVolume - 當前音量
 * @param {number} currentThreshold - 當前閾值
 */
export function drawVolumeIndicator(currentVolume, currentThreshold) {
  const barWidth = 200;
  const barHeight = 4;
  const x = width / 2 - barWidth / 2;
  const y = height - 40;

  // 背景軌道
  noStroke();
  fill(0, 0, 25);
  rect(x, y, barWidth, barHeight, barHeight / 2);

  // 填充部分
  const fillWidth = currentVolume * barWidth;
  const hue = map(currentVolume, 0, 1, 120, 0);
  fill(hue, 70, 70);
  rect(x, y, fillWidth, barHeight, barHeight / 2);

  // 閾值標記
  const thresholdX = x + currentThreshold * barWidth;
  stroke(0, 0, 60);
  strokeWeight(1);
  line(thresholdX, y - 2, thresholdX, y + barHeight + 2);
}
