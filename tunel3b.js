// 3B tünel: LYK 13 LED tünelinin gerçek ölçülü modeli (2,5 m en × 2,5 m yükseklik × 3 m derinlik).
// Üç LED duvar seçeneğin LED şerit videosunu oynatır (sol 768 | arka 640 | sağ 768 piksel, toplam 2176).
// Fotoğrafçının gözünde (açıklığın 3,81 m önü, 1,22 m yükseklik, 0,2 m sol) üç duvar tek bir derin sahneye dönüşür.
// Koordinat: x sağ, y yukarı, z izleyiciye doğru; tünel ağzı z=0, arka duvar z=-3.
import * as THREE from 'three';

const W = 2.5, H = 2.5, D = 3.0, KALIN = 0.10;
const GOZ = new THREE.Vector3(-0.20, 1.22, 3.81);
const GOZ_HEDEF = new THREE.Vector3(-0.20, 1.22, -3.0);
const MERKEZ = new THREE.Vector3(0, 1.15, -1.5);
const PIKSEL = 2176;

const kap = document.getElementById('sahne3b');
const tuval = kap.querySelector('canvas');
const durumYazi = document.getElementById('sahne3b-durum');
const aciklama = document.getElementById('sahne3b-aciklama');
const secici = document.getElementById('sahne3b-secici');
const veriler = JSON.parse(document.getElementById('seritler').textContent);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: tuval, antialias: true, stencil: true, powerPreference: 'high-performance' });
} catch (e) {
  kap.classList.add('desteksiz');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const sahne = new THREE.Scene();
sahne.background = new THREE.Color(0x0c0911);
sahne.fog = new THREE.Fog(0x0c0911, 9, 24);
const kamera = new THREE.PerspectiveCamera(48, 1, 0.05, 80);

// ---------- LED videosu ----------
const video = document.createElement('video');
video.crossOrigin = 'anonymous';
video.muted = true;
video.loop = true;
video.playsInline = true;
video.setAttribute('playsinline', '');
video.preload = 'auto';
const doku = new THREE.VideoTexture(video);
doku.colorSpace = THREE.SRGBColorSpace;
doku.minFilter = THREE.LinearFilter;
doku.magFilter = THREE.LinearFilter;
doku.generateMipmaps = false;

function dortgen(p, u0, u1, malz) {
  // p: [solAlt, sağAlt, sağÜst, solÜst]; doku u0..u1 aralığından (v alttan üste 0..1)
  const g = new THREE.BufferGeometry();
  const k = [p[0], p[1], p[2], p[0], p[2], p[3]];
  g.setAttribute('position', new THREE.Float32BufferAttribute(k.flatMap(v => [v.x, v.y, v.z]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1], 2));
  return new THREE.Mesh(g, malz);
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const duvarlar = [
  { p: [V(-W / 2, 0, 0), V(-W / 2, 0, -D), V(-W / 2, H, -D), V(-W / 2, H, 0)], u: [0, 768] },
  { p: [V(-W / 2, 0, -D), V(W / 2, 0, -D), V(W / 2, H, -D), V(-W / 2, H, -D)], u: [768, 1408] },
  { p: [V(W / 2, 0, -D), V(W / 2, 0, 0), V(W / 2, H, 0), V(W / 2, H, -D)], u: [1408, 2176] },
];
const ledMalz = new THREE.MeshBasicMaterial({ map: doku, side: THREE.DoubleSide, toneMapped: false });
for (const d of duvarlar) sahne.add(dortgen(d.p, d.u[0] / PIKSEL, d.u[1] / PIKSEL, ledMalz));

// parlak siyah zemin: duvarların aynadaki kopyası zemin deliğinin altında, üstünde yarı saydam siyah panel
const zeminYansima = new THREE.Group();
const yansimaMalz = new THREE.MeshBasicMaterial({ map: doku, side: THREE.DoubleSide, toneMapped: false });
for (const d of duvarlar) zeminYansima.add(dortgen(d.p, d.u[0] / PIKSEL, d.u[1] / PIKSEL, yansimaMalz));
zeminYansima.scale.y = -1;
sahne.add(zeminYansima);
const tabanPanel = new THREE.Mesh(new THREE.PlaneGeometry(W, D),
  new THREE.MeshBasicMaterial({ color: 0x050407, transparent: true, opacity: 0.72 }));
tabanPanel.rotation.x = -Math.PI / 2;
tabanPanel.position.set(0, 0.004, -D / 2);
sahne.add(tabanPanel);

// aynalı iç tavan: yansıma yalnız tavan panelinin göründüğü yerde çizilir (şablon tamponu)
const tavanPanel = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({
  colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1,
  stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
}));
tavanPanel.rotation.x = Math.PI / 2;            // yüzü aşağı bakar; üstten bakınca görünmez
tavanPanel.position.set(0, H - 0.002, -D / 2);
tavanPanel.renderOrder = 1;
sahne.add(tavanPanel);
const tavanYansima = new THREE.Group();
const tavanYansimaMalz = new THREE.MeshBasicMaterial({
  map: doku, side: THREE.DoubleSide, toneMapped: false,
  stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc,
});
for (const d of duvarlar) {
  const m = dortgen(d.p, d.u[0] / PIKSEL, d.u[1] / PIKSEL, tavanYansimaMalz);
  m.renderOrder = 2;
  tavanYansima.add(m);
}
tavanYansima.scale.y = -1;
tavanYansima.position.y = 2 * H;
sahne.add(tavanYansima);
const tavanKarartma = new THREE.Mesh(new THREE.PlaneGeometry(W, D),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }));
tavanKarartma.rotation.x = Math.PI / 2;
tavanKarartma.position.set(0, H - 0.003, -D / 2);
tavanKarartma.renderOrder = 3;
sahne.add(tavanKarartma);

// ---------- kabin, çatı, ön kasa ----------
const kabinMalz = new THREE.MeshStandardMaterial({ color: 0x141218, metalness: 0.55, roughness: 0.45 });
function kutu(x, y, z, sx, sy, sz, malz = kabinMalz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), malz);
  m.position.set(x, y, z);
  sahne.add(m);
  return m;
}
kutu(-(W / 2 + KALIN / 2 + 0.003), H / 2, -(D + KALIN) / 2, KALIN, H, D + KALIN);
kutu(W / 2 + KALIN / 2 + 0.003, H / 2, -(D + KALIN) / 2, KALIN, H, D + KALIN);
kutu(0, H / 2, -(D + KALIN / 2 + 0.003), W + 2 * KALIN, H, KALIN);
// çatının alt yüzü yok: içeriden aynalı tavan görünsün
const gorunmez = new THREE.MeshBasicMaterial({ visible: false });
const cati = new THREE.Mesh(new THREE.BoxGeometry(W + 2 * KALIN + 0.06, 0.14, D + KALIN + 0.06),
  [kabinMalz, kabinMalz, kabinMalz, gorunmez, kabinMalz, kabinMalz]);
cati.position.set(0, H + 0.07, -(D + KALIN) / 2 + 0.03);
sahne.add(cati);
for (const s of [-1, 1]) kutu(s * (W / 2 + KALIN / 2), H / 2, 0.025, KALIN + 0.04, H, 0.05);
kutu(0, H + 0.03, 0.025, W + 2 * KALIN + 0.04, 0.12, 0.05);

// ---------- fuaye zemini: tünelin altı delik (yansıma görünsün), ağızdan taşan mor ışık ----------
const cv = document.createElement('canvas');
cv.width = cv.height = 512;
const c2 = cv.getContext('2d');
c2.fillStyle = '#100c16';
c2.fillRect(0, 0, 512, 512);
const gr = c2.createRadialGradient(256, 282, 4, 256, 282, 120);
gr.addColorStop(0, 'rgba(150, 112, 255, 0.55)');
gr.addColorStop(0.45, 'rgba(110, 80, 210, 0.22)');
gr.addColorStop(1, 'rgba(16, 12, 22, 0)');
c2.fillStyle = gr;
c2.fillRect(0, 0, 512, 512);
const zeminDoku = new THREE.CanvasTexture(cv);
zeminDoku.colorSpace = THREE.SRGBColorSpace;
zeminDoku.repeat.set(1 / 30, 1 / 30);
zeminDoku.offset.set(0.5, 0.5);
const sekil = new THREE.Shape();
sekil.moveTo(-15, -15); sekil.lineTo(15, -15); sekil.lineTo(15, 15); sekil.lineTo(-15, 15); sekil.lineTo(-15, -15);
const delik = new THREE.Path();
delik.moveTo(-W / 2, 0); delik.lineTo(-W / 2, D); delik.lineTo(W / 2, D); delik.lineTo(W / 2, 0); delik.lineTo(-W / 2, 0);
sekil.holes.push(delik);
const fuaye = new THREE.Mesh(new THREE.ShapeGeometry(sekil), new THREE.MeshBasicMaterial({ map: zeminDoku }));
fuaye.rotation.x = -Math.PI / 2;
sahne.add(fuaye);

// fotoğrafçı noktası: yerde bant çarpı + lila halka
const bantMalz = new THREE.MeshBasicMaterial({ color: 0xe9e4f2 });
for (const a of [Math.PI / 4, -Math.PI / 4]) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.004, 0.05), bantMalz);
  b.position.set(GOZ.x, 0.003, GOZ.z);
  b.rotation.y = a;
  sahne.add(b);
}
const halka = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.3, 48),
  new THREE.MeshBasicMaterial({ color: 0xcbb0f5, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
halka.rotation.x = -Math.PI / 2;
halka.position.set(GOZ.x, 0.006, GOZ.z);
sahne.add(halka);

sahne.add(new THREE.HemisphereLight(0x9b86d6, 0x0c0911, 0.9));
const tasma = new THREE.PointLight(0xa58cff, 6, 9, 1.6);
tasma.position.set(0, 1.3, 0.6);
sahne.add(tasma);

// ---------- kamera: dışarıdan dolaşma ↔ fotoğrafçının gözü ----------
let mod = 'dolas';            // 'dolas' | 'goz'
let aci = 0.62, egim = 0.2, uzak = 6.3;
let otomatikDon = true;
let gecis = null;             // {t0, sure, p0, h0, p1, h1, f0, f1}
const hedef = MERKEZ.clone();

function dolasKonum() {
  return V(MERKEZ.x + uzak * Math.sin(aci) * Math.cos(egim), MERKEZ.y + uzak * Math.sin(egim) + 0.3, MERKEZ.z + uzak * Math.cos(aci) * Math.cos(egim));
}
function gozFov() {
  // dikeyde tünelin tamamı (±19°), yatayda en az 50° görünsün
  const a = kamera.aspect;
  const yataydan = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(25)) / a);
  return THREE.MathUtils.radToDeg(Math.max(THREE.MathUtils.degToRad(41), yataydan));
}
function yumusak(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function gec(yeniMod, sure = 1600) {
  const p1 = yeniMod === 'goz' ? GOZ.clone() : dolasKonum();
  const h1 = yeniMod === 'goz' ? GOZ_HEDEF.clone() : MERKEZ.clone();
  const f1 = yeniMod === 'goz' ? gozFov() : 42;
  gecis = { t0: performance.now(), sure, p0: kamera.position.clone(), h0: hedef.clone(), p1, h1, f0: kamera.fov, f1 };
  mod = yeniMod;
  kap.dataset.mod = yeniMod;
  for (const b of kap.querySelectorAll('[data-mod-dugme]')) b.setAttribute('aria-pressed', String(b.dataset.modDugme === yeniMod));
  aciklama.textContent = yeniMod === 'goz'
    ? 'Fotoğrafçının gözünden: üç düz duvar birleşip tek bir derin sahneye dönüşüyor.'
    : 'Dışarıdan: aslında üç düz LED duvar. Parmağınızla sağa sola çevirin.';
}
kamera.position.copy(dolasKonum());
kamera.fov = 42;

// sürükleyerek çevirme (dikey kaydırma sayfayı kaydırmaya devam eder)
let suruk = null;
tuval.addEventListener('pointerdown', e => {
  suruk = { x: e.clientX, y: e.clientY, aci, egim };
  otomatikDon = false;
});
window.addEventListener('pointermove', e => {
  if (!suruk) return;
  if (mod === 'goz') { gec('dolas', 900); suruk.aci = aci; suruk.egim = egim; suruk.x = e.clientX; suruk.y = e.clientY; return; }
  aci = THREE.MathUtils.clamp(suruk.aci - (e.clientX - suruk.x) * 0.008, -1.45, 1.45);
  if (e.pointerType === 'mouse') egim = THREE.MathUtils.clamp(suruk.egim + (e.clientY - suruk.y) * 0.005, 0.02, 1.0);
});
const birak = () => { suruk = null; };
window.addEventListener('pointerup', birak);
window.addEventListener('pointercancel', birak);
for (const b of kap.querySelectorAll('[data-mod-dugme]')) {
  b.addEventListener('click', () => {
    otomatikDon = b.dataset.modDugme === 'dolas';
    if (otomatikDon) { aci = 0.62; egim = 0.2; }
    gec(b.dataset.modDugme);
  });
}

// ---------- seçenek değiştirme ----------
let secili = null;
function sec(no, gozeGec = true) {
  const v = veriler.find(x => x.no === Number(no));
  if (!v) return;
  secili = v.no;
  kap.classList.add('yukleniyor');
  durumYazi.textContent = v.no + ' · ' + v.ad + ' yükleniyor…';
  video.src = v.serit;
  video.play().catch(() => {});
  for (const c of secici.querySelectorAll('button')) c.setAttribute('aria-pressed', String(Number(c.dataset.no) === v.no));
  // seçili düğmeyi şeridin ortasına getir (yalnız yatay; sayfa kaymasın)
  const aktif = secici.querySelector('[aria-pressed="true"]');
  if (aktif) secici.scrollLeft = aktif.offsetLeft - (secici.clientWidth - aktif.offsetWidth) / 2;
  if (gozeGec) { otomatikDon = false; gec('goz', 1800); }
}
video.addEventListener('playing', () => {
  kap.classList.remove('yukleniyor');
  const v = veriler.find(x => x.no === secili);
  durumYazi.textContent = v ? v.no + ' · ' + v.ad : '';
});
secici.addEventListener('click', e => {
  const b = e.target.closest('button[data-no]');
  if (b) sec(b.dataset.no);
});
window.tunel3b = { sec };
for (const no of (window.tunel3bBekleyen || [])) sec(no);

// ---------- boyut ve çizim döngüsü ----------
function boyutla() {
  const r = tuval.getBoundingClientRect();
  if (!r.width) return;
  renderer.setSize(r.width, r.height, false);
  kamera.aspect = r.width / r.height;
  if (mod === 'goz' && !gecis) kamera.fov = gozFov();
  kamera.updateProjectionMatrix();
}
new ResizeObserver(boyutla).observe(tuval);
boyutla();

let gorunur = false, ilkKez = true;
new IntersectionObserver(g => {
  gorunur = g[0].isIntersecting;
  if (gorunur) {
    if (!secili) sec(veriler[0].no, false);
    video.play().catch(() => {});
    if (ilkKez) {
      // ilk açılış: dışarıdan biraz dolaşır, sonra fotoğrafçının gözüne oturur
      ilkKez = false;
      setTimeout(() => { if (otomatikDon && mod === 'dolas') { otomatikDon = false; gec('goz', 2200); } }, 4200);
    }
  } else {
    video.pause();
  }
}, { threshold: 0.25 }).observe(kap);

const saat = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = saat.getDelta();
  if (!gorunur) return;
  if (gecis) {
    const t = Math.min(1, (performance.now() - gecis.t0) / gecis.sure);
    const k = yumusak(t);
    kamera.position.lerpVectors(gecis.p0, gecis.p1, k);
    hedef.lerpVectors(gecis.h0, gecis.h1, k);
    kamera.fov = gecis.f0 + (gecis.f1 - gecis.f0) * k;
    kamera.updateProjectionMatrix();
    if (t >= 1) gecis = null;
  } else if (mod === 'dolas') {
    if (otomatikDon) aci = Math.sin(performance.now() / 5200) * 0.85;
    kamera.position.copy(dolasKonum());
    hedef.copy(MERKEZ);
  }
  halka.material.opacity = 0.45 + 0.4 * Math.sin(performance.now() / 380) ** 2;
  kamera.lookAt(hedef);
  renderer.render(sahne, kamera);
});
kap.classList.add('hazir');
gec('dolas', 1);
