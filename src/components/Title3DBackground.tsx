import React, { useEffect, useRef } from 'react';
import { LEVELS } from '../game/levels';
import { buildLevelGrid } from '../game/levels';
import { computeAimTrajectory } from '../game/hexMath';
import { Sharikboz3DEngine } from '../game/threeScene';
import { ThemeConfig } from '../game/types';

interface Title3DBackgroundProps {
  theme: ThemeConfig;
  stageId: number;
}

/**
 * Renders the exact same 3D gameplay arena, pillars, bonus basins, 3D cannon,
 * and a live preview cluster of 3D spheres from the selected stage/world so
 * the pre-game Title & Stage screens feel 100% unified with the game scene.
 */
export const Title3DBackground: React.FC<Title3DBackgroundProps> = ({ theme, stageId }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Sharikboz3DEngine | null>(null);
  const stateRef = useRef<{ theme: ThemeConfig; stageId: number }>({ theme, stageId });
  stateRef.current = { theme, stageId };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new Sharikboz3DEngine(container, stateRef.current.theme);
    engineRef.current = engine;

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    let frameId = 0;
    let disposed = false;
    let time = 0;
    let lastTs = performance.now();
    let lastStageId = -1;
    let previewGrid = buildLevelGrid(LEVELS[0]);

    const afterDraw = (cb: () => void) => {
      const gl = engine.renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
          else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;
      time += dt;

      const { theme: activeTheme, stageId: activeStage } = stateRef.current;
      engine.applyTheme(activeTheme);
      if (activeStage !== lastStageId) {
        lastStageId = activeStage;
        const cfg = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, activeStage - 1))];
        previewGrid = buildLevelGrid(cfg);
      }

      const cfg = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, activeStage - 1))];
      const aimAngle = -Math.PI / 2 + Math.sin(time * 0.65) * 0.42;
      const aimTrace = computeAimTrajectory(aimAngle, previewGrid, 0, 55);

      engine.syncAndRender({
        dt,
        time,
        grid: previewGrid,
        visualCeilingDrop: 0,
        projectile: null,
        falling: [],
        popping: [],
        aimAngle,
        aimTrace,
        isAiming: false,
        activeColor: cfg.colors[0],
        activeKind: 'normal',
        nextColor: cfg.colors[1] || cfg.colors[0],
        nextKind: 'normal',
        cannonRecoil: 0,
        shakeX: 0,
        shakeY: 0,
        dangerProximity: 0,
        bucketFlash: [0, 0, 0, 0, 0],
      });

      if (engine.isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    if (engine.isSoftwareGl) frameId = window.setTimeout(tick, 16);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};
