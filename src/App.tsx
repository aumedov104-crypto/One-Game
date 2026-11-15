import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas3D, GameCanvasHandle } from './components/GameCanvas3D';
import { GameHUD } from './components/GameHUD';
import { GameModals } from './components/GameModals';
import { TitleScreen } from './components/TitleScreen';
import { LEVELS } from './game/levels';
import { soundEngine } from './game/sound';
import {
  BOMB_MAX_CHARGE,
  GameState,
  HudSnapshot,
  LevelConfig,
  MatchResult,
  SaveState,
} from './game/types';

declare global {
  interface Window {
    __setPreloaderProgress?: (pct: number) => void;
    __finishPreloader?: () => void;
  }
}

const STORAGE_KEY = 'sharikboz_3d_save_v1';

const DEFAULT_SAVE: SaveState = {
  unlockedLevel: 1,
  levels: {},
  muted: false,
  language: 'ru',
};

function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SAVE;
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    return {
      unlockedLevel: typeof parsed.unlockedLevel === 'number' ? parsed.unlockedLevel : 1,
      levels: parsed.levels && typeof parsed.levels === 'object' ? parsed.levels : {},
      muted: Boolean(parsed.muted),
      language: parsed.language === 'en' ? 'en' : 'ru',
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

export default function App() {
  const [save, setSave] = useState<SaveState>(() => {
    const initial = loadSave();
    soundEngine.setMuted(initial.muted);
    return initial;
  });

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [currentLevelId, setCurrentLevelId] = useState<number>(() =>
    Math.min(loadSave().unlockedLevel, LEVELS.length)
  );
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);

  const canvasHandleRef = useRef<GameCanvasHandle | null>(null);

  const currentLevel: LevelConfig =
    LEVELS.find((l) => l.id === currentLevelId) || LEVELS[0];

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    score: 0,
    shotsLeft: currentLevel.shots,
    maxShots: currentLevel.shots,
    missPips: currentLevel.missLimit,
    missLimit: currentLevel.missLimit,
    bombCharge: 0,
    bombMaxCharge: BOMB_MAX_CHARGE,
    bombArmed: false,
    starsCollected: 0,
    starsTarget: currentLevel.objective.targetCount || 0,
    objectiveType: currentLevel.objective.type,
    activeColor: currentLevel.colors[0],
    activeKind: 'normal',
    nextColor: currentLevel.colors[1] || currentLevel.colors[0],
    nextKind: 'normal',
    combo: 0,
    starThresholds: currentLevel.starThresholds,
  }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
      // Ignore storage quota issues in sandboxed frames
    }
  }, [save]);

  // Keep background music synced to active PLAYING state
  useEffect(() => {
    if (gameState === 'PLAYING') {
      soundEngine.startMusic();
      soundEngine.setMusicPaused(false);
    } else if (gameState === 'PAUSED' || gameState === 'VICTORY' || gameState === 'GAME_OVER') {
      soundEngine.setMusicPaused(true);
    } else {
      soundEngine.stopMusic();
    }
  }, [gameState]);

  const handleSceneReady = useCallback(() => {
    window.__finishPreloader?.();
  }, []);

  useEffect(() => {
    window.__setPreloaderProgress?.(85);
    const fallback = window.setTimeout(() => {
      window.__finishPreloader?.();
    }, 3500);
    return () => window.clearTimeout(fallback);
  }, []);

  const startLevel = useCallback((levelId: number) => {
    soundEngine.unlock();
    soundEngine.playClick();
    setCurrentLevelId(levelId);
    setLastResult(null);
    setGameState('PLAYING');
  }, []);

  const handleToggleMute = useCallback(() => {
    setSave((prev) => {
      const nextMuted = !prev.muted;
      soundEngine.setMuted(nextMuted);
      if (!nextMuted) {
        soundEngine.unlock();
        soundEngine.playClick();
      }
      return { ...prev, muted: nextMuted };
    });
  }, []);

  const handleToggleLang = useCallback(() => {
    soundEngine.playClick();
    setSave((prev) => ({
      ...prev,
      language: prev.language === 'ru' ? 'en' : 'ru',
    }));
  }, []);

  const handleVictory = useCallback(
    (result: MatchResult) => {
      setLastResult(result);
      setGameState('VICTORY');
      setSave((prev) => {
        const existing = prev.levels[currentLevelId] || { stars: 0, bestScore: 0 };
        const nextUnlocked = Math.min(
          LEVELS.length,
          Math.max(prev.unlockedLevel, currentLevelId + 1)
        );
        return {
          ...prev,
          unlockedLevel: nextUnlocked,
          levels: {
            ...prev.levels,
            [currentLevelId]: {
              stars: Math.max(existing.stars, result.stars),
              bestScore: Math.max(existing.bestScore, result.score),
            },
          },
        };
      });
    },
    [currentLevelId]
  );

  const handleGameOver = useCallback((result: MatchResult) => {
    setLastResult(result);
    setGameState('GAME_OVER');
  }, []);

  const handleRestart = useCallback(() => {
    soundEngine.playClick();
    setLastResult(null);
    setGameState('PLAYING');
    canvasHandleRef.current?.resetLevel();
  }, []);

  const handleNextLevel = useCallback(() => {
    const nextId = Math.min(LEVELS.length, currentLevelId + 1);
    startLevel(nextId);
  }, [currentLevelId, startLevel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameState === 'PLAYING') {
          soundEngine.playClick();
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          soundEngine.playClick();
          setGameState('PLAYING');
        } else if (gameState === 'LEVEL_SELECT') {
          setGameState('TITLE_MENU');
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && gameState === 'TITLE_MENU') {
        e.preventDefault();
        startLevel(Math.min(save.unlockedLevel, LEVELS.length));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, save.unlockedLevel, startLevel]);

  const isPlayingOrModal =
    gameState === 'PLAYING' ||
    gameState === 'PAUSED' ||
    gameState === 'VICTORY' ||
    gameState === 'GAME_OVER';

  return (
    <main className="w-full h-[100dvh] bg-[#050811] flex items-center justify-center overflow-hidden">
      <div className="relative h-full w-full sm:h-[min(100dvh,920px)] sm:w-auto sm:aspect-[9/16] max-w-full bg-[#091020] sm:rounded-2xl overflow-hidden sm:border sm:border-slate-800/90 sm:shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        {(gameState === 'TITLE_MENU' || gameState === 'LEVEL_SELECT') && (
          <TitleScreen
            save={save}
            showLevelMap={gameState === 'LEVEL_SELECT'}
            onToggleLevelMap={(open) => {
              soundEngine.unlock();
              soundEngine.playClick();
              setGameState(open ? 'LEVEL_SELECT' : 'TITLE_MENU');
            }}
            onStartLevel={startLevel}
            onToggleMute={handleToggleMute}
            onToggleLang={handleToggleLang}
            onReady={handleSceneReady}
          />
        )}

        {isPlayingOrModal && (
          <>
            <GameCanvas3D
              ref={canvasHandleRef}
              level={currentLevel}
              paused={gameState === 'PAUSED'}
              ended={gameState === 'VICTORY' || gameState === 'GAME_OVER'}
              onHudUpdate={setHud}
              onVictory={handleVictory}
              onGameOver={handleGameOver}
            />

            <GameHUD
              level={currentLevel}
              hud={hud}
              language={save.language}
              muted={save.muted}
              onPause={() => {
                soundEngine.playClick();
                setGameState('PAUSED');
              }}
              onToggleMute={handleToggleMute}
              onSwap={() => canvasHandleRef.current?.swapBubbles()}
              onToggleBomb={() => canvasHandleRef.current?.toggleBomb()}
            />

            <GameModals
              gameState={gameState}
              level={currentLevel}
              language={save.language}
              result={lastResult}
              onResume={() => {
                soundEngine.playClick();
                setGameState('PLAYING');
              }}
              onRestart={handleRestart}
              onNextLevel={handleNextLevel}
              onBackToMenu={() => {
                soundEngine.playClick();
                setGameState('LEVEL_SELECT');
              }}
              onToggleLang={handleToggleLang}
            />
          </>
        )}
      </div>
    </main>
  );
}
