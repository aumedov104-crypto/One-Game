import * as THREE from 'three';
import { BubbleColor, COLOR_PALETTE, SphereStyle, ThemeConfig } from './types';

export const THEMES: ThemeConfig[] = [
  {
    id: 0,
    nameRu: 'Звёздная обсерватория',
    nameEn: 'Starlight Observatory',
    sphereStyle: 'crystal',
    bgHex: 0x0b1533,
    skyTopHex: 0x070d24,
    skyMidHex: 0x162a5c,
    skyBottomHex: 0x1e1b4b,
    fogHex: 0x0c1636,
    fogDensity: 0.013,
    keyLightHex: 0xfff8eb,
    keyLightIntensity: 1.65,
    hemiSkyHex: 0xbfdbfe,
    hemiGroundHex: 0x1e293b,
    rimLightHex: 0x60a5fa,
    pillarHex: 0x24345c,
    trimHex: 0xf59e0b,
    accentHex: 0xfde047,
    secondaryGlowHex: 0x38bdf8,
    backdropHex: 0x111d42,
    uiAccentClass: 'text-sky-300',
    ui: {
      barGradient: 'linear-gradient(180deg, #1d3978 0%, #0f1e47 100%)',
      barBorder: 'rgba(96, 165, 250, 0.48)',
      panelGradient: 'linear-gradient(180deg, #1a336b 0%, #0d1a3d 100%)',
      panelBorder: 'rgba(96, 165, 250, 0.45)',
      subpanelBg: 'linear-gradient(180deg, #0b1636 0%, #081026 100%)',
      btnPrimaryBg: 'linear-gradient(180deg, #FFE600 0%, #F59E0B 55%, #D97706 100%)',
      btnPrimaryBorder: '#FEF08A',
      btnPrimaryShadow: '#92400E',
      btnPrimaryText: '#1C1002',
      btnSecondaryBg: 'linear-gradient(180deg, #2850A8 0%, #17306E 100%)',
      btnSecondaryBorder: 'rgba(125, 211, 252, 0.55)',
      btnSecondaryShadow: '#091536',
      swatchHex: '#388BFF',
      progressGradient: 'linear-gradient(90deg, #38BDF8 0%, #FFE600 60%, #FF1F2D 100%)',
    },
  },
  {
    id: 1,
    nameRu: 'Изумрудные руины',
    nameEn: 'Emerald Ruins',
    sphereStyle: 'jade_ring',
    bgHex: 0x062621,
    skyTopHex: 0x041714,
    skyMidHex: 0x0d473b,
    skyBottomHex: 0x134e4a,
    fogHex: 0x072923,
    fogDensity: 0.014,
    keyLightHex: 0xfffbeb,
    keyLightIntensity: 1.65,
    hemiSkyHex: 0xa7f3d0,
    hemiGroundHex: 0x064e3b,
    rimLightHex: 0x34d399,
    pillarHex: 0x164a3f,
    trimHex: 0xfbbf24,
    accentHex: 0x1fe838,
    secondaryGlowHex: 0x2dd4bf,
    backdropHex: 0x092e27,
    uiAccentClass: 'text-emerald-300',
    ui: {
      barGradient: 'linear-gradient(180deg, #0f5948 0%, #072e25 100%)',
      barBorder: 'rgba(52, 211, 153, 0.52)',
      panelGradient: 'linear-gradient(180deg, #105243 0%, #072921 100%)',
      panelBorder: 'rgba(52, 211, 153, 0.45)',
      subpanelBg: 'linear-gradient(180deg, #07261f 0%, #041914 100%)',
      btnPrimaryBg: 'linear-gradient(180deg, #52FF75 0%, #1FE838 55%, #0CA61F 100%)',
      btnPrimaryBorder: '#BBF7D0',
      btnPrimaryShadow: '#054D10',
      btnPrimaryText: '#032408',
      btnSecondaryBg: 'linear-gradient(180deg, #146B57 0%, #0B4034 100%)',
      btnSecondaryBorder: 'rgba(94, 234, 212, 0.52)',
      btnSecondaryShadow: '#041F19',
      swatchHex: '#1FE838',
      progressGradient: 'linear-gradient(90deg, #1FE838 0%, #00EEFF 55%, #FFE600 100%)',
    },
  },
  {
    id: 2,
    nameRu: 'Вулканическая кузница',
    nameEn: 'Volcanic Forge',
    sphereStyle: 'magma_core',
    bgHex: 0x240b10,
    skyTopHex: 0x14060a,
    skyMidHex: 0x45121b,
    skyBottomHex: 0x7c2d12,
    fogHex: 0x260b11,
    fogDensity: 0.014,
    keyLightHex: 0xfff1e6,
    keyLightIntensity: 1.7,
    hemiSkyHex: 0xfed7aa,
    hemiGroundHex: 0x450a0a,
    rimLightHex: 0xfb7185,
    pillarHex: 0x3b1d22,
    trimHex: 0xf97316,
    accentHex: 0xfbbf24,
    secondaryGlowHex: 0xf43f5e,
    backdropHex: 0x2c0e15,
    uiAccentClass: 'text-orange-300',
    ui: {
      barGradient: 'linear-gradient(180deg, #691926 0%, #330b13 100%)',
      barBorder: 'rgba(251, 146, 60, 0.55)',
      panelGradient: 'linear-gradient(180deg, #5c1622 0%, #2b0a10 100%)',
      panelBorder: 'rgba(251, 146, 60, 0.5)',
      subpanelBg: 'linear-gradient(180deg, #290a10 0%, #170509 100%)',
      btnPrimaryBg: 'linear-gradient(180deg, #FFE600 0%, #FF6B1A 55%, #D92616 100%)',
      btnPrimaryBorder: '#FED7AA',
      btnPrimaryShadow: '#7C1508',
      btnPrimaryText: '#1F0602',
      btnSecondaryBg: 'linear-gradient(180deg, #852232 0%, #4F111C 100%)',
      btnSecondaryBorder: 'rgba(253, 186, 116, 0.5)',
      btnSecondaryShadow: '#26060C',
      swatchHex: '#FF4529',
      progressGradient: 'linear-gradient(90deg, #FF1F2D 0%, #FF8800 55%, #FFE600 100%)',
    },
  },
  {
    id: 3,
    nameRu: 'Ледяной грот',
    nameEn: 'Glacial Cavern',
    sphereStyle: 'diamond_cut',
    bgHex: 0x08203a,
    skyTopHex: 0x051426,
    skyMidHex: 0x0c4a6e,
    skyBottomHex: 0x164e63,
    fogHex: 0x082440,
    fogDensity: 0.013,
    keyLightHex: 0xf8fafc,
    keyLightIntensity: 1.7,
    hemiSkyHex: 0xbae6fd,
    hemiGroundHex: 0x0c4a6e,
    rimLightHex: 0x22d3ee,
    pillarHex: 0x1a446b,
    trimHex: 0x38bdf8,
    accentHex: 0x67e8f9,
    secondaryGlowHex: 0xa5f3fc,
    backdropHex: 0x0b2a4a,
    uiAccentClass: 'text-cyan-300',
    ui: {
      barGradient: 'linear-gradient(180deg, #0e537d 0%, #072a45 100%)',
      barBorder: 'rgba(34, 211, 238, 0.55)',
      panelGradient: 'linear-gradient(180deg, #0c4b70 0%, #07263d 100%)',
      panelBorder: 'rgba(103, 232, 249, 0.48)',
      subpanelBg: 'linear-gradient(180deg, #062136 0%, #041524 100%)',
      btnPrimaryBg: 'linear-gradient(180deg, #7CF8FF 0%, #00EEFF 55%, #0095B8 100%)',
      btnPrimaryBorder: '#CFFAFE',
      btnPrimaryShadow: '#064E63',
      btnPrimaryText: '#031F29',
      btnSecondaryBg: 'linear-gradient(180deg, #166899 0%, #0C3F61 100%)',
      btnSecondaryBorder: 'rgba(103, 232, 249, 0.55)',
      btnSecondaryShadow: '#041B2B',
      swatchHex: '#00EEFF',
      progressGradient: 'linear-gradient(90deg, #00EEFF 0%, #1B5EFF 55%, #DF33FF 100%)',
    },
  },
  {
    id: 4,
    nameRu: 'Космическое святилище',
    nameEn: 'Cosmic Sanctuary',
    sphereStyle: 'astral_crown',
    bgHex: 0x1a0b36,
    skyTopHex: 0x0f0624,
    skyMidHex: 0x3b176e,
    skyBottomHex: 0x581c87,
    fogHex: 0x1d0d3d,
    fogDensity: 0.013,
    keyLightHex: 0xfff8e7,
    keyLightIntensity: 1.7,
    hemiSkyHex: 0xe9d5ff,
    hemiGroundHex: 0x3b0764,
    rimLightHex: 0xe879f9,
    pillarHex: 0x311e59,
    trimHex: 0xfacc15,
    accentHex: 0xfde047,
    secondaryGlowHex: 0xe879f9,
    backdropHex: 0x221047,
    uiAccentClass: 'text-fuchsia-300',
    ui: {
      barGradient: 'linear-gradient(180deg, #4b1d8c 0%, #240c47 100%)',
      barBorder: 'rgba(232, 121, 249, 0.55)',
      panelGradient: 'linear-gradient(180deg, #43197d 0%, #1f0a3d 100%)',
      panelBorder: 'rgba(232, 121, 249, 0.5)',
      subpanelBg: 'linear-gradient(180deg, #1d0938 0%, #110524 100%)',
      btnPrimaryBg: 'linear-gradient(180deg, #FF70FF 0%, #DF33FF 55%, #9B12BD 100%)',
      btnPrimaryBorder: '#F5D0FE',
      btnPrimaryShadow: '#58086E',
      btnPrimaryText: '#1F0229',
      btnSecondaryBg: 'linear-gradient(180deg, #6226B3 0%, #38126E 100%)',
      btnSecondaryBorder: 'rgba(240, 171, 252, 0.52)',
      btnSecondaryShadow: '#1B0738',
      swatchHex: '#DF33FF',
      progressGradient: 'linear-gradient(90deg, #DF33FF 0%, #00EEFF 50%, #FFE600 100%)',
    },
  },
];

export function getThemeForLevel(levelId: number): ThemeConfig {
  const idx = Math.min(THEMES.length - 1, Math.max(0, Math.floor((levelId - 1) / 10)));
  return THEMES[idx];
}

export function createSphereTexture(
  color: BubbleColor,
  style: SphereStyle,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const pal = COLOR_PALETTE[color];

  // Rich classic color gradient: saturated classic core across center, deep shadow below
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, pal.light);
  grad.addColorStop(0.22, pal.main);
  grad.addColorStop(0.76, pal.main);
  grad.addColorStop(1, pal.dark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  if (style === 'crystal') {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.5);
    ctx.lineTo(size, size * 0.5);
    ctx.stroke();
  } else if (style === 'jade_ring') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(0, size * 0.45, size, size * 0.08);
  } else if (style === 'magma_core') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 6; i++) {
      const x = i * 44;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 18, size * 0.35);
      ctx.lineTo(x - 8, size * 0.68);
      ctx.lineTo(x + 14, size);
      ctx.stroke();
    }
  } else if (style === 'diamond_cut') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2.5;
    for (let i = -size; i < size * 2; i += 44) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.moveTo(i + size, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
  } else if (style === 'astral_crown') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(0, size * 0.47, size, 6);
    for (let i = 0; i < 14; i++) {
      const sx = ((i * 53) % (size - 16)) + 8;
      const sy = ((i * 89) % (size - 16)) + 8;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 2) + 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  const drawEmblem = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 4;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const r = 22;

    switch (color) {
      case 'red':
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.85, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.85, 0);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'blue':
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(r * 0.9, 0, 0, r * 0.9);
        ctx.quadraticCurveTo(-r * 0.9, 0, 0, -r);
        ctx.stroke();
        break;
      case 'green':
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.75, -Math.PI * 0.8, Math.PI * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, r * 0.45);
        ctx.lineTo(r * 0.4, -r * 0.4);
        ctx.stroke();
        break;
      case 'amber':
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'violet':
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.74, -0.6, Math.PI + 0.6);
        ctx.stroke();
        break;
      case 'teal':
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.9);
        ctx.lineTo(r * 0.85, r * 0.65);
        ctx.lineTo(-r * 0.85, r * 0.65);
        ctx.closePath();
        ctx.stroke();
        break;
    }
    ctx.restore();
  };

  drawEmblem(size * 0.25, size * 0.5);
  drawEmblem(size * 0.75, size * 0.5);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function getThemeCssVars(theme: ThemeConfig): Record<string, string> {
  return {
    '--theme-panel-bg': theme.ui.panelGradient,
    '--theme-panel-border': theme.ui.panelBorder,
    '--theme-subpanel-bg': theme.ui.subpanelBg,
    '--theme-btn-primary-bg': theme.ui.btnPrimaryBg,
    '--theme-btn-primary-border': theme.ui.btnPrimaryBorder,
    '--theme-btn-primary-shadow': theme.ui.btnPrimaryShadow,
    '--theme-btn-primary-text': theme.ui.btnPrimaryText,
    '--theme-btn-sec-bg': theme.ui.btnSecondaryBg,
    '--theme-btn-sec-border': theme.ui.btnSecondaryBorder,
    '--theme-btn-sec-shadow': theme.ui.btnSecondaryShadow,
  };
}
