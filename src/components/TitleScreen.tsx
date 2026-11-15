import React, { useState } from 'react';
import { ChevronLeft, Grid3X3, Lock, Play, Star, Volume2, VolumeX } from 'lucide-react';
import { COLOR_PALETTE, COPY, LevelConfig, SaveState } from '../game/types';
import { LEVELS } from '../game/levels';
import { THEMES, getThemeCssVars, getThemeForLevel } from '../game/themes';
import { Title3DBackground } from './Title3DBackground';

interface TitleScreenProps {
  save: SaveState;
  showLevelMap: boolean;
  onToggleLevelMap: (open: boolean) => void;
  onStartLevel: (levelId: number) => void;
  onToggleMute: () => void;
  onToggleLang: () => void;
}

const ORB_JEWEL_KEYS = ['red', 'amber', 'green', 'teal', 'blue', 'violet'] as const;

export const TitleScreen: React.FC<TitleScreenProps> = ({
  save,
  showLevelMap,
  onToggleLevelMap,
  onStartLevel,
  onToggleMute,
  onToggleLang,
}) => {
  const activeStage = Math.min(save.unlockedLevel, LEVELS.length);
  const [selectedWorld, setSelectedWorld] = useState<number>(() =>
    Math.floor((activeStage - 1) / 10)
  );

  const t = COPY[save.language];
  const totalStarsEarned = Object.values(save.levels).reduce((acc, item) => acc + item.stars, 0);
  const maxStars = LEVELS.length * 3;
  const currentConfig: LevelConfig = LEVELS[activeStage - 1] || LEVELS[0];
  const currentTheme = getThemeForLevel(activeStage);

  const worldLevels = LEVELS.slice(selectedWorld * 10, selectedWorld * 10 + 10);
  const worldTheme = THEMES[selectedWorld] || THEMES[0];
  const activeTheme = showLevelMap ? worldTheme : currentTheme;
  const themeVars = getThemeCssVars(activeTheme) as React.CSSProperties;
  const previewStageId = showLevelMap ? selectedWorld * 10 + 1 : activeStage;

  return (
    <div
      style={themeVars}
      className="relative w-full h-full overflow-hidden bg-[#070d1d] flex flex-col justify-between"
    >
      {/* Identical Live 3D Gameplay Arena Preview */}
      <Title3DBackground theme={activeTheme} stageId={previewStageId} />

      {/* Light scrim only behind Stage Map; Title stays open so 3D spheres & cannon shine */}
      {showLevelMap && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(6,10,20,0.72) 0%, rgba(8,13,26,0.84) 100%)',
          }}
        />
      )}

      {/* Top Perimeter AppBar — Matches Gameplay GameHUD Bar & World Colors Identically */}
      <div
        className="relative z-10 w-full h-[64px] px-3 flex items-center justify-between gap-2"
        style={{
          background: activeTheme.ui.barGradient,
          borderBottom: `1px solid ${activeTheme.ui.barBorder}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        {showLevelMap ? (
          <button
            type="button"
            onClick={() => onToggleLevelMap(false)}
            className="btn-3d-theme-secondary inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer min-h-[36px]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{t.gameTitle}</span>
          </button>
        ) : (
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-mono font-bold text-xs text-3d-amber tabular-nums">
                {totalStarsEarned}/{maxStars}
              </span>
            </div>
            <span className={`text-[11px] truncate max-w-[155px] font-semibold ${activeTheme.uiAccentClass}`}>
              {save.language === 'ru' ? activeTheme.nameRu : activeTheme.nameEn}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleLang}
            aria-label="Switch Language"
            className="btn-3d-theme-secondary min-w-[36px] h-9 px-2 rounded-lg text-[11px] font-mono font-extrabold cursor-pointer"
          >
            {save.language === 'ru' ? 'RU' : 'EN'}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={save.muted ? 'Unmute' : 'Mute'}
            className="btn-3d-theme-secondary w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
          >
            {save.muted ? (
              <VolumeX className="w-4 h-4 text-rose-300" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-300" />
            )}
          </button>
        </div>

        {/* Bottom Prismatic Ball-Palette Accent Strip */}
        <div className="absolute bottom-0 inset-x-0 h-[2.5px] ball-spectrum-bar opacity-90" />
      </div>

      {!showLevelMap ? (
        /* Centered Compact 3D Title & Controls sitting between 3D spheres (top) and 3D cannon (bottom) */
        <div className="relative z-10 flex-1 flex flex-col items-center justify-end pb-24 px-5 pointer-events-none">
          <div className="panel-3d rounded-2xl px-5 py-4 flex flex-col items-center gap-2.5 w-full max-w-[272px] pointer-events-auto">
            {/* Row of 6 Colorful 3D-Shaded Mini Ball Jewels */}
            <div className="flex items-center justify-center gap-2 pt-0.5" aria-hidden="true">
              {ORB_JEWEL_KEYS.map((key) => {
                const pal = COLOR_PALETTE[key];
                return (
                  <span
                    key={key}
                    className="w-3.5 h-3.5 rounded-full"
                    style={{
                      background: `radial-gradient(circle at 32% 28%, ${pal.light} 0%, ${pal.main} 58%, ${pal.dark} 100%)`,
                      boxShadow: `0 2px 5px rgba(0,0,0,0.6), 0 0 6px ${pal.main}66`,
                    }}
                  />
                );
              })}
            </div>

            {/* Compact 3D Extruded SVG Title matching Arena Palette */}
            <svg
              viewBox="0 0 320 72"
              className="w-full max-w-[235px]"
              role="img"
              aria-label={t.gameTitle}
            >
              <defs>
                <linearGradient id="gold3dFace" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FEF9C3" />
                  <stop offset="50%" stopColor="#FFE600" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>

              {[4, 2.5, 1.2].map((dy, idx) => (
                <text
                  key={idx}
                  x="160"
                  y={38 + dy}
                  textAnchor="middle"
                  fill={idx === 0 ? '#110A02' : '#78350F'}
                  stroke="#090D16"
                  strokeWidth="5"
                  paintOrder="stroke"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 900,
                    fontSize: '31px',
                    letterSpacing: '0.03em',
                  }}
                >
                  {t.gameTitle}
                </text>
              ))}

              <text
                x="160"
                y="38"
                textAnchor="middle"
                fill="url(#gold3dFace)"
                stroke="#78350F"
                strokeWidth="1.8"
                paintOrder="stroke"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 900,
                  fontSize: '31px',
                  letterSpacing: '0.03em',
                }}
              >
                {t.gameTitle}
              </text>

              <text
                x="160"
                y="60"
                textAnchor="middle"
                fill="#E2E8F0"
                style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontWeight: 600,
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                }}
              >
                {t.level.toUpperCase()} {activeStage} ·{' '}
                {(save.language === 'ru' ? currentConfig.titleRu : currentConfig.titleEn).toUpperCase()}
              </text>
            </svg>

            {/* Compact Sleek Theme-Colored 3D Action Buttons */}
            <div className="flex flex-col items-center gap-2 w-full max-w-[208px]">
              <button
                type="button"
                onClick={() => onStartLevel(activeStage)}
                className="btn-3d-theme-primary w-full py-2.5 px-4 rounded-xl font-display font-black text-xs tracking-wide flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[40px]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {t.continueLevel} {activeStage}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onToggleLevelMap(true)}
                className="btn-3d-theme-secondary w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[38px]"
              >
                <Grid3X3 className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {t.levelMap} (1–{LEVELS.length})
                </span>
              </button>
            </div>

            <p className="text-[10px] text-slate-300 text-center leading-snug pt-0.5">
              {t.controlHint}
            </p>
          </div>
        </div>
      ) : (
        /* 50-Stage Compact 3D Selector with World-Colored Tabs */
        <div className="relative z-10 flex-1 flex flex-col px-4 pb-4 pt-3 overflow-hidden">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h2 className="font-display font-black text-base text-3d-white">{t.levelMap}</h2>
            <span className="text-xs font-mono font-bold tabular-nums text-3d-amber">
              ★ {totalStarsEarned}/{maxStars}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 mb-2.5">
            {THEMES.map((th) => {
              const start = th.id * 10 + 1;
              const end = start + 9;
              const isSelected = selectedWorld === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setSelectedWorld(th.id)}
                  style={
                    isSelected
                      ? {
                          background: th.ui.btnPrimaryBg,
                          borderColor: th.ui.btnPrimaryBorder,
                          color: th.ui.btnPrimaryText,
                          boxShadow: `0 3px 0 ${th.ui.btnPrimaryShadow}, inset 0 1px 1px rgba(255,255,255,0.55)`,
                        }
                      : {
                          background: th.ui.btnSecondaryBg,
                          borderColor: th.ui.btnSecondaryBorder,
                          color: '#f8fafc',
                          boxShadow: `0 3px 0 ${th.ui.btnSecondaryShadow}, inset 0 1px 1px rgba(255,255,255,0.2)`,
                        }
                  }
                  className={`py-1.5 px-1 rounded-lg border text-center cursor-pointer transition-transform active:translate-y-0.5 ${
                    isSelected ? 'font-black' : 'font-bold opacity-85 hover:opacity-100'
                  }`}
                >
                  <span className="block font-mono text-[10px] tabular-nums">
                    {start}–{end}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-1 mb-2">
            <span className={`text-xs font-bold ${worldTheme.uiAccentClass}`}>
              {t.worldLabel} {worldTheme.id + 1}:{' '}
              {save.language === 'ru' ? worldTheme.nameRu : worldTheme.nameEn}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-0.5 pb-2">
            {worldLevels.map((lvl) => {
              const unlocked = lvl.id <= save.unlockedLevel;
              const lvlSave = save.levels[lvl.id];
              const stars = lvlSave?.stars || 0;
              const isNext = lvl.id === activeStage;

              return (
                <button
                  key={lvl.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && onStartLevel(lvl.id)}
                  className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl min-h-[62px] ${
                    unlocked
                      ? isNext
                        ? 'stage-card-3d-active text-slate-50 cursor-pointer'
                        : 'stage-card-3d text-slate-100 cursor-pointer'
                      : 'subpanel-3d text-slate-600 cursor-not-allowed opacity-75'
                  }`}
                >
                  <div className="flex flex-col items-start min-w-0 pr-1.5">
                    <span
                      className={`font-display font-black text-lg tabular-nums leading-none ${
                        unlocked ? 'text-3d-white' : 'text-slate-600'
                      }`}
                    >
                      {lvl.id}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[100px] mt-1">
                      {save.language === 'ru' ? lvl.titleRu : lvl.titleEn}
                    </span>
                  </div>

                  {unlocked ? (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= stars
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
