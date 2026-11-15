import { BubbleColor, BubbleKind, GridBubble, LevelConfig } from './types';
import { cellKey, maxColsForRow } from './hexMath';

const ALL_COLORS: BubbleColor[] = ['red', 'blue', 'green', 'amber', 'violet', 'teal'];
const COLOR_TO_CHAR: Record<BubbleColor, string> = {
  red: 'R',
  blue: 'B',
  green: 'G',
  amber: 'A',
  violet: 'V',
  teal: 'T',
};

const WORLD_STAGE_NAMES_RU = [
  ['Первая искра', 'Цепной каскад', 'Звёздный свод', 'Каменные опоры', 'Ледяной рубеж', 'Радужный мост', 'Созвездие', 'Зеркальный зал', 'Обсидиановая арка', 'Корона обсерватории'],
  ['Врата джунглей', 'Изумрудный тотем', 'Заросший алтарь', 'Нефритовые узы', 'Тайник реликвий', 'Бронзовый щит', 'Храм эха', 'Замёрзший идол', 'Лабиринт лиан', 'Сердце руин'],
  ['Угольный порог', 'Лавовый поток', 'Кузнечный горн', 'Стальные клещи', 'Осколки базальта', 'Плазменный узел', 'Бастион жара', 'Огненный рикошет', 'Кратер титана', 'Ядро вулкана'],
  ['Снежный карниз', 'Ледяная призма', 'Хрустальный мост', 'Морозный щит', 'Северное сияние', 'Осколок глетчера', 'Зимний лабиринт', 'Снежная корона', 'Полярный свод', 'Трон зимы'],
  ['Астральный порог', 'Орбитальный путь', 'Звёздная пыль', 'Галактический щит', 'Золотой пояс', 'Туманность света', 'Небесная башня', 'Кольца сатурна', 'Астральный каскад', 'Космический финал'],
];

const WORLD_STAGE_NAMES_EN = [
  ['First Spark', 'Chain Cascade', 'Starlight Vault', 'Stone Pillars', 'Frost Bastion', 'Prism Bridge', 'Constellation', 'Ricochet Hall', 'Obsidian Arch', 'Observatory Crown'],
  ['Jungle Gate', 'Emerald Totem', 'Overgrown Altar', 'Jade Bindings', 'Relic Cache', 'Bronze Shield', 'Echo Temple', 'Frozen Idol', 'Vine Labyrinth', 'Heart of Ruins'],
  ['Ember Gate', 'Magma Flow', 'Forge Hearth', 'Iron Tongs', 'Basalt Shards', 'Plasma Nexus', 'Heat Bastion', 'Flame Ricochet', 'Titan Crater', 'Volcano Core'],
  ['Snow Cornice', 'Ice Prism', 'Crystal Bridge', 'Frost Shield', 'Aurora Veil', 'Glacier Shard', 'Winter Maze', 'Ice Crown', 'Polar Vault', 'Winter Throne'],
  ['Astral Gate', 'Orbital Path', 'Stardust', 'Galactic Shield', 'Golden Belt', 'Light Nebula', 'Celestial Spire', 'Saturn Rings', 'Astral Cascade', 'Cosmic Finale'],
];

function makePatternLayout(stageId: number, colors: BubbleColor[], isStarStage: boolean, starTarget: number): string[] {
  const ch = colors.map((c) => COLOR_TO_CHAR[c]);
  const pick = (idx: number, iced = false) => {
    const c = ch[((idx % ch.length) + ch.length) % ch.length];
    return iced ? c.toLowerCase() : c;
  };

  const patternType = stageId % 6;
  const rows = stageId >= 31 ? 7 : stageId >= 15 ? 6 : 5;
  const layout: string[] = [];

  for (let r = 0; r < rows; r++) {
    const maxC = maxColsForRow(r);
    let line = '';
    for (let c = 0; c < maxC; c++) {
      const symC = Math.min(c, maxC - 1 - c);
      let cell = '.';

      if (patternType === 0) {
        if (r === 0 || symC !== 2) {
          const iced = stageId >= 12 && r === 2 && symC % 2 === 1;
          cell = pick(r + Math.floor(symC / 2) + stageId, iced);
        }
        if (r === 2 && symC === 1 && stageId >= 14) cell = 'S';
      } else if (patternType === 1) {
        if (r <= 1 || (symC >= r - 2 && symC <= maxC - 1)) {
          const iced = stageId >= 18 && r === 3 && symC % 2 === 0;
          cell = pick(Math.floor((r + symC) / 2) + stageId, iced);
        }
        if (r === 2 && symC === 3 && stageId >= 16) cell = 'S';
      } else if (patternType === 2) {
        if (r === 0 || (c + r) % 3 !== 2) {
          const iced = stageId >= 20 && r >= 2 && symC === 2;
          cell = pick(symC + r * 2 + stageId, iced);
        }
        if (r === 1 && (symC === 1 || symC === 4) && stageId >= 22) cell = 'S';
      } else if (patternType === 3) {
        if (r === 0 || (symC >= 1 && symC <= 4)) {
          const iced = stageId >= 15 && r === 2 && symC % 2 === 0;
          cell = pick(r + symC + stageId, iced);
        }
        if (r === 1 && symC === 0) cell = 'S';
      } else if (patternType === 4) {
        if (r === 0 || (symC + r) % 2 === 0 || r === 1) {
          const iced = stageId >= 25 && r >= 2 && (symC + r) % 4 === 0;
          cell = pick(Math.floor(symC / 2) + r + stageId, iced);
        }
        if (r === 2 && symC === 2 && stageId >= 20) cell = 'S';
      } else {
        if (r === 0 || r === 1 || symC % 2 === 0) {
          const iced = stageId >= 28 && r === 3;
          cell = pick(symC + r + stageId, iced);
        }
        if (r === 2 && symC === 1 && stageId >= 24) cell = 'S';
      }

      if (stageId >= 14 && r === 1 && c === Math.floor(maxC / 2) && stageId % 4 === 0) {
        cell = 'W';
      }
      if (stageId >= 30 && r === 3 && c === Math.floor(maxC / 2) && stageId % 5 === 0) {
        cell = 'W';
      }

      line += cell;
    }
    layout.push(line);
  }

  if (isStarStage) {
    // Place stars in mid/lower rows (never buried in row 0) so stages stay tactical, not tedious
    const placements: Array<[number, number]> = [
      [2, 2],
      [2, 8],
      [3, 5],
    ];
    for (let i = 0; i < Math.min(starTarget, placements.length); i++) {
      const [pr, pc] = placements[i];
      if (pr < layout.length && pc < layout[pr].length) {
        const arr = layout[pr].split('');
        arr[pc] = '*';
        layout[pr] = arr.join('');
        // Ensure cells directly above aren't unbreakable stones blocking the drop
        if (pr - 1 >= 0 && pc < layout[pr - 1].length && layout[pr - 1][pc] === 'S') {
          const above = layout[pr - 1].split('');
          above[pc] = pick(pc + stageId, false);
          layout[pr - 1] = above.join('');
        }
      }
    }
  }

  return layout;
}

const HANDCRAFTED_1_TO_12: LevelConfig[] = [
  {
    id: 1,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][0],
    titleEn: WORLD_STAGE_NAMES_EN[0][0],
    subtitleRu: 'Соберите 3 одинаковых цвета, чтобы шарики лопнули',
    subtitleEn: 'Match 3 colors and drop hanging clusters',
    colors: ['red', 'blue', 'amber'],
    shots: 26,
    missLimit: 6,
    starThresholds: [450, 950, 1500],
    objective: { type: 'clear_top' },
    layout: ['RRR.BBB.AAA', 'RR.BB.AA.R', 'BBB.AAA.RRR', '..AA...RR..'],
  },
  {
    id: 2,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][1],
    titleEn: WORLD_STAGE_NAMES_EN[0][1],
    subtitleRu: 'Разбейте верхний мост, чтобы обрушить нижние группы',
    subtitleEn: 'Break the upper bridge to drop the lower clusters',
    colors: ['red', 'blue', 'green', 'amber'],
    shots: 28,
    missLimit: 6,
    starThresholds: [650, 1300, 2000],
    objective: { type: 'clear_top' },
    layout: ['RR.GG.BB.AA', 'R.GG.BB.AA', '.BBAA..GGRR', '..AA....GG.', '..RR....BB.'],
  },
  {
    id: 3,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][2],
    titleEn: WORLD_STAGE_NAMES_EN[0][2],
    subtitleRu: 'Освободите 2 золотые звезды',
    subtitleEn: 'Drop 2 embedded golden stars',
    colors: ['red', 'blue', 'green', 'amber'],
    shots: 30,
    missLimit: 5,
    starThresholds: [750, 1500, 2250],
    objective: { type: 'collect_stars', targetCount: 2 },
    layout: ['RRR.GGA.BBB', 'RR.GG.BB.A', '.B*..AA..*R', '..BB..GG..A', '...G...A...'],
  },
  {
    id: 4,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][3],
    titleEn: WORLD_STAGE_NAMES_EN[0][3],
    subtitleRu: 'Камни не пробить — бейте рикошетом от стен',
    subtitleEn: 'Bank off walls to cut behind unbreakable stones',
    colors: ['blue', 'green', 'amber', 'violet'],
    shots: 32,
    missLimit: 5,
    starThresholds: [850, 1700, 2500],
    objective: { type: 'clear_top' },
    layout: ['BB.VV.GG.AA', 'BB.VV.GG.A', 'SS.AA.VV.SS', '.GG..BB..AA', '..VV....GG.'],
  },
  {
    id: 5,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][4],
    titleEn: WORLD_STAGE_NAMES_EN[0][4],
    subtitleRu: 'Первый удар раскалывает лёд, второй взрывает шар',
    subtitleEn: 'Crack frosted orbs first, then match them',
    colors: ['red', 'blue', 'teal', 'amber'],
    shots: 34,
    missLimit: 5,
    starThresholds: [950, 1900, 2800],
    objective: { type: 'clear_top' },
    layout: ['RR.BB.TT.AA', 'rR.bB.tT.a', '.TT..AA..RR', '..bB..rR..T', '...AA..BB..'],
  },
  {
    id: 6,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][5],
    titleEn: WORLD_STAGE_NAMES_EN[0][5],
    subtitleRu: 'Радужный шар соединяется с любым цветом рядом',
    subtitleEn: 'Rainbow orbs bridge any neighboring color',
    colors: ['red', 'blue', 'green', 'amber', 'violet'],
    shots: 34,
    missLimit: 5,
    starThresholds: [1050, 2100, 3100],
    objective: { type: 'clear_top' },
    layout: ['RR.WW.BB.GG', 'AA.VV.RR.B', '.GG..WW..VV', '..BB..AA..R', '...rR..bB..'],
  },
  {
    id: 7,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][6],
    titleEn: WORLD_STAGE_NAMES_EN[0][6],
    subtitleRu: 'Найдите и сбросьте 3 звезды среди камней и льда',
    subtitleEn: 'Free 3 stars guarded by frost and stone',
    colors: ['red', 'green', 'amber', 'violet', 'teal'],
    shots: 36,
    missLimit: 5,
    starThresholds: [1200, 2300, 3400],
    objective: { type: 'collect_stars', targetCount: 3 },
    layout: ['RRG.GGG.AVV', 'rR.GG.AA.v', '.T*.AA.*GG.', '..SS.*..AA', '..VV..RR..T'],
  },
  {
    id: 8,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][7],
    titleEn: WORLD_STAGE_NAMES_EN[0][7],
    subtitleRu: 'Проводите выстрелы рикошетом по боковым каналам',
    subtitleEn: 'Thread ricochet shots up the side channels',
    colors: ['blue', 'green', 'amber', 'violet', 'teal'],
    shots: 36,
    missLimit: 4,
    starThresholds: [1300, 2500, 3600],
    objective: { type: 'clear_top' },
    layout: ['BB.GG.AA.VV', 'TT.BB.GG.A', 'bB.SS.SS.tT', '.AA..WW..VV', '..GG....BB.', '...TT..AA..'],
  },
  {
    id: 9,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][8],
    titleEn: WORLD_STAGE_NAMES_EN[0][8],
    subtitleRu: 'Зарядите бомбу в пушке (5 попаданий), чтобы разрушить арку',
    subtitleEn: 'Charge your cannon bomb (5 matches) to shatter the arch',
    colors: ['red', 'blue', 'green', 'amber', 'violet'],
    shots: 38,
    missLimit: 4,
    starThresholds: [1400, 2700, 3900],
    objective: { type: 'clear_top' },
    layout: ['RR.BB.GG.AA', 'SS.VV.RR.S', '.bB.SS.gG..', '..AA.WW.VV.', '..rR....bB.', '...GG..AA..'],
  },
  {
    id: 10,
    themeId: 0,
    titleRu: WORLD_STAGE_NAMES_RU[0][9],
    titleEn: WORLD_STAGE_NAMES_EN[0][9],
    subtitleRu: 'Финал первого мира — соберите 3 звезды',
    subtitleEn: 'World 1 finale — rescue 3 golden stars',
    colors: ['red', 'blue', 'green', 'amber', 'violet', 'teal'],
    shots: 40,
    missLimit: 4,
    starThresholds: [1500, 3000, 4400],
    objective: { type: 'collect_stars', targetCount: 3 },
    layout: ['RRB.GGG.AAV', 'T*.RR.BB*G', 'aA.SS.TT.SS', '.VV.*..TT.', '..GG..RR..B', '...AA..VV.'],
  },
  {
    id: 11,
    themeId: 1,
    titleRu: WORLD_STAGE_NAMES_RU[1][0],
    titleEn: WORLD_STAGE_NAMES_EN[1][0],
    subtitleRu: 'Добро пожаловать в Изумрудные руины — новые нефритовые сферы!',
    subtitleEn: 'Welcome to Emerald Ruins — new carved relic spheres!',
    colors: ['green', 'amber', 'teal', 'red'],
    shots: 34,
    missLimit: 5,
    starThresholds: [1300, 2500, 3600],
    objective: { type: 'clear_top' },
    layout: ['GG.AA.TT.RR', 'gG.aA.tT.r', '.TT..GG..AA', '..RR.WW.TT.', '..GG....AA.'],
  },
  {
    id: 12,
    themeId: 1,
    titleRu: WORLD_STAGE_NAMES_RU[1][1],
    titleEn: WORLD_STAGE_NAMES_EN[1][1],
    subtitleRu: 'Пробейтесь сквозь тотемные колонны руин',
    subtitleEn: 'Break through the totem pillars of the ruins',
    colors: ['green', 'amber', 'teal', 'blue', 'violet'],
    shots: 36,
    missLimit: 5,
    starThresholds: [1400, 2700, 3900],
    objective: { type: 'clear_top' },
    layout: ['GG.BB.TT.AA', 'VV.GG.BB.T', 'rR.SS.SS.aA', '.TT..WW..GG', '..AA....BB.'],
  },
];

function generateRemainingLevels(): LevelConfig[] {
  const extra: LevelConfig[] = [];
  for (let id = 13; id <= 50; id++) {
    const themeId = Math.floor((id - 1) / 10);
    const stageInWorld = (id - 1) % 10;
    const colorCount = id <= 14 ? 4 : id <= 30 ? 5 : 6;
    const rotated = [
      ...ALL_COLORS.slice(themeId % ALL_COLORS.length),
      ...ALL_COLORS.slice(0, themeId % ALL_COLORS.length),
    ];
    const colors = rotated.slice(0, colorCount);

    const isStarStage = id % 5 === 0 || stageInWorld === 9;
    // Keep stars approachable (2..3) and placed in mid-grid rather than the top ceiling
    const starTarget = id >= 36 ? 3 : 2;
    const shots = 34 + Math.floor(id * 0.35);
    const missLimit = id >= 35 ? 4 : 5;
    // Lowered star score thresholds so 2★ and 3★ feel rewarding
    const baseScore = 1050 + id * 95;

    const titleRu = WORLD_STAGE_NAMES_RU[themeId][stageInWorld];
    const titleEn = WORLD_STAGE_NAMES_EN[themeId][stageInWorld];

    let subtitleRu = isStarStage
      ? `Сбросьте ${starTarget} золотых звёзд`
      : 'Очистите верхний ряд или обрушьте каскад';
    let subtitleEn = isStarStage
      ? `Free all ${starTarget} golden stars`
      : 'Clear the top row or trigger a cascade';

    if (stageInWorld === 0) {
      subtitleRu = `Новый мир и стиль шаров: ${
        themeId === 2
          ? 'Вулканическая кузница'
          : themeId === 3
          ? 'Ледяной грот'
          : 'Космическое святилище'
      }`;
      subtitleEn = `New world & sphere style unlocked!`;
    } else if (id === 50) {
      subtitleRu = 'Гранд-финал 50-го уровня — соберите 3 звезды!';
      subtitleEn = 'Stage 50 Grand Finale — rescue 3 stars!';
    }

    extra.push({
      id,
      themeId,
      titleRu,
      titleEn,
      subtitleRu,
      subtitleEn,
      colors,
      shots,
      missLimit,
      starThresholds: [baseScore, Math.round(baseScore * 1.75), Math.round(baseScore * 2.5)],
      objective: isStarStage ? { type: 'collect_stars', targetCount: starTarget } : { type: 'clear_top' },
      layout: makePatternLayout(id, colors, isStarStage, starTarget),
    });
  }
  return extra;
}

export const LEVELS: LevelConfig[] = [...HANDCRAFTED_1_TO_12, ...generateRemainingLevels()];

const CHAR_MAP: Record<string, { color: BubbleColor; kind: BubbleKind; hp: number }> = {
  R: { color: 'red', kind: 'normal', hp: 1 },
  B: { color: 'blue', kind: 'normal', hp: 1 },
  G: { color: 'green', kind: 'normal', hp: 1 },
  A: { color: 'amber', kind: 'normal', hp: 1 },
  V: { color: 'violet', kind: 'normal', hp: 1 },
  T: { color: 'teal', kind: 'normal', hp: 1 },
  r: { color: 'red', kind: 'ice', hp: 2 },
  b: { color: 'blue', kind: 'ice', hp: 2 },
  g: { color: 'green', kind: 'ice', hp: 2 },
  a: { color: 'amber', kind: 'ice', hp: 2 },
  v: { color: 'violet', kind: 'ice', hp: 2 },
  t: { color: 'teal', kind: 'ice', hp: 2 },
  S: { color: 'blue', kind: 'stone', hp: 99 },
  '*': { color: 'amber', kind: 'star', hp: 1 },
  W: { color: 'amber', kind: 'rainbow', hp: 1 },
};

export function buildLevelGrid(level: LevelConfig): Map<string, GridBubble> {
  const grid = new Map<string, GridBubble>();
  level.layout.forEach((rowStr, row) => {
    const maxCols = maxColsForRow(row);
    for (let col = 0; col < Math.min(rowStr.length, maxCols); col++) {
      const ch = rowStr[col];
      const spec = CHAR_MAP[ch];
      if (!spec) continue;
      grid.set(cellKey(row, col), {
        row,
        col,
        color: spec.color,
        kind: spec.kind,
        hp: spec.hp,
        wobble: 0,
        phase: (row * 0.7 + col * 0.45) % (Math.PI * 2),
      });
    }
  });
  return grid;
}
