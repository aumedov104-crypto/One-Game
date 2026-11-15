import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  BOMB_MAX_CHARGE,
  BONUS_BUCKET_VALUES,
  BONUS_BUCKET_Y,
  BUBBLE_D,
  BUBBLE_R,
  BubbleColor,
  CANVAS_H,
  CANVAS_W,
  CANNON_X,
  CANNON_Y,
  COLOR_PALETTE,
  DANGER_LINE_Y,
  FallingBubble,
  FloatingTextItem,
  GridBubble,
  HudSnapshot,
  LEFT_WALL,
  LevelConfig,
  MatchResult,
  PROJECTILE_SPEED,
  PoppingBubble,
  Projectile,
  RIGHT_WALL,
  ROW_H,
  TOP_CEILING_BASE,
} from '../game/types';
import {
  cellKey,
  computeAimTrajectory,
  findColorCluster,
  findFloatingBubbles,
  findNearestEmptyCell,
  getBubblesInRadius,
  getNeighbors,
  gridToPixel,
} from '../game/hexMath';
import { buildLevelGrid } from '../game/levels';
import { getThemeForLevel } from '../game/themes';
import { Sharikboz3DEngine } from '../game/threeScene';
import { soundEngine } from '../game/sound';

export interface GameCanvasHandle {
  swapBubbles: () => void;
  toggleBomb: () => void;
  resetLevel: () => void;
}

interface GameCanvas3DProps {
  level: LevelConfig;
  paused: boolean;
  ended: boolean;
  onHudUpdate: (hud: HudSnapshot) => void;
  onVictory: (result: MatchResult) => void;
  onGameOver: (result: MatchResult) => void;
}

const MIN_ANGLE = -Math.PI + 0.22;
const MAX_ANGLE = -0.22;

export const GameCanvas3D = React.forwardRef<GameCanvasHandle, GameCanvas3DProps>(
  ({ level, paused, ended, onHudUpdate, onVictory, onGameOver }, ref) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const engineRef = useRef<Sharikboz3DEngine | null>(null);
    const [popups, setPopups] = useState<FloatingTextItem[]>([]);
    const [contextLost, setContextLost] = useState(false);
    const [bucketLayout, setBucketLayout] = useState<{ topPct: number; xsPct: number[] }>({
      topPct: 72,
      xsPct: [14, 32, 50, 68, 86],
    });

    const pausedRef = useRef(paused);
    const endedRef = useRef(ended);
    const levelRef = useRef(level);
    pausedRef.current = paused;
    endedRef.current = ended;
    levelRef.current = level;

    const callbacksRef = useRef({ onHudUpdate, onVictory, onGameOver });
    callbacksRef.current = { onHudUpdate, onVictory, onGameOver };

    const simRef = useRef<{
      grid: Map<string, GridBubble>;
      ceilingDropRows: number;
      visualCeilingDrop: number;
      projectile: Projectile | null;
      falling: FallingBubble[];
      popping: PoppingBubble[];
      aimAngle: number;
      isAiming: boolean;
      activePointerId: number | null;
      activeColor: BubbleColor;
      activeKind: 'normal' | 'bomb' | 'rainbow';
      nextColor: BubbleColor;
      nextKind: 'normal' | 'bomb' | 'rainbow';
      score: number;
      matchScore: number;
      dropScore: number;
      shotsLeft: number;
      missPips: number;
      bombCharge: number;
      bombArmed: boolean;
      combo: number;
      starsCollected: number;
      starsTarget: number;
      cannonRecoil: number;
      hitstopTimer: number;
      shakeTimer: number;
      shakeMag: number;
      bucketFlash: number[];
      time: number;
      finishPending: 'none' | 'victory' | 'gameover';
      finishDelay: number;
      loseReason: 'out_of_shots' | 'danger_line';
      keysHeld: { left: boolean; right: boolean };
      popupSeq: number;
    } | null>(null);

    const pickBoardColor = (
      grid: Map<string, GridBubble>,
      fallbackColors: BubbleColor[]
    ): BubbleColor => {
      const present = new Set<BubbleColor>();
      for (const b of grid.values()) {
        if (b.kind === 'normal' || b.kind === 'ice') present.add(b.color);
      }
      const pool = present.size > 0 ? Array.from(present) : fallbackColors;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const emitHud = () => {
      const s = simRef.current;
      const lvl = levelRef.current;
      if (!s) return;
      callbacksRef.current.onHudUpdate({
        score: s.score,
        shotsLeft: s.shotsLeft,
        maxShots: lvl.shots,
        missPips: s.missPips,
        missLimit: lvl.missLimit,
        bombCharge: s.bombCharge,
        bombMaxCharge: BOMB_MAX_CHARGE,
        bombArmed: s.bombArmed,
        starsCollected: s.starsCollected,
        starsTarget: s.starsTarget,
        objectiveType: lvl.objective.type,
        activeColor: s.activeColor,
        activeKind: s.bombArmed ? 'bomb' : s.activeKind,
        nextColor: s.nextColor,
        nextKind: s.nextKind,
        combo: s.combo,
        starThresholds: lvl.starThresholds,
      });
    };

    const initLevel = (lvl: LevelConfig) => {
      const grid = buildLevelGrid(lvl);
      let starCount = 0;
      for (const b of grid.values()) {
        if (b.kind === 'star') starCount++;
      }
      const starsTarget =
        lvl.objective.type === 'collect_stars' ? lvl.objective.targetCount || starCount : 0;

      simRef.current = {
        grid,
        ceilingDropRows: 0,
        visualCeilingDrop: 0,
        projectile: null,
        falling: [],
        popping: [],
        aimAngle: -Math.PI / 2,
        isAiming: false,
        activePointerId: null,
        activeColor: pickBoardColor(grid, lvl.colors),
        activeKind: 'normal',
        nextColor: pickBoardColor(grid, lvl.colors),
        nextKind: 'normal',
        score: 0,
        matchScore: 0,
        dropScore: 0,
        shotsLeft: lvl.shots,
        missPips: lvl.missLimit,
        bombCharge: 0,
        bombArmed: false,
        combo: 0,
        starsCollected: 0,
        starsTarget,
        cannonRecoil: 0,
        hitstopTimer: 0,
        shakeTimer: 0,
        shakeMag: 0,
        bucketFlash: [0, 0, 0, 0, 0],
        time: 0,
        finishPending: 'none',
        finishDelay: 0,
        loseReason: 'out_of_shots',
        keysHeld: { left: false, right: false },
        popupSeq: 0,
      };
      setPopups([]);
      engineRef.current?.applyTheme(getThemeForLevel(lvl.id));
      emitHud();
    };

    useImperativeHandle(ref, () => ({
      swapBubbles: () => {
        const s = simRef.current;
        if (!s || s.projectile || pausedRef.current || endedRef.current || s.finishPending !== 'none')
          return;
        if (s.bombArmed) s.bombArmed = false;
        const tc = s.activeColor;
        const tk = s.activeKind;
        s.activeColor = s.nextColor;
        s.activeKind = s.nextKind;
        s.nextColor = tc;
        s.nextKind = tk;
        soundEngine.playSwap();
        emitHud();
      },
      toggleBomb: () => {
        const s = simRef.current;
        if (!s || s.projectile || pausedRef.current || endedRef.current || s.finishPending !== 'none')
          return;
        if (s.bombCharge >= BOMB_MAX_CHARGE) {
          s.bombArmed = !s.bombArmed;
          soundEngine.playSwap();
          emitHud();
        }
      },
      resetLevel: () => {
        initLevel(levelRef.current);
      },
    }));

    // Re-init level whenever level config changes
    useEffect(() => {
      initLevel(level);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level]);

    // Mount Three.js engine once
    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const engine = new Sharikboz3DEngine(container, getThemeForLevel(levelRef.current.id));
      engineRef.current = engine;

      const domEl = engine.renderer.domElement;
      const onContextLost = (e: Event) => {
        e.preventDefault();
        setContextLost(true);
      };
      const onContextRestored = () => {
        setContextLost(false);
      };
      domEl.addEventListener('webglcontextlost', onContextLost);
      domEl.addEventListener('webglcontextrestored', onContextRestored);

      const syncBucketLabels = () => {
        setBucketLayout(engine.getBucketScreenCoords());
      };
      syncBucketLabels();

      const onResize = () => {
        engine.resize();
        syncBucketLabels();
      };
      window.addEventListener('resize', onResize);

      const pushPopup = (x2d: number, y2d: number, text: string, color = '#FDE68A') => {
        const s = simRef.current;
        if (!s) return;
        const id = ++s.popupSeq;
        const xPct = Math.max(14, Math.min(86, (x2d / CANVAS_W) * 100));
        const yPct = Math.max(12, Math.min(84, (y2d / CANVAS_H) * 100));
        setPopups((prev) => [...prev.slice(-7), { id, xPct, yPct, text, color }]);
        window.setTimeout(() => {
          setPopups((prev) => prev.filter((p) => p.id !== id));
        }, 780);
      };

      const checkDangerLine = (): boolean => {
        const s = simRef.current;
        if (!s) return false;
        for (const b of s.grid.values()) {
          const pos = gridToPixel(b.row, b.col, s.ceilingDropRows);
          if (pos.y + BUBBLE_R >= DANGER_LINE_Y) return true;
        }
        return false;
      };

      const getDangerProximity = (): number => {
        const s = simRef.current;
        if (!s) return 0;
        let maxY = 0;
        for (const b of s.grid.values()) {
          const pos = gridToPixel(b.row, b.col, s.ceilingDropRows);
          if (pos.y > maxY) maxY = pos.y;
        }
        const startWarn = DANGER_LINE_Y - ROW_H * 4;
        if (maxY <= startWarn) return 0;
        return Math.min(1, (maxY - startWarn) / (DANGER_LINE_Y - startWarn));
      };

      const checkWinCondition = (): boolean => {
        const s = simRef.current;
        const lvl = levelRef.current;
        if (!s) return false;
        if (lvl.objective.type === 'collect_stars') {
          return s.starsCollected >= s.starsTarget;
        }
        let hasTopRow = false;
        let nonStoneCount = 0;
        for (const b of s.grid.values()) {
          if (b.row === 0) hasTopRow = true;
          if (b.kind !== 'stone') nonStoneCount++;
        }
        return !hasTopRow || nonStoneCount === 0;
      };

      const dropAllRemainingAsVictoryCascade = () => {
        const s = simRef.current;
        if (!s) return;
        for (const b of s.grid.values()) {
          const pos = gridToPixel(b.row, b.col, s.ceilingDropRows);
          s.falling.push({
            x: pos.x,
            y: pos.y,
            vx: (Math.random() - 0.5) * 140,
            vy: -60 + Math.random() * 40,
            vz: (Math.random() - 0.3) * 2.5,
            z: 0,
            rotation: 0,
            vRot: (Math.random() - 0.5) * 6,
            color: b.color,
            kind: b.kind,
            scored: false,
          });
        }
        s.grid.clear();
      };

      const advanceQueue = () => {
        const s = simRef.current;
        const lvl = levelRef.current;
        if (!s) return;
        const present = new Set<BubbleColor>();
        for (const b of s.grid.values()) {
          if (b.kind === 'normal' || b.kind === 'ice') present.add(b.color);
        }
        if (present.size > 0 && !present.has(s.nextColor)) {
          s.nextColor = pickBoardColor(s.grid, lvl.colors);
        }
        s.activeColor = s.nextColor;
        s.activeKind = s.nextKind;

        const rollRainbow = lvl.id >= 6 && Math.random() < 0.085;
        s.nextColor = pickBoardColor(s.grid, lvl.colors);
        s.nextKind = rollRainbow ? 'rainbow' : 'normal';
      };

      const fireProjectile = () => {
        const s = simRef.current;
        if (!s || s.projectile || pausedRef.current || endedRef.current || s.finishPending !== 'none')
          return;
        if (s.shotsLeft <= 0) return;

        soundEngine.unlock();
        soundEngine.playShoot();

        const useBomb = s.bombArmed && s.bombCharge >= BOMB_MAX_CHARGE;
        const kind: 'normal' | 'bomb' | 'rainbow' = useBomb ? 'bomb' : s.activeKind;
        const color = s.activeColor;

        if (useBomb) {
          s.bombArmed = false;
          s.bombCharge = 0;
        }

        s.shotsLeft -= 1;
        s.cannonRecoil = 1;

        s.projectile = {
          x: CANNON_X + Math.cos(s.aimAngle) * 36,
          y: CANNON_Y + Math.sin(s.aimAngle) * 36,
          vx: Math.cos(s.aimAngle) * PROJECTILE_SPEED,
          vy: Math.sin(s.aimAngle) * PROJECTILE_SPEED,
          color,
          kind,
          trail: [],
        };

        advanceQueue();
        emitHud();
      };

      const handleProjectileImpact = (px: number, py: number, proj: Projectile) => {
        const s = simRef.current;
        const lvl = levelRef.current;
        if (!s) return;

        const targetCell = findNearestEmptyCell(px, py, s.grid, s.ceilingDropRows);
        const snapPos = gridToPixel(targetCell.row, targetCell.col, s.ceilingDropRows);

        if (proj.kind === 'bomb') {
          const victims = getBubblesInRadius(targetCell.row, targetCell.col, 2, s.grid);
          soundEngine.playBomb();
          s.hitstopTimer = 0.055;
          s.shakeTimer = 0.25;
          s.shakeMag = 7;
          engine.spawnColorAura(snapPos.x, snapPos.y, 0xff7b00, 3.8, 0.95);
          engine.spawnBurst(snapPos.x, snapPos.y, 0xffb86b, 24, 11);

          let gained = 0;
          victims.forEach((vb, idx) => {
            const vPos = gridToPixel(vb.row, vb.col, s.ceilingDropRows);
            if (vb.kind === 'star') {
              s.starsCollected += 1;
              soundEngine.playStar();
              gained += 250;
              engine.spawnColorAura(vPos.x, vPos.y, 0xf5df00, 2.0, 0.9);
              engine.spawnBurst(vPos.x, vPos.y, 0xf5df00, 14, 9);
            } else {
              const vHex = vb.kind === 'stone' ? 0x94a3b8 : COLOR_PALETTE[vb.color].hex;
              gained += 55;
              engine.spawnColorAura(vPos.x, vPos.y, vHex, 1.65, 0.78);
              engine.spawnBurst(vPos.x, vPos.y, vHex, 9, 7.5);
            }
            s.popping.push({
              x: vPos.x,
              y: vPos.y,
              color: vb.color,
              kind: vb.kind,
              timer: 0,
              duration: 0.16,
              delay: idx * 0.015,
            });
            s.grid.delete(cellKey(vb.row, vb.col));
          });

          const floating = findFloatingBubbles(s.grid);
          floating.forEach((fb) => {
            const fPos = gridToPixel(fb.row, fb.col, s.ceilingDropRows);
            s.grid.delete(cellKey(fb.row, fb.col));
            if (fb.kind === 'star') {
              s.starsCollected += 1;
              soundEngine.playStar();
            }
            s.falling.push({
              x: fPos.x,
              y: fPos.y,
              vx: (Math.random() - 0.5) * 90,
              vy: -30 + Math.random() * 20,
              vz: (Math.random() - 0.3) * 2.0,
              z: 0,
              rotation: 0,
              vRot: (Math.random() - 0.5) * 5,
              color: fb.color,
              kind: fb.kind,
              scored: false,
            });
          });

          if (gained > 0) {
            s.score += gained;
            s.matchScore += gained;
            pushPopup(snapPos.x, snapPos.y - 12, `+${gained}`, '#FDBA74');
          }

          if (checkWinCondition()) {
            dropAllRemainingAsVictoryCascade();
            s.finishPending = 'victory';
            s.finishDelay = 0.85;
            soundEngine.playWin();
          } else if (s.shotsLeft <= 0) {
            s.finishPending = 'gameover';
            s.loseReason = 'out_of_shots';
            s.finishDelay = 0.75;
            soundEngine.playLose();
          }
          emitHud();
          return;
        }

        const placed: GridBubble = {
          row: targetCell.row,
          col: targetCell.col,
          color: proj.color,
          kind: proj.kind === 'rainbow' ? 'rainbow' : 'normal',
          hp: 1,
          wobble: 1,
          phase: 0,
        };
        s.grid.set(cellKey(placed.row, placed.col), placed);

        const neighbors = getNeighbors(placed.row, placed.col);
        for (const n of neighbors) {
          const nb = s.grid.get(cellKey(n.row, n.col));
          if (nb) nb.wobble = 0.85;
        }

        let matchedCluster: GridBubble[] = [];
        if (placed.kind === 'rainbow') {
          const testedColors = new Set<BubbleColor>();
          for (const n of neighbors) {
            const nb = s.grid.get(cellKey(n.row, n.col));
            if (nb && nb.kind !== 'stone' && nb.kind !== 'star' && !(nb.kind === 'ice' && nb.hp >= 2)) {
              if (!testedColors.has(nb.color)) {
                testedColors.add(nb.color);
                const c = findColorCluster(placed.row, placed.col, nb.color, s.grid);
                if (c.length > matchedCluster.length) matchedCluster = c;
              }
            }
          }
        } else {
          matchedCluster = findColorCluster(placed.row, placed.col, placed.color, s.grid);
        }

        if (matchedCluster.length >= 3) {
          s.combo += 1;
          const chargeGain = matchedCluster.length >= 5 ? 2 : 1;
          s.bombCharge = Math.min(BOMB_MAX_CHARGE, s.bombCharge + chargeGain);

          const crackedSet = new Set<string>();
          for (const mb of matchedCluster) {
            for (const n of getNeighbors(mb.row, mb.col)) {
              const k = cellKey(n.row, n.col);
              const nb = s.grid.get(k);
              if (nb && nb.kind === 'ice' && nb.hp >= 2 && !crackedSet.has(k)) {
                crackedSet.add(k);
                nb.hp = 1;
                nb.wobble = 1;
                const iPos = gridToPixel(nb.row, nb.col, s.ceilingDropRows);
                engine.spawnBurst(iPos.x, iPos.y, 0xbae6fd, 8, 6);
                soundEngine.playCrackIce();
              }
            }
          }

          const clusterCount = matchedCluster.length;
          if (clusterCount >= 5) {
            s.hitstopTimer = 0.04;
            s.shakeTimer = 0.16;
            s.shakeMag = 4.5;
          } else {
            s.shakeTimer = 0.09;
            s.shakeMag = 2;
          }

          let popPoints = 0;
          matchedCluster.forEach((mb, idx) => {
            const mPos = gridToPixel(mb.row, mb.col, s.ceilingDropRows);
            s.grid.delete(cellKey(mb.row, mb.col));
            s.popping.push({
              x: mPos.x,
              y: mPos.y,
              color: mb.color,
              kind: mb.kind,
              timer: 0,
              duration: 0.14,
              delay: idx * 0.025,
            });
            const auraHex =
              mb.kind === 'rainbow'
                ? 0xffffff
                : mb.kind === 'star'
                ? 0xf5df00
                : COLOR_PALETTE[mb.color].hex;
            engine.spawnColorAura(mPos.x, mPos.y, auraHex, 1.75, 0.85);
            engine.spawnBurst(mPos.x, mPos.y, auraHex, 10, 7.5);
            soundEngine.playPop(idx, s.combo);
            popPoints += 30 + (s.combo - 1) * 10;
          });

          const impactAuraHex =
            placed.kind === 'rainbow' ? 0xffffff : COLOR_PALETTE[placed.color].hex;
          engine.spawnColorAura(
            snapPos.x,
            snapPos.y,
            impactAuraHex,
            clusterCount >= 5 ? 3.1 : 2.25,
            0.92
          );

          const floating = findFloatingBubbles(s.grid);
          floating.forEach((fb) => {
            const fPos = gridToPixel(fb.row, fb.col, s.ceilingDropRows);
            s.grid.delete(cellKey(fb.row, fb.col));
            if (fb.kind === 'star') {
              s.starsCollected += 1;
              popPoints += 250;
              soundEngine.playStar();
              engine.spawnBurst(fPos.x, fPos.y, 0xfde047, 12, 8);
              pushPopup(fPos.x, fPos.y, '+250', '#FDE047');
            }
            s.falling.push({
              x: fPos.x,
              y: fPos.y,
              vx: (Math.random() - 0.5) * 95,
              vy: -35 + Math.random() * 25,
              vz: (Math.random() - 0.3) * 2.2,
              z: 0,
              rotation: 0,
              vRot: (Math.random() - 0.5) * 5,
              color: fb.color,
              kind: fb.kind,
              scored: false,
            });
          });

          s.score += popPoints;
          s.matchScore += popPoints;

          const label = s.combo >= 2 ? `+${popPoints} ×${s.combo}` : `+${popPoints}`;
          pushPopup(snapPos.x, snapPos.y - 10, label, s.combo >= 2 ? '#FDE68A' : '#F8FAFC');
        } else {
          s.combo = 0;
          soundEngine.playSnap();
          s.missPips -= 1;
          if (s.missPips <= 0) {
            s.missPips = lvl.missLimit;
            s.ceilingDropRows += 1;
            s.shakeTimer = 0.14;
            s.shakeMag = 3.5;
            soundEngine.playCeilingDrop();
          }
        }

        if (checkWinCondition()) {
          dropAllRemainingAsVictoryCascade();
          s.finishPending = 'victory';
          s.finishDelay = 0.9;
          soundEngine.playWin();
        } else if (checkDangerLine()) {
          s.finishPending = 'gameover';
          s.loseReason = 'danger_line';
          s.finishDelay = 0.55;
          soundEngine.playLose();
        } else if (s.shotsLeft <= 0) {
          s.finishPending = 'gameover';
          s.loseReason = 'out_of_shots';
          s.finishDelay = 0.7;
          soundEngine.playLose();
        }

        emitHud();
      };

      const computeResult = (isWin: boolean): MatchResult => {
        const s = simRef.current!;
        const lvl = levelRef.current;
        const shotBonus = isWin ? s.shotsLeft * 40 : 0;
        const total = s.score + shotBonus;
        let stars: 0 | 1 | 2 | 3 = 0;
        if (isWin) {
          stars = 1;
          if (total >= lvl.starThresholds[1]) stars = 2;
          if (total >= lvl.starThresholds[2]) stars = 3;
        }
        return {
          score: total,
          matchScore: s.matchScore,
          dropScore: s.dropScore,
          shotBonus,
          stars,
          reason: isWin ? undefined : s.loseReason,
        };
      };

      let frameId = 0;
      let lastTs = performance.now();
      let disposed = false;

      const afterDraw = (cb: () => void) => {
        const gl = engine.renderer.getContext() as WebGL2RenderingContext;
        if (gl && typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (disposed) return;
            const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
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
        const rawDt = (now - lastTs) / 1000;
        lastTs = now;
        const dt = Math.min(rawDt, 0.05);

        const s = simRef.current;
        if (s) {
          if (!pausedRef.current && !endedRef.current) {
            s.time += dt;
            s.visualCeilingDrop += (s.ceilingDropRows - s.visualCeilingDrop) * Math.min(1, dt * 10);

            const turnSpeed = 1.65;
            if (s.keysHeld.left) s.aimAngle = Math.max(MIN_ANGLE, s.aimAngle - turnSpeed * dt);
            if (s.keysHeld.right) s.aimAngle = Math.min(MAX_ANGLE, s.aimAngle + turnSpeed * dt);

            if (s.cannonRecoil > 0) s.cannonRecoil = Math.max(0, s.cannonRecoil - dt * 7);

            for (let i = 0; i < 5; i++) {
              if (s.bucketFlash[i] > 0) s.bucketFlash[i] = Math.max(0, s.bucketFlash[i] - dt * 4);
            }

            if (s.hitstopTimer > 0) {
              s.hitstopTimer -= dt;
            } else {
              for (const b of s.grid.values()) {
                if (b.wobble > 0) b.wobble = Math.max(0, b.wobble - dt * 4.5);
              }

              if (s.projectile) {
                const proj = s.projectile;
                const substeps = 5;
                const subDt = dt / substeps;
                let impacted = false;

                for (let step = 0; step < substeps; step++) {
                  proj.x += proj.vx * subDt;
                  proj.y += proj.vy * subDt;

                  if (proj.x <= LEFT_WALL + BUBBLE_R) {
                    proj.x = LEFT_WALL + BUBBLE_R + (LEFT_WALL + BUBBLE_R - proj.x);
                    proj.vx = -proj.vx;
                    soundEngine.playBounce();
                    engine.spawnBurst(LEFT_WALL + 4, proj.y, 0xcbd5e1, 4, 4);
                  } else if (proj.x >= RIGHT_WALL - BUBBLE_R) {
                    proj.x = RIGHT_WALL - BUBBLE_R - (proj.x - (RIGHT_WALL - BUBBLE_R));
                    proj.vx = -proj.vx;
                    soundEngine.playBounce();
                    engine.spawnBurst(RIGHT_WALL - 4, proj.y, 0xcbd5e1, 4, 4);
                  }

                  const ceilingY = TOP_CEILING_BASE + s.ceilingDropRows * ROW_H + BUBBLE_R;
                  if (proj.y <= ceilingY) {
                    s.projectile = null;
                    handleProjectileImpact(proj.x, ceilingY, proj);
                    impacted = true;
                    break;
                  }

                  const hitDistSq = (BUBBLE_D - 4) * (BUBBLE_D - 4);
                  for (const b of s.grid.values()) {
                    const bp = gridToPixel(b.row, b.col, s.ceilingDropRows);
                    const dx = proj.x - bp.x;
                    const dy = proj.y - bp.y;
                    if (dx * dx + dy * dy <= hitDistSq) {
                      s.projectile = null;
                      const backX = proj.x - proj.vx * subDt * 0.6;
                      const backY = proj.y - proj.vy * subDt * 0.6;
                      handleProjectileImpact(backX, backY, proj);
                      impacted = true;
                      break;
                    }
                  }
                  if (impacted) break;
                }
              }

              for (let i = s.popping.length - 1; i >= 0; i--) {
                const pop = s.popping[i];
                pop.timer += dt;
                if (pop.timer >= pop.delay + pop.duration) {
                  s.popping.splice(i, 1);
                }
              }

              const playW = RIGHT_WALL - LEFT_WALL;
              const bucketW = playW / 5;
              for (let i = s.falling.length - 1; i >= 0; i--) {
                const fb = s.falling[i];
                fb.vy += 980 * dt;
                fb.x += fb.vx * dt;
                fb.y += fb.vy * dt;
                fb.z += fb.vz * dt;
                fb.rotation += fb.vRot * dt;

                if (fb.x <= LEFT_WALL + BUBBLE_R) {
                  fb.x = LEFT_WALL + BUBBLE_R;
                  fb.vx = Math.abs(fb.vx) * 0.7;
                } else if (fb.x >= RIGHT_WALL - BUBBLE_R) {
                  fb.x = RIGHT_WALL - BUBBLE_R;
                  fb.vx = -Math.abs(fb.vx) * 0.7;
                }

                if (fb.y >= BONUS_BUCKET_Y - 6 && !fb.scored) {
                  fb.scored = true;
                  const bIdx = Math.max(
                    0,
                    Math.min(4, Math.floor((fb.x - LEFT_WALL) / bucketW))
                  );
                  const pts = BONUS_BUCKET_VALUES[bIdx];
                  s.bucketFlash[bIdx] = 1;
                  s.score += pts;
                  s.dropScore += pts;
                  soundEngine.playDropScore(bIdx === 2 ? 6 : 2);
                  const dropHex = fb.kind === 'star' ? 0xf5df00 : COLOR_PALETTE[fb.color].hex;
                  engine.spawnColorAura(fb.x, BONUS_BUCKET_Y, dropHex, 1.35, 0.7);
                  engine.spawnBurst(fb.x, BONUS_BUCKET_Y, dropHex, 8, 6);
                  pushPopup(fb.x, BONUS_BUCKET_Y - 18, `+${pts}`, '#6EE7B7');
                  s.falling.splice(i, 1);
                  emitHud();
                } else if (fb.y > CANVAS_H + 40) {
                  s.falling.splice(i, 1);
                }
              }

              if (s.finishPending !== 'none') {
                s.finishDelay -= dt;
                if (s.finishDelay <= 0 && s.falling.length === 0) {
                  const outcome = s.finishPending;
                  s.finishPending = 'none';
                  if (outcome === 'victory') {
                    callbacksRef.current.onVictory(computeResult(true));
                  } else {
                    callbacksRef.current.onGameOver(computeResult(false));
                  }
                }
              }
            }

            let shakeX = 0;
            let shakeY = 0;
            if (s.shakeTimer > 0) {
              s.shakeTimer -= dt;
              const mag = s.shakeMag * (s.shakeTimer / 0.2);
              shakeX = (Math.random() - 0.5) * 2 * mag;
              shakeY = (Math.random() - 0.5) * 2 * mag;
            }

            const aimTrace =
              !s.projectile && s.finishPending === 'none'
                ? computeAimTrajectory(s.aimAngle, s.grid, s.ceilingDropRows)
                : null;

            engine.syncAndRender({
              dt,
              time: s.time,
              grid: s.grid,
              visualCeilingDrop: s.visualCeilingDrop,
              projectile: s.projectile,
              falling: s.falling,
              popping: s.popping,
              aimAngle: s.aimAngle,
              aimTrace,
              isAiming: s.isAiming,
              activeColor: s.activeColor,
              activeKind: s.bombArmed ? 'bomb' : s.activeKind,
              nextColor: s.nextColor,
              nextKind: s.nextKind,
              cannonRecoil: s.cannonRecoil,
              shakeX,
              shakeY,
              dangerProximity: getDangerProximity(),
              bucketFlash: s.bucketFlash,
            });
          } else {
            engine.syncAndRender({
              dt: 0,
              time: s.time,
              grid: s.grid,
              visualCeilingDrop: s.visualCeilingDrop,
              projectile: s.projectile,
              falling: s.falling,
              popping: s.popping,
              aimAngle: s.aimAngle,
              aimTrace: null,
              isAiming: false,
              activeColor: s.activeColor,
              activeKind: s.bombArmed ? 'bomb' : s.activeKind,
              nextColor: s.nextColor,
              nextKind: s.nextKind,
              cannonRecoil: 0,
              shakeX: 0,
              shakeY: 0,
              dangerProximity: getDangerProximity(),
              bucketFlash: s.bucketFlash,
            });
          }
        }

        if (engine.isSoftwareGl) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
      };

      if (engine.isSoftwareGl) frameId = window.setTimeout(tick, 16);
      else frameId = requestAnimationFrame(tick);

      // Pointer & Keyboard handlers using 3D Z=0 raycast
      const updateAimFromPoint = (px: number, py: number) => {
        const s = simRef.current;
        if (!s) return;
        const dx = px - CANNON_X;
        const dy = py - CANNON_Y;
        if (dy > -18) {
          s.aimAngle = dx >= 0 ? MAX_ANGLE : MIN_ANGLE;
          return;
        }
        const raw = Math.atan2(dy, dx);
        s.aimAngle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, raw));
      };

      const onPointerDown = (e: PointerEvent) => {
        if (pausedRef.current || endedRef.current) return;
        const s = simRef.current;
        if (!s || s.finishPending !== 'none') return;
        soundEngine.unlock();
        const pt = engine.pointerToWorld2D(e.clientX, e.clientY);

        const nextX = CANNON_X - 64;
        const nextY = CANNON_Y + 12;
        if (Math.hypot(pt.x - nextX, pt.y - nextY) <= 32) {
          if (!s.projectile) {
            if (s.bombArmed) s.bombArmed = false;
            const tc = s.activeColor;
            const tk = s.activeKind;
            s.activeColor = s.nextColor;
            s.activeKind = s.nextKind;
            s.nextColor = tc;
            s.nextKind = tk;
            soundEngine.playSwap();
            emitHud();
          }
          return;
        }

        if (pt.y > CANNON_Y + 20) return;

        s.activePointerId = e.pointerId;
        s.isAiming = true;
        domEl.setPointerCapture(e.pointerId);
        updateAimFromPoint(pt.x, pt.y);
      };

      const onPointerMove = (e: PointerEvent) => {
        const s = simRef.current;
        if (!s || pausedRef.current || endedRef.current) return;
        const pt = engine.pointerToWorld2D(e.clientX, e.clientY);
        if (pt.y <= CANNON_Y + 12) {
          updateAimFromPoint(pt.x, pt.y);
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        const s = simRef.current;
        if (!s) return;
        if (s.activePointerId === e.pointerId) {
          const pt = engine.pointerToWorld2D(e.clientX, e.clientY);
          updateAimFromPoint(pt.x, pt.y);
          s.isAiming = false;
          s.activePointerId = null;
          if (pt.y <= CANNON_Y + 18) {
            fireProjectile();
          }
        }
      };

      const onPointerCancel = () => {
        const s = simRef.current;
        if (!s) return;
        s.isAiming = false;
        s.activePointerId = null;
      };

      const onKeyDown = (e: KeyboardEvent) => {
        const s = simRef.current;
        if (!s || pausedRef.current || endedRef.current) return;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          s.keysHeld.left = true;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          s.keysHeld.right = true;
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'Enter') {
          e.preventDefault();
          fireProjectile();
        } else if (e.key === ' ' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          if (!s.projectile && s.finishPending === 'none') {
            if (s.bombArmed) s.bombArmed = false;
            const tc = s.activeColor;
            const tk = s.activeKind;
            s.activeColor = s.nextColor;
            s.activeKind = s.nextKind;
            s.nextColor = tc;
            s.nextKind = tk;
            soundEngine.playSwap();
            emitHud();
          }
        } else if (e.key === 'b' || e.key === 'B') {
          if (!s.projectile && s.bombCharge >= BOMB_MAX_CHARGE) {
            s.bombArmed = !s.bombArmed;
            soundEngine.playSwap();
            emitHud();
          }
        }
      };

      const onKeyUp = (e: KeyboardEvent) => {
        const s = simRef.current;
        if (!s) return;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') s.keysHeld.left = false;
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') s.keysHeld.right = false;
      };

      const onBlur = () => {
        const s = simRef.current;
        if (!s) return;
        s.keysHeld.left = false;
        s.keysHeld.right = false;
        s.isAiming = false;
      };

      domEl.addEventListener('pointerdown', onPointerDown);
      domEl.addEventListener('pointermove', onPointerMove);
      domEl.addEventListener('pointerup', onPointerUp);
      domEl.addEventListener('pointercancel', onPointerCancel);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        domEl.removeEventListener('webglcontextlost', onContextLost);
        domEl.removeEventListener('webglcontextrestored', onContextRestored);
        domEl.removeEventListener('pointerdown', onPointerDown);
        domEl.removeEventListener('pointermove', onPointerMove);
        domEl.removeEventListener('pointerup', onPointerUp);
        domEl.removeEventListener('pointercancel', onPointerCancel);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        engine.dispose();
        engineRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="relative w-full h-full">
        {/* Isolated Three.js WebGL Mount */}
        <div ref={mountRef} className="w-full h-full cursor-crosshair" />

        {/* Bonus Bucket Score Labels (projected directly onto the 5 raised 3D colored rings) */}
        <div className="absolute inset-0 pointer-events-none">
          {BONUS_BUCKET_VALUES.map((val, idx) => (
            <span
              key={idx}
              className="absolute -translate-x-1/2 font-mono text-[10px] font-bold text-slate-100/90 tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
              style={{
                left: `${bucketLayout.xsPct[idx] ?? 50}%`,
                top: `${bucketLayout.topPct + 1.4}%`,
              }}
            >
              +{val}
            </span>
          ))}
        </div>

        {/* Floating Score Popups */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {popups.map((p) => (
            <span
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 font-display font-extrabold text-sm drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] animate-modal-pop"
              style={{
                left: `${p.xPct}%`,
                top: `${p.yPct}%`,
                color: p.color,
              }}
            >
              {p.text}
            </span>
          ))}
        </div>

        {contextLost && (
          <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center p-6 text-center z-40">
            <p className="text-sm text-slate-200 font-medium">
              WebGL context paused. Restoring 3D graphics...
            </p>
          </div>
        )}
      </div>
    );
  }
);

GameCanvas3D.displayName = 'GameCanvas3D';
