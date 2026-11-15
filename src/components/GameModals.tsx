import React from 'react';
import { ArrowRight, Grid3X3, Play, RotateCcw, Star } from 'lucide-react';
import { COPY, GameState, Language, LevelConfig, MatchResult } from '../game/types';
import { LEVELS } from '../game/levels';
import { getThemeCssVars, getThemeForLevel } from '../game/themes';

interface GameModalsProps {
  gameState: GameState;
  level: LevelConfig;
  language: Language;
  result: MatchResult | null;
  onResume: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
  onBackToMenu: () => void;
  onToggleLang: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  gameState,
  level,
  language,
  result,
  onResume,
  onRestart,
  onNextLevel,
  onBackToMenu,
  onToggleLang,
}) => {
  if (gameState !== 'PAUSED' && gameState !== 'VICTORY' && gameState !== 'GAME_OVER') {
    return null;
  }

  const t = COPY[language];
  const hasNextLevel = level.id < LEVELS.length;
  const theme = getThemeForLevel(level.id);
  const themeVars = getThemeCssVars(theme) as React.CSSProperties;

  return (
    <div
      style={themeVars}
      className="absolute inset-0 z-30 bg-[#050914]/82 flex items-center justify-center p-5"
    >
      <div className="relative overflow-hidden w-full max-w-[300px] rounded-2xl panel-3d p-5 animate-modal-pop text-slate-100">
        <div className="absolute top-0 inset-x-0 h-[3px] ball-spectrum-bar opacity-90" />

        {gameState === 'PAUSED' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-bold ${theme.uiAccentClass}`}>
                  {t.level} {level.id}
                </p>
                <h2 className="font-display font-black text-xl text-3d-white">{t.paused}</h2>
              </div>
              <button
                type="button"
                onClick={onToggleLang}
                className="btn-3d-theme-secondary px-2.5 py-1 rounded-lg text-[11px] font-mono font-extrabold cursor-pointer min-h-[34px]"
              >
                {language === 'ru' ? 'RU' : 'EN'}
              </button>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {language === 'ru' ? level.subtitleRu : level.subtitleEn}
            </p>

            <div className="flex flex-col items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onResume}
                className="btn-3d-theme-primary w-full max-w-[220px] py-2.5 px-4 rounded-xl font-display font-black text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[40px]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t.resume}</span>
              </button>

              <button
                type="button"
                onClick={onRestart}
                className="btn-3d-theme-secondary w-full max-w-[220px] py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[38px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.restart}</span>
              </button>

              <button
                type="button"
                onClick={onBackToMenu}
                className="btn-3d-theme-secondary w-full max-w-[220px] py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[38px]"
              >
                <Grid3X3 className="w-3.5 h-3.5 text-amber-300" />
                <span>{t.backToMenu}</span>
              </button>
            </div>
          </div>
        )}

        {gameState === 'VICTORY' && result && (
          <div className="flex flex-col items-center text-center gap-3.5">
            <div>
              <p className={`text-xs font-bold ${theme.uiAccentClass}`}>
                {t.level} {level.id} · {language === 'ru' ? level.titleRu : level.titleEn}
              </p>
              <h2 className="font-display font-black text-2xl text-3d-gold mt-0.5">
                {t.victory}
              </h2>
            </div>

            <div className="flex items-center justify-center gap-2.5 py-0.5">
              {[1, 2, 3].map((s) => {
                const earned = s <= result.stars;
                const animClass =
                  s === 1 ? 'animate-star-1' : s === 2 ? 'animate-star-2' : 'animate-star-3';
                return (
                  <Star
                    key={s}
                    className={`w-9 h-9 ${s === 2 ? '-mt-2 w-11 h-11' : ''} ${
                      earned
                        ? `text-amber-400 fill-amber-400 drop-shadow-[0_6px_14px_rgba(251,191,36,0.6)] ${animClass}`
                        : 'text-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            <div className="w-full rounded-xl subpanel-3d p-3 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>{t.matchPoints}</span>
                <span className="font-mono font-bold text-slate-100 tabular-nums">
                  {result.matchScore.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{t.dropBonus}</span>
                <span className="font-mono font-bold text-emerald-300 tabular-nums">
                  +{result.dropScore.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{t.shotBonus}</span>
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  +{result.shotBonus.toLocaleString()}
                </span>
              </div>
              <div className="h-px bg-white/15 my-0.5" />
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-100 text-xs">{t.totalScore}</span>
                <span className="font-mono font-black text-lg text-3d-amber tabular-nums">
                  {result.score.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="w-full flex flex-col items-center gap-2 pt-0.5">
              {hasNextLevel ? (
                <button
                  type="button"
                  onClick={onNextLevel}
                  className="btn-3d-theme-primary w-full max-w-[220px] py-2.5 px-4 rounded-xl font-display font-black text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[40px]"
                >
                  <span>{t.nextLevel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <p className="text-xs font-bold text-3d-amber py-1">{t.allComplete}</p>
              )}

              <div className="grid grid-cols-2 gap-2 w-full max-w-[220px]">
                <button
                  type="button"
                  onClick={onRestart}
                  className="btn-3d-theme-secondary py-2 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap min-h-[38px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.restart}</span>
                </button>
                <button
                  type="button"
                  onClick={onBackToMenu}
                  className="btn-3d-theme-secondary py-2 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap min-h-[38px]"
                >
                  <Grid3X3 className="w-3 h-3 text-amber-300" />
                  <span>{t.levelMap}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'GAME_OVER' && result && (
          <div className="flex flex-col items-center text-center gap-3.5">
            <div>
              <p className="text-xs font-bold text-rose-300">
                {t.level} {level.id}
              </p>
              <h2 className="font-display font-black text-xl text-3d-white mt-0.5">
                {t.gameOver}
              </h2>
              <p className="text-xs text-slate-200 mt-1">
                {result.reason === 'danger_line' ? t.dangerReached : t.outOfShots}
              </p>
            </div>

            <div className="w-full rounded-xl subpanel-3d p-3 flex justify-between items-baseline">
              <span className="text-xs font-bold text-slate-300">{t.score}</span>
              <span className="font-mono font-black text-lg text-3d-amber tabular-nums">
                {result.score.toLocaleString()}
              </span>
            </div>

            <div className="w-full flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={onRestart}
                className="btn-3d-theme-primary w-full max-w-[220px] py-2.5 px-4 rounded-xl font-display font-black text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[40px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.tryAgain}</span>
              </button>

              <button
                type="button"
                onClick={onBackToMenu}
                className="btn-3d-theme-secondary w-full max-w-[220px] py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[38px]"
              >
                <Grid3X3 className="w-3.5 h-3.5 text-amber-300" />
                <span>{t.backToMenu}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
