import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BUBBLE_R,
  BONUS_BUCKET_Y,
  BubbleColor,
  BubbleKind,
  CANNON_X,
  CANNON_Y,
  COLOR_PALETTE,
  DANGER_LINE_Y,
  FallingBubble,
  GridBubble,
  LEFT_WALL,
  PoppingBubble,
  Projectile,
  RIGHT_WALL,
  ROW_H,
  SphereStyle,
  TOP_CEILING_BASE,
  ThemeConfig,
} from './types';
import { AimTrace, cellKey, gridToPixel } from './hexMath';
import { createSphereTexture } from './themes';

const SCALE = 1 / 32;
export const R3D = BUBBLE_R * SCALE;

export function toWorldX(x2d: number): number {
  return (x2d - 225) * SCALE;
}

export function toWorldY(y2d: number): number {
  return (400 - y2d) * SCALE;
}

export interface Particle3D {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export interface Shockwave3D {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  radius: number;
  maxRadius: number;
  life: number;
}

export interface Aura3D {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  scale: number;
  maxScale: number;
  baseOpacity: number;
  life: number;
  maxLife: number;
}

// Pre-allocated math helpers for zero GC in render loop
const _mat4 = new THREE.Matrix4();
const _vec3 = new THREE.Vector3();
const _scaleVec = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

export class Sharikboz3DEngine {
  public readonly isSoftwareGl: boolean;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;

  private container: HTMLElement;
  private currentTheme: ThemeConfig | null = null;
  private maxAnisotropy = 4;
  private resizeObserver: ResizeObserver | null = null;

  // Lighting
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;

  // Theme environment group
  private arenaGroup = new THREE.Group();
  private ceilingGroup = new THREE.Group();
  private dangerMesh!: THREE.Mesh;
  private dangerMat!: THREE.MeshBasicMaterial;
  private bucketRimMats: THREE.MeshStandardMaterial[] = [];

  // Cannon assembly
  private cannonRoot = new THREE.Group();
  private cannonBarrelGroup = new THREE.Group();
  private cannonSightMat!: THREE.MeshStandardMaterial;
  private activeChamberAnchor = new THREE.Group();
  private nextPedestalAnchor = new THREE.Group();
  private activeOrbVisual: THREE.Group | null = null;
  private activeOrbSig = '';
  private nextOrbVisual: THREE.Group | null = null;
  private nextOrbSig = '';

  // Shared Geometries
  private sphereGeoSmooth: THREE.SphereGeometry;
  private sphereGeoFaceted: THREE.IcosahedronGeometry;
  private collarGeo: THREE.TorusGeometry;
  private crownRingGeo: THREE.TorusGeometry;
  private magmaCageGeo: THREE.IcosahedronGeometry;
  private stoneGeo: THREE.DodecahedronGeometry;
  private iceShellGeo: THREE.IcosahedronGeometry;
  private starGeo: THREE.ExtrudeGeometry;
  private gyroRingGeo: THREE.TorusGeometry;
  private particleGeo: THREE.OctahedronGeometry;
  private beadGeo: THREE.SphereGeometry;
  private shockwaveGeo: THREE.RingGeometry;
  private auraGeo: THREE.PlaneGeometry;
  private auraTex: THREE.CanvasTexture;

  // Material & Texture Caches (rebuilt per theme)
  private themeTextures: THREE.CanvasTexture[] = [];
  private orbMaterials = new Map<string, THREE.Material>();
  private accentRingMat!: THREE.MeshStandardMaterial;
  private magmaCageMat!: THREE.MeshStandardMaterial;
  private stoneMat!: THREE.MeshStandardMaterial;
  private iceFullMat!: THREE.MeshPhysicalMaterial;
  private iceCrackedMat!: THREE.MeshPhysicalMaterial;
  private starCoreMat!: THREE.MeshStandardMaterial;
  private starGlassMat!: THREE.MeshPhysicalMaterial;
  private bombBodyMat!: THREE.MeshStandardMaterial;
  private bombGlowMat!: THREE.MeshStandardMaterial;
  private rainbowCoreMat!: THREE.MeshStandardMaterial;

  // Dynamic Object Pools
  private gridMeshes = new Map<string, { group: THREE.Group; sig: string }>();
  private gridContainer = new THREE.Group();
  private fallingMeshes: THREE.Group[] = [];
  private fallingContainer = new THREE.Group();
  private poppingMeshes: THREE.Group[] = [];
  private poppingContainer = new THREE.Group();
  private projectileVisual: THREE.Group | null = null;
  private projectileSig = '';

  // Trajectory Beads
  private maxBeads = 70;
  private beadInstanced: THREE.InstancedMesh;

  // Pooled 3D Particles
  private maxParticles = 240;
  private particles: Particle3D[] = [];
  private particleInstanced: THREE.InstancedMesh;

  // Background Ambient Motes
  private motesInstanced: THREE.InstancedMesh;
  private moteData: Array<{ x: number; y: number; z: number; speed: number; phase: number; size: number }> = [];

  // Shockwaves & Colored Explosion Auras
  private shockwaves: Shockwave3D[] = [];
  private auras: Aura3D[] = [];

  // Raycasting plane (Z = 0)
  private raycaster = new THREE.Raycaster();
  private playPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private pointerNdc = new THREE.Vector2();
  private rayHit = new THREE.Vector3();

  private disposableArenaItems: Array<{ dispose: () => void }> = [];

  constructor(container: HTMLElement, initialTheme: ThemeConfig) {
    this.container = container;

    // Detect software WebGL once
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.maxAnisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy() || 1);

    const w = container.clientWidth || 450;
    const h = container.clientHeight || 800;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    // Studio RoomEnvironment reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Camera dynamically framed for ALL phone aspect ratios (from 21:9 narrow to 16:9 & tablets)
    this.camera = new THREE.PerspectiveCamera(38, w / Math.max(1, h), 0.5, 160);
    this.camera.position.set(0, -1.5, 37.2);
    this.camera.lookAt(0, -0.35, 0);
    this.updateCameraFraming(w, h);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);
    }

    // 3-Point Studio Lighting (classic balanced contrast so colors never bleach)
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x161d36, 0.65);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfffaf0, 1.65);
    this.keyLight.position.set(8, 14, 18);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.near = 2;
      this.keyLight.shadow.camera.far = 48;
      this.keyLight.shadow.camera.left = -10;
      this.keyLight.shadow.camera.right = 10;
      this.keyLight.shadow.camera.top = 14;
      this.keyLight.shadow.camera.bottom = -14;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x60a5fa, 0.32);
    this.rimLight.position.set(-10, -8, -8);
    this.scene.add(this.rimLight);

    // Build shared reusable geometries
    this.sphereGeoSmooth = new THREE.SphereGeometry(R3D * 0.96, 24, 18);
    this.sphereGeoFaceted = new THREE.IcosahedronGeometry(R3D * 0.98, 1);
    this.collarGeo = new THREE.TorusGeometry(R3D * 0.96, R3D * 0.11, 10, 28);
    this.crownRingGeo = new THREE.TorusGeometry(R3D * 1.16, R3D * 0.075, 10, 32);
    this.magmaCageGeo = new THREE.IcosahedronGeometry(R3D * 1.01, 0);
    this.stoneGeo = new THREE.DodecahedronGeometry(R3D * 0.98, 0);
    this.iceShellGeo = new THREE.IcosahedronGeometry(R3D * 1.06, 1);
    this.gyroRingGeo = new THREE.TorusGeometry(R3D * 0.96, R3D * 0.08, 8, 24);
    this.particleGeo = new THREE.OctahedronGeometry(0.14, 0);
    this.beadGeo = new THREE.SphereGeometry(0.125, 12, 10);
    this.shockwaveGeo = new THREE.RingGeometry(0.75, 1.0, 32);
    this.auraGeo = new THREE.PlaneGeometry(2, 2);
    this.auraTex = this.createAuraTexture();

    // 3D Star ExtrudeGeometry
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? R3D * 0.56 : R3D * 0.25;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const sx = Math.cos(a) * r;
      const sy = Math.sin(a) * r;
      if (i === 0) starShape.moveTo(sx, sy);
      else starShape.lineTo(sx, sy);
    }
    starShape.closePath();
    this.starGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    this.starGeo.center();

    // Shared Special Materials
    this.stoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true,
    });
    this.iceFullMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      roughness: 0.12,
      metalness: 0.05,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.iceCrackedMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.24,
      wireframe: true,
      depthWrite: false,
    });
    this.starCoreMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.85,
    });
    this.starGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xfef3c7,
      roughness: 0.08,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    this.bombBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.85,
    });
    this.bombGlowMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    });
    this.rainbowCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.55,
      roughness: 0.1,
      metalness: 0.35,
    });

    // Instanced Trajectory Beads (crisp bright white dots)
    const beadMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
      toneMapped: false,
    });
    this.beadInstanced = new THREE.InstancedMesh(this.beadGeo, beadMat, this.maxBeads);
    this.beadInstanced.frustumCulled = false;
    this.beadInstanced.count = 0;
    this.scene.add(this.beadInstanced);

    // Pooled 3D Particles (pure unlit color so burst shards match each ball's classic hue)
    const partMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    this.particleInstanced = new THREE.InstancedMesh(this.particleGeo, partMat, this.maxParticles);
    this.particleInstanced.frustumCulled = false;
    this.particleInstanced.count = 0;
    this.scene.add(this.particleInstanced);
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 1,
        life: 0,
        maxLife: 0.5,
        color: new THREE.Color(0xffffff),
      });
    }

    // Background Floating Motes
    const moteGeo = new THREE.OctahedronGeometry(0.08, 0);
    const moteMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.45,
    });
    this.motesInstanced = new THREE.InstancedMesh(moteGeo, moteMat, 48);
    this.motesInstanced.frustumCulled = false;
    for (let i = 0; i < 48; i++) {
      this.moteData.push({
        x: (Math.random() - 0.5) * 14,
        y: (Math.random() - 0.5) * 24,
        z: -2.2 - Math.random() * 6,
        speed: 0.35 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        size: 0.6 + Math.random() * 0.9,
      });
    }
    this.scene.add(this.motesInstanced);

    // Scene hierarchy containers
    this.scene.add(this.arenaGroup);
    this.scene.add(this.ceilingGroup);
    this.scene.add(this.gridContainer);
    this.scene.add(this.fallingContainer);
    this.scene.add(this.poppingContainer);
    this.scene.add(this.cannonRoot);

    this.buildCannonAssembly();
    this.applyTheme(initialTheme);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildCannonAssembly() {
    const cx = toWorldX(CANNON_X);
    const cy = toWorldY(CANNON_Y);
    this.cannonRoot.position.set(cx, cy, 0);

    // 1. Heavy Octagonal Pedestal Base
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.42,
      metalness: 0.72,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.22,
      metalness: 0.88,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.82,
    });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.28, 0.72, 8), baseMat);
    pedestal.rotation.x = Math.PI / 2;
    pedestal.position.set(0, 0, -0.35);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    this.cannonRoot.add(pedestal);

    // 2. Gilded Turret Ring
    const turretRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.11, 12, 32), brassMat);
    turretRing.position.set(0, 0, 0.02);
    this.cannonRoot.add(turretRing);

    // 3. Rotating Barrel Assembly
    this.cannonBarrelGroup.position.set(0, 0, 0);
    this.cannonRoot.add(this.cannonBarrelGroup);

    // Twin side yoke arms
    const yokeGeo = new THREE.BoxGeometry(0.24, 1.15, 0.55);
    const yokeL = new THREE.Mesh(yokeGeo, darkSteelMat);
    yokeL.position.set(-0.78, 0.48, 0);
    const yokeR = new THREE.Mesh(yokeGeo, darkSteelMat);
    yokeR.position.set(0.78, 0.48, 0);
    this.cannonBarrelGroup.add(yokeL, yokeR);

    // Tapered main barrel cylinder
    const barrelMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.68, 1.65, 20),
      baseMat
    );
    barrelMesh.position.set(0, 0.95, 0);
    barrelMesh.castShadow = true;
    this.cannonBarrelGroup.add(barrelMesh);

    // Stepped brass muzzle collar
    const muzzleCollar = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.12, 12, 24), brassMat);
    muzzleCollar.rotation.x = Math.PI / 2;
    muzzleCollar.position.set(0, 1.72, 0);
    this.cannonBarrelGroup.add(muzzleCollar);

    // Glowing energy sight rail along top of barrel
    this.cannonSightMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.3,
      roughness: 0.2,
    });
    const sightRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.12), this.cannonSightMat);
    sightRail.position.set(0, 1.05, 0.58);
    this.cannonBarrelGroup.add(sightRail);

    // Active loaded orb anchor inside breech chamber
    this.activeChamberAnchor.position.set(0, 0, 0.16);
    this.cannonRoot.add(this.activeChamberAnchor);

    // Reserve ("Next") Orb Pedestal to the left of cannon
    const nx = toWorldX(CANNON_X - 64) - cx;
    const ny = toWorldY(CANNON_Y + 12) - cy;
    const nextBase = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.65, 0.34, 16), baseMat);
    nextBase.rotation.x = Math.PI / 2;
    nextBase.position.set(nx, ny, -0.2);
    const nextTrim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.06, 10, 24), brassMat);
    nextTrim.position.set(nx, ny, 0.0);
    this.cannonRoot.add(nextBase, nextTrim);

    this.nextPedestalAnchor.position.set(nx, ny, 0.16);
    this.nextPedestalAnchor.scale.setScalar(0.76);
    this.cannonRoot.add(this.nextPedestalAnchor);
  }

  public applyTheme(theme: ThemeConfig) {
    if (this.currentTheme?.id === theme.id) return;
    this.currentTheme = theme;

    // Scene background & exponential fog
    this.scene.background = new THREE.Color(theme.bgHex);
    this.scene.fog = new THREE.FogExp2(theme.fogHex, theme.fogDensity);

    // Update lighting palette
    this.keyLight.color.setHex(theme.keyLightHex);
    this.keyLight.intensity = theme.keyLightIntensity;
    this.hemiLight.color.setHex(theme.hemiSkyHex);
    this.hemiLight.groundColor.setHex(theme.hemiGroundHex);
    this.rimLight.color.setHex(theme.rimLightHex);

    // Rebuild sphere material cache for new theme style
    this.rebuildSphereMaterials(theme);

    // Rebuild arena architecture
    this.rebuildArenaArchitecture(theme);

    // Force-rebuild existing grid orbs so they immediately adopt the new 10-stage sphere style!
    for (const entry of this.gridMeshes.values()) {
      this.gridContainer.remove(entry.group);
    }
    this.gridMeshes.clear();
    this.activeOrbSig = '';
    this.nextOrbSig = '';
  }

  private rebuildSphereMaterials(theme: ThemeConfig) {
    this.themeTextures.forEach((t) => t.dispose());
    this.themeTextures = [];
    this.orbMaterials.forEach((m) => m.dispose());
    this.orbMaterials.clear();
    this.accentRingMat?.dispose();
    this.magmaCageMat?.dispose();

    const colors: BubbleColor[] = ['red', 'blue', 'green', 'amber', 'violet', 'teal'];
    for (const c of colors) {
      const tex = createSphereTexture(c, theme.sphereStyle, this.maxAnisotropy);
      this.themeTextures.push(tex);
      const pal = COLOR_PALETTE[c];

      let mat: THREE.Material;
      if (theme.sphereStyle === 'crystal') {
        mat = new THREE.MeshPhysicalMaterial({
          map: tex,
          roughness: 0.26,
          metalness: 0.02,
          clearcoat: 0.32,
          clearcoatRoughness: 0.12,
          envMapIntensity: 0.24,
          emissive: pal.emissiveHex,
          emissiveIntensity: 0.16,
        });
      } else if (theme.sphereStyle === 'jade_ring') {
        mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.34,
          metalness: 0.08,
          envMapIntensity: 0.22,
          emissive: pal.emissiveHex,
          emissiveIntensity: 0.14,
        });
      } else if (theme.sphereStyle === 'magma_core') {
        mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.32,
          metalness: 0.12,
          envMapIntensity: 0.22,
          emissive: pal.emissiveHex,
          emissiveIntensity: 0.18,
        });
      } else if (theme.sphereStyle === 'diamond_cut') {
        mat = new THREE.MeshPhysicalMaterial({
          map: tex,
          roughness: 0.24,
          metalness: 0.04,
          clearcoat: 0.28,
          flatShading: true,
          envMapIntensity: 0.24,
          emissive: pal.emissiveHex,
          emissiveIntensity: 0.16,
        });
      } else {
        mat = new THREE.MeshPhysicalMaterial({
          map: tex,
          roughness: 0.26,
          metalness: 0.06,
          clearcoat: 0.32,
          iridescence: 0.18,
          iridescenceIOR: 1.25,
          envMapIntensity: 0.24,
          emissive: pal.emissiveHex,
          emissiveIntensity: 0.16,
        });
      }
      this.orbMaterials.set(c, mat);
    }

    this.accentRingMat = new THREE.MeshStandardMaterial({
      color: theme.trimHex,
      roughness: 0.25,
      metalness: 0.85,
      emissive: theme.accentHex,
      emissiveIntensity: 0.18,
    });

    this.magmaCageMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.35,
      metalness: 0.75,
      wireframe: true,
      transparent: true,
      opacity: 0.26,
    });
  }

  private createAuraTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.28, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.32)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  private createGradientBackdropTexture(theme: ThemeConfig): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    const topCol = '#' + theme.skyTopHex.toString(16).padStart(6, '0');
    const midCol = '#' + theme.skyMidHex.toString(16).padStart(6, '0');
    const botCol = '#' + theme.skyBottomHex.toString(16).padStart(6, '0');
    grad.addColorStop(0, topCol);
    grad.addColorStop(0.55, midCol);
    grad.addColorStop(1, botCol);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    // Subtle glowing radial aura in center-upper playfield
    const accent = '#' + theme.secondaryGlowHex.toString(16).padStart(6, '0');
    const rad = ctx.createRadialGradient(128, 210, 10, 128, 210, 180);
    rad.addColorStop(0, accent + '44');
    rad.addColorStop(0.55, accent + '16');
    rad.addColorStop(1, accent + '00');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 256, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  private rebuildArenaArchitecture(theme: ThemeConfig) {
    this.arenaGroup.clear();
    this.ceilingGroup.clear();
    this.bucketRimMats = [];
    this.disposableArenaItems.forEach((d) => d.dispose());
    this.disposableArenaItems = [];

    const track = <T extends { dispose: () => void }>(item: T): T => {
      this.disposableArenaItems.push(item);
      return item;
    };

    const leftX = toWorldX(LEFT_WALL);
    const rightX = toWorldX(RIGHT_WALL);
    const playW = rightX - leftX;

    // 1. Vibrant Multi-Stop Gradient 3D Backdrop Wall (oversized for any mobile aspect ratio)
    const skyTex = track(this.createGradientBackdropTexture(theme));
    const backGeo = track(new THREE.PlaneGeometry(playW + 14, 38));
    const backMat = track(
      new THREE.MeshStandardMaterial({
        map: skyTex,
        emissiveMap: skyTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.48,
        roughness: 0.85,
        metalness: 0.1,
      })
    );
    const backWall = new THREE.Mesh(backGeo, backMat);
    backWall.position.set(0, 0, -2.4);
    backWall.receiveShadow = true;
    this.arenaGroup.add(backWall);

    const ribMat = track(
      new THREE.MeshStandardMaterial({
        color: theme.pillarHex,
        roughness: 0.45,
        metalness: 0.45,
      })
    );
    const trimMat = track(
      new THREE.MeshStandardMaterial({
        color: theme.trimHex,
        roughness: 0.22,
        metalness: 0.88,
      })
    );
    const glowAccentMat = track(
      new THREE.MeshStandardMaterial({
        color: theme.accentHex,
        emissive: theme.accentHex,
        emissiveIntensity: 1.45,
        roughness: 0.18,
      })
    );
    const secondaryGlowMat = track(
      new THREE.MeshStandardMaterial({
        color: theme.secondaryGlowHex,
        emissive: theme.secondaryGlowHex,
        emissiveIntensity: 1.25,
        roughness: 0.2,
      })
    );

    if (theme.id === 0 || theme.id === 4) {
      const ringGeo = track(new THREE.TorusGeometry(4.9, 0.1, 10, 48));
      const arch = new THREE.Mesh(ringGeo, trimMat);
      arch.position.set(0, 3.2, -2.0);
      this.arenaGroup.add(arch);
      const innerArch = new THREE.Mesh(
        track(new THREE.TorusGeometry(3.4, 0.06, 8, 40)),
        secondaryGlowMat
      );
      innerArch.position.set(0, 3.2, -1.95);
      this.arenaGroup.add(innerArch);
    } else if (theme.id === 1) {
      const barGeo = track(new THREE.BoxGeometry(playW * 0.88, 0.36, 0.35));
      for (let i = -2; i <= 2; i++) {
        const bar = new THREE.Mesh(barGeo, ribMat);
        bar.position.set(0, i * 4.2, -2.0);
        const strip = new THREE.Mesh(
          track(new THREE.BoxGeometry(playW * 0.8, 0.07, 0.4)),
          secondaryGlowMat
        );
        strip.position.set(0, i * 4.2, -1.96);
        this.arenaGroup.add(bar, strip);
      }
    } else if (theme.id === 2) {
      const pipeGeo = track(new THREE.CylinderGeometry(0.12, 0.12, 17, 10));
      const p1 = new THREE.Mesh(pipeGeo, glowAccentMat);
      p1.position.set(-3.3, 1, -2.0);
      p1.rotation.z = 0.22;
      const p2 = new THREE.Mesh(pipeGeo, secondaryGlowMat);
      p2.position.set(3.3, 1, -2.0);
      p2.rotation.z = -0.22;
      this.arenaGroup.add(p1, p2);
    } else if (theme.id === 3) {
      const spireGeo = track(new THREE.ConeGeometry(0.95, 4.8, 5));
      for (let i = -2; i <= 2; i++) {
        const spire = new THREE.Mesh(spireGeo, this.iceFullMat);
        spire.position.set(i * 2.4, -2.2 + Math.abs(i) * 1.4, -1.75);
        this.arenaGroup.add(spire);
      }
    }

    // 2. Left & Right 3D Bounding Side Pillars with Glowing Energy Channels
    const pillarGeo = track(new THREE.BoxGeometry(0.76, 26, 1.4));
    const leftPillar = new THREE.Mesh(pillarGeo, ribMat);
    leftPillar.position.set(leftX - 0.38, 0, -0.1);
    leftPillar.receiveShadow = true;
    const rightPillar = new THREE.Mesh(pillarGeo, ribMat);
    rightPillar.position.set(rightX + 0.38, 0, -0.1);
    rightPillar.receiveShadow = true;
    this.arenaGroup.add(leftPillar, rightPillar);

    const stripGeo = track(new THREE.BoxGeometry(0.14, 25, 0.24));
    const stripL = new THREE.Mesh(stripGeo, trimMat);
    stripL.position.set(leftX - 0.02, 0, 0.48);
    const stripR = new THREE.Mesh(stripGeo, trimMat);
    stripR.position.set(rightX + 0.02, 0, 0.48);
    this.arenaGroup.add(stripL, stripR);

    // Glowing inner energy channel along pillars
    const glowChannelGeo = track(new THREE.BoxGeometry(0.05, 24, 0.1));
    const chanL = new THREE.Mesh(glowChannelGeo, secondaryGlowMat);
    chanL.position.set(leftX - 0.22, 0, 0.6);
    const chanR = new THREE.Mesh(glowChannelGeo, secondaryGlowMat);
    chanR.position.set(rightX + 0.22, 0, 0.6);
    this.arenaGroup.add(chanL, chanR);

    const sconceGeo = track(new THREE.OctahedronGeometry(0.2, 0));
    for (let y = -6; y <= 8; y += 3.5) {
      const sL = new THREE.Mesh(sconceGeo, glowAccentMat);
      sL.position.set(leftX - 0.1, y, 0.68);
      const sR = new THREE.Mesh(sconceGeo, glowAccentMat);
      sR.position.set(rightX + 0.1, y, 0.68);
      this.arenaGroup.add(sL, sR);
    }

    // 3. Descending Ceiling Beam Group
    const ceilGeo = track(new THREE.BoxGeometry(playW + 0.2, 12, 1.3));
    const ceilSlab = new THREE.Mesh(ceilGeo, ribMat);
    ceilSlab.position.set(0, 6.0, -0.05);
    ceilSlab.receiveShadow = true;
    const ceilTrim = new THREE.Mesh(
      track(new THREE.BoxGeometry(playW + 0.2, 0.3, 1.44)),
      trimMat
    );
    ceilTrim.position.set(0, 0.12, 0);
    const ceilGlow = new THREE.Mesh(
      track(new THREE.BoxGeometry(playW - 0.2, 0.08, 1.48)),
      glowAccentMat
    );
    ceilGlow.position.set(0, -0.04, 0);
    this.ceilingGroup.add(ceilSlab, ceilTrim, ceilGlow);

    // 4. Danger Line Laser Threshold
    this.dangerMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xff3366,
        transparent: true,
        opacity: 0.28,
      })
    );
    this.dangerMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(playW - 0.4, 0.055, 0.08)),
      this.dangerMat
    );
    this.dangerMesh.position.set(0, toWorldY(DANGER_LINE_Y), -0.35);
    this.arenaGroup.add(this.dangerMesh);

    // 5. Five 3D Bonus Catcher Basins at BONUS_BUCKET_Y
    const bucketW = playW / 5;
    const bucketColors = [0x388bff, 0x10e89a, 0xffaa00, 0x10e89a, 0x388bff];
    const basinGeo = track(new THREE.CylinderGeometry(bucketW * 0.42, bucketW * 0.34, 0.44, 8));
    const rimGeo = track(new THREE.TorusGeometry(bucketW * 0.42, 0.065, 8, 16));
    const by = toWorldY(BONUS_BUCKET_Y);

    for (let i = 0; i < 5; i++) {
      const bx = leftX + (i + 0.5) * bucketW;
      const basin = new THREE.Mesh(basinGeo, ribMat);
      basin.position.set(bx, by - 0.15, -0.1);
      this.arenaGroup.add(basin);

      const rMat = track(
        new THREE.MeshStandardMaterial({
          color: bucketColors[i],
          emissive: bucketColors[i],
          emissiveIntensity: 0.78,
          roughness: 0.2,
        })
      );
      this.bucketRimMats.push(rMat);
      const rim = new THREE.Mesh(rimGeo, rMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(bx, by + 0.07, -0.1);
      this.arenaGroup.add(rim);
    }
  }

  private createOrbGroup(color: BubbleColor, kind: BubbleKind, hp: number): THREE.Group {
    const group = new THREE.Group();
    const style: SphereStyle = this.currentTheme?.sphereStyle || 'crystal';

    if (kind === 'stone') {
      const mesh = new THREE.Mesh(this.stoneGeo, this.stoneMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return group;
    }

    if (kind === 'bomb') {
      const body = new THREE.Mesh(this.sphereGeoSmooth, this.bombBodyMat);
      body.castShadow = true;
      const belt = new THREE.Mesh(this.collarGeo, this.bombGlowMat);
      belt.rotation.x = Math.PI / 3;
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(R3D * 0.42, 0),
        this.bombGlowMat
      );
      core.position.set(0, R3D * 0.85, 0);
      group.add(body, belt, core);
      return group;
    }

    if (kind === 'rainbow') {
      const core = new THREE.Mesh(this.sphereGeoSmooth, this.rainbowCoreMat);
      const r1 = new THREE.Mesh(this.gyroRingGeo, this.orbMaterials.get('red')!);
      const r2 = new THREE.Mesh(this.gyroRingGeo, this.orbMaterials.get('blue')!);
      r2.rotation.x = Math.PI / 3;
      const r3 = new THREE.Mesh(this.gyroRingGeo, this.orbMaterials.get('green')!);
      r3.rotation.y = Math.PI / 3;
      group.add(core, r1, r2, r3);
      return group;
    }

    if (kind === 'star') {
      const starMesh = new THREE.Mesh(this.starGeo, this.starCoreMat);
      const glassMesh = new THREE.Mesh(this.sphereGeoSmooth, this.starGlassMat);
      glassMesh.renderOrder = 2;
      group.add(starMesh, glassMesh);
      return group;
    }

    // Standard themed color orb (varies geometry & trim every 10 stages!)
    const mat = this.orbMaterials.get(color)!;
    const geom = style === 'diamond_cut' ? this.sphereGeoFaceted : this.sphereGeoSmooth;
    const sphere = new THREE.Mesh(geom, mat);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    group.add(sphere);

    if (style === 'jade_ring') {
      const ring = new THREE.Mesh(this.collarGeo, this.accentRingMat);
      ring.rotation.x = Math.PI * 0.42;
      group.add(ring);
    } else if (style === 'magma_core') {
      const cage = new THREE.Mesh(this.magmaCageGeo, this.magmaCageMat);
      group.add(cage);
    } else if (style === 'astral_crown') {
      const halo = new THREE.Mesh(this.crownRingGeo, this.accentRingMat);
      halo.rotation.x = Math.PI * 0.36;
      halo.rotation.y = 0.35;
      group.add(halo);
    }

    // Frosted ice shell overlay
    if (kind === 'ice') {
      const shell = new THREE.Mesh(
        this.iceShellGeo,
        hp >= 2 ? this.iceFullMat : this.iceCrackedMat
      );
      shell.renderOrder = 2;
      group.add(shell);
    }

    return group;
  }

  public spawnBurst(x2d: number, y2d: number, colorHex: number, count = 10, speed = 7) {
    const wx = toWorldX(x2d);
    const wy = toWorldY(y2d);
    let spawned = 0;

    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      const ang = (Math.PI * 2 * spawned) / count + Math.random() * 0.4;
      const spd = speed * (0.45 + Math.random() * 0.75);
      p.active = true;
      p.x = wx;
      p.y = wy;
      p.z = 0.25 + Math.random() * 0.35;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd + 1.5;
      p.vz = (Math.random() - 0.2) * 3.5;
      p.size = 0.65 + Math.random() * 0.85;
      p.life = 0;
      p.maxLife = 0.36 + Math.random() * 0.25;
      p.color.setHex(colorHex);
      spawned++;
    }
  }

  public spawnShockwave(x2d: number, y2d: number, colorHex: number, maxRadius = 2.6) {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(this.shockwaveGeo, mat);
    mesh.position.set(toWorldX(x2d), toWorldY(y2d), 0.35);
    this.scene.add(mesh);
    this.shockwaves.push({
      mesh,
      mat,
      radius: 0.35,
      maxRadius,
      life: 0,
    });
  }

  public spawnColorAura(
    x2d: number,
    y2d: number,
    colorHex: number,
    maxScale = 1.65,
    baseOpacity = 0.85
  ) {
    // 1. Soft glowing radial aura disc in the ball's exact color
    const mat = new THREE.MeshBasicMaterial({
      map: this.auraTex,
      color: colorHex,
      transparent: true,
      opacity: baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.auraGeo, mat);
    mesh.position.set(toWorldX(x2d), toWorldY(y2d), 0.32);
    mesh.scale.setScalar(0.55);
    this.scene.add(mesh);
    this.auras.push({
      mesh,
      mat,
      scale: 0.55,
      maxScale,
      baseOpacity,
      life: 0,
      maxLife: 0.38,
    });

    // 2. Matching crisp aura shockwave ring
    this.spawnShockwave(x2d, y2d, colorHex, maxScale * 0.95);
  }

  public pointerToWorld2D(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    this.raycaster.ray.intersectPlane(this.playPlane, this.rayHit);

    return {
      x: this.rayHit.x / SCALE + 225,
      y: 400 - this.rayHit.y / SCALE,
    };
  }

  public syncAndRender(params: {
    dt: number;
    time: number;
    grid: Map<string, GridBubble>;
    visualCeilingDrop: number;
    projectile: Projectile | null;
    falling: FallingBubble[];
    popping: PoppingBubble[];
    aimAngle: number;
    aimTrace: AimTrace | null;
    isAiming: boolean;
    activeColor: BubbleColor;
    activeKind: 'normal' | 'bomb' | 'rainbow';
    nextColor: BubbleColor;
    nextKind: 'normal' | 'bomb' | 'rainbow';
    cannonRecoil: number;
    shakeX: number;
    shakeY: number;
    dangerProximity: number;
    bucketFlash: number[];
  }) {
    const { dt, time } = params;

    // 1. Camera shake (smoothly offset around base position)
    this.camera.position.x = params.shakeX * 0.04;
    this.camera.position.y = -1.5 + params.shakeY * 0.04;

    // 2. Descending Ceiling Beam
    const ceil2d = TOP_CEILING_BASE + params.visualCeilingDrop * ROW_H;
    this.ceilingGroup.position.y = toWorldY(ceil2d);

    // 3. Danger Line pulse
    if (params.dangerProximity > 0.5) {
      this.dangerMat.opacity = 0.38 + 0.5 * (0.5 + 0.5 * Math.sin(time * 8));
    } else {
      this.dangerMat.opacity = 0.22;
    }

    // 4. Bucket rim flash
    for (let i = 0; i < 5; i++) {
      const m = this.bucketRimMats[i];
      if (m) {
        m.emissiveIntensity = 0.5 + (params.bucketFlash[i] || 0) * 2.2;
      }
    }

    // 5. Sync Grid Orbs
    const activeKeys = new Set<string>();
    for (const b of params.grid.values()) {
      const k = cellKey(b.row, b.col);
      activeKeys.add(k);
      const sig = `${b.color}-${b.kind}-${b.hp}`;
      let entry = this.gridMeshes.get(k);
      if (!entry || entry.sig !== sig) {
        if (entry) this.gridContainer.remove(entry.group);
        const group = this.createOrbGroup(b.color, b.kind, b.hp);
        this.gridContainer.add(group);
        entry = { group, sig };
        this.gridMeshes.set(k, entry);
      }

      const pos2d = gridToPixel(b.row, b.col, params.visualCeilingDrop);
      const wobble = b.wobble > 0 ? Math.sin(time * 42) * b.wobble * 0.08 : 0;
      entry.group.position.set(toWorldX(pos2d.x) + wobble, toWorldY(pos2d.y), 0);

      // Subtle living rotation on star/rainbow/astral orbs
      if (b.kind === 'star' || b.kind === 'rainbow') {
        entry.group.rotation.y = time * 1.4 + b.phase;
      } else if (this.currentTheme?.sphereStyle === 'astral_crown') {
        entry.group.rotation.y = Math.sin(time * 0.9 + b.phase) * 0.25;
      }
    }
    for (const [k, entry] of this.gridMeshes.entries()) {
      if (!activeKeys.has(k)) {
        this.gridContainer.remove(entry.group);
        this.gridMeshes.delete(k);
      }
    }

    // 6. Cannon rotation, recoil & chamber orbs (align +Y barrel with 2D-to-3D aim vector)
    this.cannonBarrelGroup.rotation.z = -params.aimAngle - Math.PI / 2;
    const rec = params.cannonRecoil * 0.26;
    this.cannonBarrelGroup.position.set(
      -Math.cos(params.aimAngle) * rec,
      Math.sin(params.aimAngle) * rec,
      0
    );

    const sightHex =
      params.activeKind === 'bomb'
        ? 0xf97316
        : params.activeKind === 'rainbow'
        ? 0xffffff
        : COLOR_PALETTE[params.activeColor].hex;
    this.cannonSightMat.color.setHex(sightHex);
    this.cannonSightMat.emissive.setHex(sightHex);

    const actSig = `${params.activeColor}-${params.activeKind}`;
    if (!params.projectile) {
      this.activeChamberAnchor.visible = true;
      if (this.activeOrbSig !== actSig) {
        if (this.activeOrbVisual) this.activeChamberAnchor.remove(this.activeOrbVisual);
        this.activeOrbVisual = this.createOrbGroup(params.activeColor, params.activeKind, 1);
        this.activeChamberAnchor.add(this.activeOrbVisual);
        this.activeOrbSig = actSig;
      }
      if (this.activeOrbVisual) {
        this.activeOrbVisual.rotation.y = time * 1.2;
      }
    } else {
      this.activeChamberAnchor.visible = false;
    }

    const nxtSig = `${params.nextColor}-${params.nextKind}`;
    if (this.nextOrbSig !== nxtSig) {
      if (this.nextOrbVisual) this.nextPedestalAnchor.remove(this.nextOrbVisual);
      this.nextOrbVisual = this.createOrbGroup(params.nextColor, params.nextKind, 1);
      this.nextPedestalAnchor.add(this.nextOrbVisual);
      this.nextOrbSig = nxtSig;
    }
    if (this.nextOrbVisual) {
      this.nextOrbVisual.rotation.y = time * 1.1;
    }

    // 7. Projectile Visual
    if (params.projectile) {
      const pSig = `${params.projectile.color}-${params.projectile.kind}`;
      if (!this.projectileVisual || this.projectileSig !== pSig) {
        if (this.projectileVisual) this.scene.remove(this.projectileVisual);
        this.projectileVisual = this.createOrbGroup(
          params.projectile.color,
          params.projectile.kind,
          1
        );
        this.scene.add(this.projectileVisual);
        this.projectileSig = pSig;
      }
      this.projectileVisual.position.set(
        toWorldX(params.projectile.x),
        toWorldY(params.projectile.y),
        0
      );
      this.projectileVisual.rotation.x += dt * 10;
      this.projectileVisual.rotation.y += dt * 7;
    } else if (this.projectileVisual) {
      this.scene.remove(this.projectileVisual);
      this.projectileVisual = null;
      this.projectileSig = '';
    }

    // 8. Falling 3D Orbs
    while (this.fallingMeshes.length < params.falling.length) {
      const idx = this.fallingMeshes.length;
      const fb = params.falling[idx];
      const grp = this.createOrbGroup(fb.color, fb.kind, 1);
      this.fallingContainer.add(grp);
      this.fallingMeshes.push(grp);
    }
    while (this.fallingMeshes.length > params.falling.length) {
      const removed = this.fallingMeshes.pop()!;
      this.fallingContainer.remove(removed);
    }
    for (let i = 0; i < params.falling.length; i++) {
      const fb = params.falling[i];
      const grp = this.fallingMeshes[i];
      grp.position.set(toWorldX(fb.x), toWorldY(fb.y), fb.z);
      grp.rotation.set(fb.rotation * 0.7, fb.rotation, fb.rotation * 0.4);
    }

    // 9. Popping Orbs Scale-Out
    while (this.poppingMeshes.length < params.popping.length) {
      const idx = this.poppingMeshes.length;
      const pop = params.popping[idx];
      const grp = this.createOrbGroup(pop.color, pop.kind, 1);
      this.poppingContainer.add(grp);
      this.poppingMeshes.push(grp);
    }
    while (this.poppingMeshes.length > params.popping.length) {
      const removed = this.poppingMeshes.pop()!;
      this.poppingContainer.remove(removed);
    }
    for (let i = 0; i < params.popping.length; i++) {
      const pop = params.popping[i];
      const grp = this.poppingMeshes[i];
      grp.position.set(toWorldX(pop.x), toWorldY(pop.y), 0.15);
      if (pop.timer < pop.delay) {
        grp.scale.setScalar(1);
      } else {
        const frac = Math.min(1, (pop.timer - pop.delay) / pop.duration);
        const s = 1 + frac * 0.45;
        grp.scale.setScalar(Math.max(0.01, s * (1 - frac * 0.85)));
      }
    }

    // 10. Aim Trajectory Beads (thick bright white dots along aim path)
    if (params.aimTrace && !params.projectile) {
      const pts = params.aimTrace.points;
      const count = Math.min(this.maxBeads, Math.max(0, pts.length - 1));
      this.beadInstanced.count = count;
      const beadMat = this.beadInstanced.material as THREE.MeshBasicMaterial;
      beadMat.color.setHex(0xffffff);
      beadMat.opacity = params.isAiming ? 0.98 : 0.78;

      for (let i = 0; i < count; i++) {
        const pt = pts[i + 1];
        const fade = 1 - (i / Math.max(1, count)) * 0.35;
        const sc = (params.isAiming ? 1.12 : 0.95) * fade;
        _vec3.set(toWorldX(pt.x), toWorldY(pt.y), 0.18);
        _scaleVec.setScalar(sc);
        _quat.identity();
        _mat4.compose(_vec3, _quat, _scaleVec);
        this.beadInstanced.setMatrixAt(i, _mat4);
      }
      this.beadInstanced.instanceMatrix.needsUpdate = true;
    } else {
      this.beadInstanced.count = 0;
    }

    // 11. Update Pooled 3D Particles
    let activePartCount = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.vy -= 14 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const frac = 1 - p.life / p.maxLife;
      _vec3.set(p.x, p.y, p.z);
      _euler.set(p.life * 6, p.life * 4, 0);
      _quat.setFromEuler(_euler);
      _scaleVec.setScalar(p.size * frac);
      _mat4.compose(_vec3, _quat, _scaleVec);
      this.particleInstanced.setMatrixAt(activePartCount, _mat4);
      this.particleInstanced.setColorAt(activePartCount, p.color);
      activePartCount++;
    }
    this.particleInstanced.count = activePartCount;
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    if (this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }

    // 12. Update Shockwaves & Colored Explosion Auras
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 11) + 1.4 * dt;
      const alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      sw.mesh.scale.setScalar(sw.radius);
      sw.mat.opacity = alpha;
      if (sw.radius >= sw.maxRadius || alpha <= 0.02) {
        this.scene.remove(sw.mesh);
        sw.mat.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    for (let i = this.auras.length - 1; i >= 0; i--) {
      const au = this.auras[i];
      au.life += dt;
      const frac = Math.min(1, au.life / au.maxLife);
      const easeOut = 1 - Math.pow(1 - frac, 3);
      au.scale = 0.55 + (au.maxScale - 0.55) * easeOut;
      au.mesh.scale.setScalar(au.scale);
      au.mat.opacity = au.baseOpacity * (1 - frac);
      if (au.life >= au.maxLife) {
        this.scene.remove(au.mesh);
        au.mat.dispose();
        this.auras.splice(i, 1);
      }
    }

    // 13. Update Background Ambient Motes
    for (let i = 0; i < this.moteData.length; i++) {
      const m = this.moteData[i];
      const y = ((m.y + time * m.speed + 12) % 24) - 12;
      const x = m.x + Math.sin(time * 0.8 + m.phase) * 0.25;
      _vec3.set(x, y, m.z);
      _euler.set(time * 0.7 + m.phase, time * 0.5, 0);
      _quat.setFromEuler(_euler);
      _scaleVec.setScalar(m.size * (0.7 + 0.3 * Math.sin(time * 2 + m.phase)));
      _mat4.compose(_vec3, _quat, _scaleVec);
      this.motesInstanced.setMatrixAt(i, _mat4);
    }
    this.motesInstanced.instanceMatrix.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  private updateCameraFraming(w: number, h: number) {
    const aspect = Math.max(0.32, w / Math.max(1, h));
    const vFovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const tanHalfV = Math.tan(vFovRad / 2);
    // Required span to show both side pillars, all 11 columns, ceiling, and cannon on any screen
    const minVisibleW = 14.8;
    const minVisibleH = 25.4;
    const distForH = minVisibleH / 2 / tanHalfV;
    const distForW = minVisibleW / 2 / (tanHalfV * aspect);
    this.camera.aspect = aspect;
    this.camera.position.z = Math.max(distForH, distForW);
    this.camera.updateProjectionMatrix();
  }

  public getBucketScreenCoords(): { topPct: number; xsPct: number[] } {
    const leftX = toWorldX(LEFT_WALL);
    const rightX = toWorldX(RIGHT_WALL);
    const bucketW = (rightX - leftX) / 5;
    const by = toWorldY(BONUS_BUCKET_Y) - 0.14;
    const xsPct: number[] = [];
    let topPct = 73;
    this.camera.updateMatrixWorld();
    for (let i = 0; i < 5; i++) {
      const bx = leftX + (i + 0.5) * bucketW;
      _vec3.set(bx, by, 0.35).project(this.camera);
      xsPct.push(((_vec3.x + 1) * 0.5) * 100);
      if (i === 0) topPct = ((1 - _vec3.y) * 0.5) * 100;
    }
    return { topPct, xsPct };
  }

  public resize() {
    const w = this.container.clientWidth || 450;
    const h = this.container.clientHeight || 800;
    this.updateCameraFraming(w, h);
    this.renderer.setSize(w, h);
  }

  public dispose() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.themeTextures.forEach((t) => t.dispose());
    this.orbMaterials.forEach((m) => m.dispose());
    this.accentRingMat?.dispose();
    this.magmaCageMat?.dispose();
    this.disposableArenaItems.forEach((d) => d.dispose());

    this.sphereGeoSmooth.dispose();
    this.sphereGeoFaceted.dispose();
    this.collarGeo.dispose();
    this.crownRingGeo.dispose();
    this.magmaCageGeo.dispose();
    this.stoneGeo.dispose();
    this.iceShellGeo.dispose();
    this.starGeo.dispose();
    this.gyroRingGeo.dispose();
    this.particleGeo.dispose();
    this.beadGeo.dispose();
    this.shockwaveGeo.dispose();
    this.auraGeo.dispose();
    this.auraTex.dispose();

    this.stoneMat.dispose();
    this.iceFullMat.dispose();
    this.iceCrackedMat.dispose();
    this.starCoreMat.dispose();
    this.starGlassMat.dispose();
    this.bombBodyMat.dispose();
    this.bombGlowMat.dispose();
    this.rainbowCoreMat.dispose();
    (this.beadInstanced.material as THREE.Material).dispose();
    (this.particleInstanced.material as THREE.Material).dispose();
    (this.motesInstanced.material as THREE.Material).dispose();

    this.auras.forEach((a) => {
      this.scene.remove(a.mesh);
      a.mat.dispose();
    });
    this.auras = [];
    this.shockwaves.forEach((s) => {
      this.scene.remove(s.mesh);
      s.mat.dispose();
    });
    this.shockwaves = [];

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
