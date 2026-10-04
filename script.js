const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const flash = document.getElementById("flash");
const hint = document.getElementById("hint");
const name = document.getElementById("name");
const message = document.getElementById("message");
const replay = document.getElementById("replay");
const music = document.getElementById("music");
const photo = document.getElementById("photo");
const kissBox = document.getElementById("kisses");

let W = window.innerWidth;
let H = window.innerHeight;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
}
resize();
window.addEventListener("resize", resize);


// =====================================================
// НАСТРОЙКИ
// =====================================================

const PARTICLES = 2200;

let particles = [];
let stars = [];

let state = "heart";
let time = 0;
let rotation = 0;

// Параметры фазы "I love you"
let loveShow = false;   // показывать ли сердце из слов
let loveAlpha = 0;      // прозрачность чёткого текста
let dotAlpha = 1;       // прозрачность частиц
let dotScale = 1;       // размер частиц
let timers = [];

function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
}


// =====================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================================

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function lerp(a, b, amount) {
    return a + (b - a) * amount;
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function getScale() {
    return Math.min(W, H) * 0.22;
}


// =====================================================
// СПРАЙТЫ СВЕЧЕНИЯ (рисуем один раз, потом просто копируем)
// =====================================================

function makeSprite(core, main) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);

    gr.addColorStop(0, `rgba(${core.join(",")},1)`);
    gr.addColorStop(0.14, `rgba(${main.join(",")},0.95)`);
    gr.addColorStop(0.4, `rgba(${main.join(",")},0.22)`);
    gr.addColorStop(1, `rgba(${main.join(",")},0)`);

    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
}

const sprites = [
    makeSprite([255, 110, 135], [255, 25, 65]),    // рубин
    makeSprite([255, 160, 180], [255, 70, 105]),   // роза
    makeSprite([255, 215, 225], [255, 130, 160]),  // нежно-розовый
    makeSprite([255, 255, 255], [255, 190, 210])   // белый блик
];


// =====================================================
// ТОЧКА ВНУТРИ СЕРДЦА (часть точек — на контуре, объём по глубине)
// =====================================================

function createHeartPoint() {

    const t = Math.random() * Math.PI * 2;

    // Почти половина частиц лежит у края — форма читается чётче
    const r = Math.random() < 0.45
        ? random(0.9, 1)
        : Math.sqrt(Math.random());

    const x = 16 * Math.pow(Math.sin(t), 3);

    const y =
        13 * Math.cos(t)
        - 5 * Math.cos(2 * t)
        - 2 * Math.cos(3 * t)
        - Math.cos(4 * t);

    // Толще в центре, тоньше у краёв — получается "объёмная" подушка
    const depth = Math.sqrt(Math.max(0, 1 - r * r * 0.85));

    return {
        x: (x * r) / 16,
        y: (y * r) / 16,
        z: random(-0.6, 0.6) * depth
    };
}


// =====================================================
// СОЗДАЁМ СЕРДЦЕ
// =====================================================

for (let i = 0; i < PARTICLES; i++) {

    const point = createHeartPoint();
    const k = Math.random();

    particles.push({
        x: point.x, y: point.y, z: point.z,
        heartX: point.x, heartY: point.y, heartZ: point.z,
        targetX: point.x, targetY: point.y, targetZ: point.z,
        vx: 0, vy: 0, vz: 0,

        // 0-2 разные оттенки, 3 — белые искорки
        tone: k < 0.06 ? 3 : k < 0.45 ? 0 : k < 0.8 ? 1 : 2,

        size: random(1, 3),
        alpha: random(0.5, 1),
        phase: random(0, Math.PI * 2)
    });
}


// =====================================================
// ЗВЁЗДЫ
// =====================================================

for (let i = 0; i < 250; i++) {
    stars.push({
        x: Math.random(),
        y: Math.random(),
        size: random(0.5, 2),
        alpha: random(0.2, 0.8),
        phase: random(0, Math.PI * 2)
    });
}


// =====================================================
// ТЕКСТ АНЯ
// =====================================================

const textCanvas = document.createElement("canvas");
const textCtx = textCanvas.getContext("2d");

textCanvas.width = 900;
textCanvas.height = 400;

textCtx.fillStyle = "white";
textCtx.font = "bold 250px Arial";
textCtx.textAlign = "center";
textCtx.textBaseline = "middle";
textCtx.fillText("АНЯ", 450, 200);

const textImage = textCtx.getImageData(0, 0, 900, 400);
let textPoints = [];

for (let y = 0; y < 400; y += 5) {
    for (let x = 0; x < 900; x += 5) {
        const index = (y * 900 + x) * 4;
        if (textImage.data[index + 3] > 100) {
            textPoints.push({
                x: (x - 450) / 8,
                y: -(y - 200) / 8,
                z: random(-2, 2)
            });
        }
    }
}

for (let i = 0; i < particles.length; i++) {
    const point = textPoints[i % textPoints.length];
    particles[i].textX = point.x;
    particles[i].textY = point.y;
    particles[i].textZ = point.z;
}


// =====================================================
// СЕРДЦЕ ИЗ СЛОВ "I LOVE YOU"
// =====================================================

const LW = 800;      // ширина картинки
const LH = 780;      // высота картинки
const LK = 380 / 16; // пикселей на единицу формулы сердца

const loveCanvas = document.createElement("canvas");
loveCanvas.width = LW;
loveCanvas.height = LH;

let lovePoints = [];

const loveCtx = loveCanvas.getContext("2d");
let loveRings = [];

// Рисуем слова на контурах со сдвигом off (пиксели вдоль линии)
function drawLoveText(off) {

    const lc = loveCtx;
    lc.clearRect(0, 0, LW, LH);

    for (const ring of loveRings) {
        const { u, M, L, chars, dir } = ring;

        for (const c of chars) {

            const pos = (((c.d + off * dir) % L) + L) % L;
            const k = Math.floor(pos) % M;

            const a = u[(k - 3 + M) % M];
            const b = u[(k + 3) % M];
            const ang = Math.atan2(b.y - a.y, b.x - a.x);

            lc.save();
            lc.translate(u[k].x, u[k].y);
            lc.rotate(ang);
            lc.fillText(c.ch, 0, 0);
            lc.restore();
        }
    }
}

function buildLoveHeart() {

    const lc = loveCtx;

    // Контур сердца (относительно центра)
    const N = 1600;
    const base = [];

    for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y =
            13 * Math.cos(t)
            - 5 * Math.cos(2 * t)
            - 2 * Math.cos(3 * t)
            - Math.cos(4 * t);
        base.push({ x: x * LK, y: -y * LK });
    }

    const grad = lc.createLinearGradient(0, 40, 0, 740);
    grad.addColorStop(0, "#ffd0dc");
    grad.addColorStop(0.4, "#ff6b8f");
    grad.addColorStop(1, "#ff1f55");

    lc.fillStyle = grad;
    lc.font = "bold 24px Arial";
    lc.textAlign = "center";
    lc.textBaseline = "middle";

    const phrase = "I love you   ";
    const pw = lc.measureText(phrase).width;

    // Вложенные контуры: чётные едут в одну сторону, нечётные в другую
    const scales = [1, 0.76, 0.52, 0.28];

    scales.forEach((sc, ri) => {

        const pts = base.map(p => ({
            x: LW / 2 + p.x * sc,
            y: 330 + p.y * sc
        }));

        const cum = [0];
        for (let i = 1; i <= N; i++) {
            cum[i] = cum[i - 1] + Math.hypot(
                pts[i].x - pts[i - 1].x,
                pts[i].y - pts[i - 1].y
            );
        }

        const L = cum[N];

        // Равномерные точки через каждый 1px — чтобы быстро искать позицию
        const M = Math.floor(L);
        const u = [];
        let j = 1;

        for (let k = 0; k < M; k++) {
            while (j < N && cum[j] < k) j++;
            const f = (k - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1);
            u.push({
                x: lerp(pts[j - 1].x, pts[j].x, f),
                y: lerp(pts[j - 1].y, pts[j].y, f)
            });
        }

        // Раскладываем буквы по длине контура (с растяжкой, чтобы цикл был бесшовный)
        const n = Math.max(1, Math.round(L / pw));
        const stretch = L / (n * pw);
        const chars = [];
        let d = 0;

        for (let rep = 0; rep < n; rep++) {
            for (const ch of phrase) {
                const w = lc.measureText(ch).width * stretch;
                if (ch !== " ") chars.push({ ch, d: d + w / 2 });
                d += w;
            }
        }

        loveRings.push({ u, M, L, chars, dir: ri % 2 ? -1 : 1 });
    });

    // Точки букв — по ним летят частицы
    drawLoveText(0);

    const data = lc.getImageData(0, 0, LW, LH).data;

    for (let y = 0; y < LH; y += 2) {
        for (let x = 0; x < LW; x += 2) {
            if (data[(y * LW + x) * 4 + 3] > 140) {
                lovePoints.push({ px: x, py: y });
            }
        }
    }

    for (let i = lovePoints.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lovePoints[i], lovePoints[j]] = [lovePoints[j], lovePoints[i]];
    }
}

buildLoveHeart();

// Размер сердца на экране
function loveWidth() {
    return Math.min(W * 0.95, H * 0.8 * LW / LH);
}


// =====================================================
// 3D ПОВОРОТ И ПРОЕКЦИЯ
// =====================================================

function rotate3D(x, y, z) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
        x: x * cos - z * sin,
        y: y,
        z: x * sin + z * cos
    };
}

function project(point) {
    const distance = 5;
    const perspective = distance / (distance - point.z);
    const scale = getScale();

    return {
        x: W / 2 + point.x * perspective * scale,
        y: H / 2 - point.y * perspective * scale,
        scale: perspective
    };
}


// =====================================================
// ФОН И ЗВЁЗДЫ
// =====================================================

function drawBackground() {

    const gradient = ctx.createRadialGradient(
        W / 2, H / 2, 0,
        W / 2, H / 2, Math.max(W, H) * 0.8
    );

    gradient.addColorStop(0, "#32000d");
    gradient.addColorStop(0.35, "#120005");
    gradient.addColorStop(0.75, "#030001");
    gradient.addColorStop(1, "#000000");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
}

function drawStars() {

    for (const star of stars) {

        const twinkle = 0.5 + Math.sin(time * 0.002 + star.phase) * 0.5;

        ctx.beginPath();
        ctx.arc(star.x * W, star.y * H, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 130, ${star.alpha * twinkle})`;
        ctx.fill();
    }
}

// Мягкое сияние за сердцем
function drawAura(beat) {

    const r = getScale() * 1.9 * beat;

    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
    g.addColorStop(0, "rgba(255, 30, 70, 0.28)");
    g.addColorStop(0.5, "rgba(255, 0, 50, 0.10)");
    g.addColorStop(1, "rgba(255, 0, 50, 0)");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
}


// =====================================================
// РИСУЕМ ЧАСТИЦУ
// =====================================================

function drawParticle(p) {

    const rot = rotate3D(p.x, p.y, p.z);
    const pr = project(rot);

    const pulse = 1 + Math.sin(time * 0.01 + p.phase) * 0.25;

    // Белые искорки мерцают
    const glint = p.tone === 3
        ? 0.45 + 0.55 * Math.sin(time * 0.08 + p.phase * 3)
        : 1;

    const size =
        p.size * pr.scale * pulse * dotScale * (p.tone === 3 ? 1.4 : 1);

    // Ближние частицы ярче, дальние темнее — получается объём
    const depth = clamp(0.62 + rot.z * 0.45, 0.3, 1);

    ctx.globalAlpha = clamp(p.alpha * depth * dotAlpha * glint * 0.85, 0, 1);

    const rad = Math.max(2, size * 5);

    ctx.drawImage(
        sprites[p.tone],
        pr.x - rad, pr.y - rad,
        rad * 2, rad * 2
    );
}


// =====================================================
// ЧЁТКОЕ СЕРДЦЕ ИЗ СЛОВ
// =====================================================

function drawLoveHeart(beat) {

    if (loveAlpha <= 0.01) return;

    const dw = loveWidth();
    const dh = dw * LH / LW;

    ctx.save();
    ctx.globalAlpha = loveAlpha;
    ctx.translate(W / 2, H / 2);
    ctx.scale(beat, beat);
    ctx.shadowColor = "#ff1744";
    ctx.shadowBlur = 28;
    ctx.drawImage(loveCanvas, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
}



// =====================================================
// ПОЦЕЛУЙЧИКИ НА СТАРТЕ
// =====================================================

const KISSES = ["💋", "😘", "😚", "😙", "😗", "😽", "💋", "💕", "💖", "💞", "🥰", "😍", "❤️", "💘", "😻", "🌹"];

function spawnKiss() {

    const k = document.createElement("span");

    k.className = "kiss";
    k.textContent = KISSES[Math.floor(Math.random() * KISSES.length)];

    k.style.left = random(2, 96) + "vw";
    k.style.fontSize = random(20, 54) + "px";
    k.style.animationDuration = random(5, 9) + "s";
    k.style.setProperty("--dx", random(-90, 90) + "px");
    k.style.setProperty("--r0", random(-35, 35) + "deg");
    k.style.setProperty("--r1", random(-80, 80) + "deg");

    kissBox.appendChild(k);

    k.addEventListener("animationend", () => k.remove());
}

// Сразу куча поцелуйчиков, дальше идут потоком
for (let i = 0; i < 28; i++) {
    setTimeout(spawnKiss, i * 90);
}

setInterval(() => {
    if (state === "heart") spawnKiss();
}, 240);

// =====================================================
// МУЗЫКА И ВСПЫШКА
// =====================================================

function startMusic() {
    music.volume = 0.5;
    music.play().catch(() => {});
}

function flashScreen() {
    flash.animate(
        [{ opacity: 0 }, { opacity: 0.9 }, { opacity: 0 }],
        { duration: 650, easing: "ease-out" }
    );
}


// =====================================================
// ВЗРЫВ → АНЯ → СООБЩЕНИЕ → СЕРДЦЕ ИЗ СЛОВ
// =====================================================

function explode() {

    state = "exploding";

    hint.classList.add("hidden");
    photo.classList.add("hidden");
    kissBox.classList.add("off");
    startMusic();
    flashScreen();

    for (const p of particles) {

        const length = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
        const force = random(2, 6);

        p.vx = (p.x / length) * force;
        p.vy = (p.y / length) * force;
        p.vz = random(-3, 3);
    }

    later(assembleName, 900);
}

function assembleName() {

    state = "assembling";

    for (const p of particles) {
        p.targetX = p.textX;
        p.targetY = p.textY;
        p.targetZ = p.textZ;
    }

    later(showMessage, 2200);
}

function showMessage() {

    state = "done";

    name.classList.add("visible");

    later(() => {
        message.classList.add("visible");
        replay.classList.add("visible");
    }, 700);

    // Через несколько секунд — продолжение: сердце из "I love you"
    later(startLove, 6500);
}

function startLove() {

    state = "love";

    name.classList.remove("visible");
    message.classList.remove("visible");
    document.body.classList.add("love");

    // Новые цели частиц — точки букв внутри сердца
    const dw = loveWidth();
    const k = dw / LW;
    const scale = getScale();

    for (let i = 0; i < particles.length; i++) {

        const lp = lovePoints[i % lovePoints.length];
        const p = particles[i];

        p.targetX = ((lp.px - LW / 2) * k) / scale;
        p.targetY = (-(lp.py - LH / 2) * k) / scale;
        p.targetZ = random(-0.08, 0.08);
    }

    // Когда частицы долетели — проявляем чёткие слова
    later(() => {
        loveShow = true;
    }, 2600);
}


// =====================================================
// СБРОС
// =====================================================

function reset() {

    timers.forEach(clearTimeout);
    timers = [];

    state = "heart";

    name.classList.remove("visible");
    message.classList.remove("visible");
    replay.classList.remove("visible");
    hint.classList.remove("hidden");
    photo.classList.remove("hidden");
    kissBox.classList.remove("off");
    document.body.classList.remove("love");

    rotation = 0;
    loveShow = false;
    loveAlpha = 0;
    dotAlpha = 1;
    dotScale = 1;

    for (const p of particles) {
        p.x = p.heartX; p.y = p.heartY; p.z = p.heartZ;
        p.targetX = p.heartX; p.targetY = p.heartY; p.targetZ = p.heartZ;
        p.vx = 0; p.vy = 0; p.vz = 0;
    }
}

canvas.addEventListener("click", () => {
    if (state === "heart") explode();
});

replay.addEventListener("click", reset);


// =====================================================
// ГЛАВНАЯ АНИМАЦИЯ
// =====================================================

function animate() {

    requestAnimationFrame(animate);

    time++;

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    drawBackground();
    drawStars();

    // Двойной удар, как настоящий пульс
    const t = (time * 0.045) % (Math.PI * 2);
    const beat = 1 + (Math.max(0, Math.sin(t)) ** 3) * 0.1
                   + (Math.max(0, Math.sin(t * 2 - 1.2)) ** 3) * 0.04;


    // ---------------- СЕРДЦЕ ----------------

    if (state === "heart") {

        rotation += 0.008;

        drawAura(beat);

        for (const p of particles) {
            p.x = lerp(p.x, p.heartX * beat, 0.1);
            p.y = lerp(p.y, p.heartY * beat, 0.1);
            p.z = lerp(p.z, p.heartZ, 0.1);
        }
    }


    // ---------------- ВЗРЫВ ----------------

    if (state === "exploding") {

        rotation += 0.025;

        for (const p of particles) {
            p.x += p.vx; p.y += p.vy; p.z += p.vz;
            p.vx *= 0.96; p.vy *= 0.96; p.vz *= 0.96;
        }
    }


    // ---------------- АНЯ ----------------

    if (state === "assembling" || state === "done") {

        rotation += 0.002;

        for (const p of particles) {
            p.x = lerp(p.x, p.targetX, 0.035);
            p.y = lerp(p.y, p.targetY, 0.035);
            p.z = lerp(p.z, p.targetZ, 0.035);
        }
    }


    // ---------------- I LOVE YOU ----------------

    if (state === "love") {

        // Плавно доворачиваем сердце лицом к зрителю
        const face = Math.round(rotation / (Math.PI * 2)) * Math.PI * 2;
        rotation = lerp(rotation, face, 0.06);

        dotScale = lerp(dotScale, 0.55, 0.03);

        if (loveShow) {
            loveAlpha = lerp(loveAlpha, 1, 0.03);
            dotAlpha = lerp(dotAlpha, 0.35, 0.03);
        }

        for (const p of particles) {
            p.x = lerp(p.x, p.targetX * (loveShow ? beat : 1), 0.06);
            p.y = lerp(p.y, p.targetY * (loveShow ? beat : 1), 0.06);
            p.z = lerp(p.z, p.targetZ, 0.06);
        }
    }


    // ---------------- РИСУЕМ ----------------

    particles.sort((a, b) => a.z - b.z);

    // Складываем свет — получается настоящее свечение
    ctx.globalCompositeOperation = "lighter";

    for (const p of particles) {
        drawParticle(p);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    if (state === "love") {
        // Слова бегут по контуру
        if (loveAlpha > 0.01) drawLoveText(time * 0.9);
        drawLoveHeart(beat);
    }
}

animate();
