export type BubbleColor = 'red' | 'blue' | 'green' | 'amber' | 'violet' | 'teal';

export type BubbleKind = 'normal' | 'stone' | 'ice' | 'rainbow' | 'bomb' | 'star';

export type GameState =
  | 'TITLE_MENU'
  | 'LEVEL_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAME_OVER';

export type Language = 'ru' | 'en';

export type SphereStyle =
  | 'crystal'
  | 'jade_ring'
  | 'magma_core'
  | 'diamond_cut'
  | 'astral_crown';

export interface ThemeUiPalette {
  barGradient: string;
  barBorder: string;
  panelGradient: string;
  panelBorder: string;
  subpanelBg: string;
  btnPrimaryBg: string;
  btnPrimaryBorder: string;
  btnPrimaryShadow: string;
  btnPrimaryText: string;
  btnSecondaryBg: string;
  btnSecondaryBorder: string;
  btnSecondaryShadow: string;
  swatchHex: string;
  progressGradient: string;
}

export interface ThemeConfig {
  id: number; // 0..4
  nameRu: string;
  nameEn: string;
  sphereStyle: SphereStyle;
  bgHex: number;
  skyTopHex: number;
  skyMidHex: number;
  skyBottomHex: number;
  fogHex: number;
  fogDensity: number;
  keyLightHex: number;
  keyLightIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  rimLightHex: number;
  pillarHex: number;
  trimHex: number;
  accentHex: number;
  secondaryGlowHex: number;
  backdropHex: number;
  uiAccentClass: string;
  ui: ThemeUiPalette;
}

export interface GridBubble {
  row: number;
  col: number;
  color: BubbleColor;
  kind: BubbleKind;
  hp: number;
  wobble: number;
  phase: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  kind: 'normal' | 'bomb' | 'rainbow';
  trail: Array<{ x: number; y: number }>;
}

export interface FallingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vz: number;
  z: number;
  rotation: number;
  vRot: number;
  color: BubbleColor;
  kind: BubbleKind;
  scored: boolean;
}

export interface PoppingBubble {
  x: number;
  y: number;
  color: BubbleColor;
  kind: BubbleKind;
  timer: number;
  duration: number;
  delay: number;
}

export interface FloatingTextItem {
  id: number;
  xPct: number;
  yPct: number;
  text: string;
  color: string;
}

export interface LevelObjective {
  type: 'clear_top' | 'collect_stars';
  targetCount?: number;
}

export interface LevelConfig {
  id: number;
  themeId: number; // 0..4 (changes every 10 stages)
  titleRu: string;
  titleEn: string;
  subtitleRu: string;
  subtitleEn: string;
  colors: BubbleColor[];
  shots: number;
  missLimit: number;
  starThresholds: [number, number, number];
  objective: LevelObjective;
  layout: string[];
}

export interface LevelSaveData {
  stars: number;
  bestScore: number;
}

export interface SaveState {
  unlockedLevel: number;
  levels: Record<number, LevelSaveData>;
  muted: boolean;
  language: Language;
}

export interface HudSnapshot {
  score: number;
  shotsLeft: number;
  maxShots: number;
  missPips: number;
  missLimit: number;
  bombCharge: number;
  bombMaxCharge: number;
  bombArmed: boolean;
  starsCollected: number;
  starsTarget: number;
  objectiveType: 'clear_top' | 'collect_stars';
  activeColor: BubbleColor;
  activeKind: 'normal' | 'bomb' | 'rainbow';
  nextColor: BubbleColor;
  nextKind: 'normal' | 'bomb' | 'rainbow';
  combo: number;
  starThresholds: [number, number, number];
}

export interface MatchResult {
  score: number;
  matchScore: number;
  dropScore: number;
  shotBonus: number;
  stars: 0 | 1 | 2 | 3;
  reason?: 'out_of_shots' | 'danger_line';
}

export const CANVAS_W = 450;
export const CANVAS_H = 800;
export const LEFT_WALL = 16;
export const RIGHT_WALL = 434;
export const TOP_CEILING_BASE = 72;
export const DANGER_LINE_Y = 594;
export const CANNON_X = 225;
export const CANNON_Y = 706;
export const BUBBLE_R = 19;
export const BUBBLE_D = BUBBLE_R * 2;
export const ROW_H = BUBBLE_R * Math.sqrt(3);
export const GRID_COLS = 11;
export const PROJECTILE_SPEED = 1180;
export const BONUS_BUCKET_VALUES = [50, 100, 200, 100, 50];
export const BONUS_BUCKET_Y = 636;
export const BOMB_MAX_CHARGE = 5;

export const COLOR_PALETTE: Record<
  BubbleColor,
  {
    main: string;
    light: string;
    dark: string;
    hex: number;
    emissiveHex: number;
  }
> = {
  red: {
    main: '#CC1424',
    light: '#FF6B78',
    dark: '#6E050E',
    hex: 0xcc1424,
    emissiveHex: 0x3b0308,
  },
  blue: {
    main: '#1955E6',
    light: '#6BA0FF',
    dark: '#08226E',
    hex: 0x1955e6,
    emissiveHex: 0x061647,
  },
  green: {
    main: '#16A33A',
    light: '#5EE07F',
    dark: '#064D18',
    hex: 0x16a33a,
    emissiveHex: 0x042b0e,
  },
  amber: {
    main: '#F5DF00',
    light: '#FFF78A',
    dark: '#8C7000',
    hex: 0xf5df00,
    emissiveHex: 0x423500,
  },
  violet: {
    main: '#A824D6',
    light: '#D985FF',
    dark: '#4D0A6E',
    hex: 0xa824d6,
    emissiveHex: 0x2a053b,
  },
  teal: {
    main: '#FF7B00',
    light: '#FFB86B',
    dark: '#8F3800',
    hex: 0xff7b00,
    emissiveHex: 0x4a1d00,
  },
};

export const COPY = {
  ru: {
    gameTitle: 'ШАРИКБОЗ 3D',
    gameSubtitle: 'Цветная пушка',
    startPlay: 'Начать игру',
    continueLevel: 'Играть · Уровень',
    levelMap: 'Уровни',
    controlHint: 'Тяните или нажмите для выстрела · Пробел замена · Esc пауза',
    level: 'Уровень',
    score: 'Очки',
    shots: 'Заряды',
    bomb: 'Бомба',
    swap: 'Замена',
    paused: 'Пауза',
    resume: 'Продолжить',
    restart: 'Заново',
    backToMenu: 'Карта уровней',
    victory: 'Победа!',
    gameOver: 'Игра окончена',
    outOfShots: 'Заряды закончились',
    dangerReached: 'Шарики достигли опасной черты',
    nextLevel: 'Следующий уровень',
    tryAgain: 'Попробовать снова',
    matchPoints: 'Очки за совпадения',
    dropBonus: 'Бонус за падение',
    shotBonus: 'Бонус за заряды',
    totalScore: 'Итого',
    clearCeilingHint: 'Очистите верхний ряд',
    collectStarsHint: 'Соберите все звёзды',
    allComplete: 'Все 50 уровней пройдены!',
    worldLabel: 'Мир',
  },
  en: {
    gameTitle: 'SHARIKBOZ 3D',
    gameSubtitle: 'Color Pop Cannon',
    startPlay: 'Start Game',
    continueLevel: 'Play Stage',
    levelMap: 'Stages',
    controlHint: 'Drag or tap to shoot · Space swap orb · Esc pause',
    level: 'Stage',
    score: 'Score',
    shots: 'Shots',
    bomb: 'Bomb',
    swap: 'Swap',
    paused: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    backToMenu: 'Stage Select',
    victory: 'Stage Clear!',
    gameOver: 'Game Over',
    outOfShots: 'Out of shots',
    dangerReached: 'Bubbles crossed the danger line',
    nextLevel: 'Next Stage',
    tryAgain: 'Try Again',
    matchPoints: 'Pop Score',
    dropBonus: 'Drop Bonus',
    shotBonus: 'Shots Left Bonus',
    totalScore: 'Total',
    clearCeilingHint: 'Clear the top row',
    collectStarsHint: 'Drop all stars',
    allComplete: 'All 50 stages mastered!',
    worldLabel: 'World',
  },
} as const;
