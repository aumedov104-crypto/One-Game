import React from 'react';
import { Flame, Pause, RefreshCw, Star, Volume2, VolumeX } from 'lucide-react';
import { COLOR_PALETTE, COPY, HudSnapshot, Language, LevelConfig } from '../game/types';
import { getThemeCssVars, getThemeForLevel } from '../game/themes';

interface GameHUDProps {
  level: LevelConfig;
  hud: HudSnapshot;
  language: Language;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onSwap: () => void;
  onToggleBomb: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  level,
  hud,
  language,
  muted,
  onPause,
  onToggleMute,
  onSwap,
  onToggleBomb,
}) => {
  const t = COPY[language];
  const theme = getThemeForLevel(level.id);
  const themeVars = getThemeCssVars(theme) as React.CSSProperties;
  const maxThreshold = hud.starThresholds[2];
  const progressPct = Math.min(100, (hud.score / maxThreshold) * 100);
  const bombReady = hud.bombCharge >= hud.bombMaxCharge;
  const bombPct = Math.min(100, (hud.bombCharge / hud.bombMaxCharge) * 100);
  const lowShots = hud.shotsLeft <= 5;

  const activeOrbHex = COLOR_PALETTE[hud.activeColor]?.main || '#FFE600';
  const nextOrbHex = COLOR_PALETTE[hud.nextColor]?.main || '#00EEFF';

  return (
    <div
      style={themeVars}
      className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10"
    >
      {/* Top 3D Beveled AppBar Matched to Active 3D World & Ball Colors */}
      <div
        className="relative w-full min-h-[64px] pt-[env(safe-area-inset-top)] px-3 flex items-center justify-between gap-2"
        style={{
          background: theme.ui.barGradient,
          borderBottom: `1px solid ${theme.ui.barBorder}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        {/* Stage, World & Objective */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-black text-sm text-3d-white whitespace-nowrap">
              {t.level} {level.id}
            </span>
            {hud.objectiveType === 'collect_stars' && (
              <span className="inline-flex items-center gap-0.5 text-xs font-mono font-bold text-3d-amber tabular-nums">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {hud.starsCollected}/{hud.starsTarget}
              </span>
            )}
          </div>
          <span className={`text-[11px] truncate max-w-[138px] font-semibold ${theme.uiAccentClass}`}>
            {language === 'ru' ? theme.nameRu : theme.nameEn}
          </span>
        </div>

        {/* Center 3D Score & Colorful Gauge */}
        <div className="flex flex-col items-center flex-1 max-w-[135px]">
          <span className="font-mono font-extrabold text-lg text-3d-amber tabular-nums leading-tight">
            {hud.score.toLocaleString()}
          </span>
          <div className="relative w-full h-2.5 subpanel-3d rounded-full overflow-hidden mt-1">
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${progressPct}%`,
                background: theme.ui.progressGradient,
              }}
            />
          </div>
        </div>

        {/* Right Theme-Colored 3D Control Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="btn-3d-theme-secondary w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            aria-label={t.paused}
            className="btn-3d-theme-secondary w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Prismatic Ball-Palette Accent Strip */}
        <div className="absolute bottom-0 inset-x-0 h-[2.5px] ball-spectrum-bar opacity-90" />
      </div>

      {/* Bottom 3D Cannon Side Docks */}
      <div className="w-full px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-end justify-between">
        {/* Left Side: Colorful 3D Swap Button + Ceiling Pressure Pips */}
        <div className="flex flex-col items-start gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1 px-1" title="Ceiling pressure">
            {Array.from({ length: hud.missLimit }, (_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < hud.missPips
                    ? 'bg-gradient-to-b from-white to-slate-300 shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                    : 'bg-slate-900 border border-slate-600'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onSwap}
            className="btn-3d-theme-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer min-h-[36px]"
          >
            <span className="inline-flex items-center -space-x-1">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/70"
                style={{ backgroundColor: activeOrbHex }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/70"
                style={{ backgroundColor: nextOrbHex }}
              />
            </span>
            <RefreshCw className="w-3 h-3 text-amber-300" />
            <span className="whitespace-nowrap">{t.swap}</span>
          </button>
        </div>

        {/* Right Side: 3D Bomb Power-Up + Remaining Shots */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          <div className="flex items-baseline gap-1.5 px-1">
            <span className="text-[11px] font-bold text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {t.shots}
            </span>
            <span
              className={`font-mono font-black text-xl tabular-nums leading-none ${
                lowShots ? 'text-rose-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]' : 'text-3d-white'
              }`}
            >
              {hud.shotsLeft}
            </span>
          </div>

          <button
            type="button"
            disabled={!bombReady}
            onClick={onToggleBomb}
            className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold min-h-[36px] ${
              hud.bombArmed
                ? 'btn-3d-orange cursor-pointer'
                : bombReady
                ? 'btn-3d-theme-primary cursor-pointer'
                : 'subpanel-3d text-slate-300 cursor-not-allowed'
            }`}
          >
            {!bombReady && (
              <span
                className="absolute inset-y-0 left-0 transition-all duration-200"
                style={{
                  width: `${bombPct}%`,
                  background: 'linear-gradient(90deg, rgba(255,31,45,0.55) 0%, rgba(255,230,0,0.55) 100%)',
                }}
              />
            )}
            <Flame
              className={`relative z-10 w-3.5 h-3.5 ${
                hud.bombArmed || bombReady ? 'text-current' : 'text-orange-400'
              }`}
            />
            <span className="relative z-10 whitespace-nowrap font-mono tabular-nums">
              {bombReady ? t.bomb : `${hud.bombCharge}/${hud.bombMaxCharge}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
