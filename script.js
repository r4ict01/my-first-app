const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const livesEl = document.querySelector('#lives');
const progressEl = document.querySelector('#progress');
const message = document.querySelector('#message');
const messageTitle = document.querySelector('#message-title');
const messageCopy = document.querySelector('#message-copy');
const restartButton = document.querySelector('#restart');

const keys = {};
const world = { width: 5200, ground: 350 };
let player;
let camera = 0;
let score = 0;
let lives = 3;
let gameState = 'playing';
let lastTime = 0;
let particles = [];
const stars = Array.from({ length: 85 }, (_, i) => ({
    x: (i * 137.7) % 1800, y: 28 + ((i * 71.3) % 190), size: i % 7 === 0 ? 2 : 1, alpha: .25 + (i % 5) * .12
}));

const platforms = [
    { x: 0, y: 350, w: 900, h: 80 }, { x: 1020, y: 350, w: 650, h: 80 },
    { x: 1800, y: 350, w: 730, h: 80 }, { x: 2690, y: 350, w: 760, h: 80 },
    { x: 3620, y: 350, w: 1580, h: 80 },
    { x: 570, y: 275, w: 155, h: 18 }, { x: 1270, y: 260, w: 170, h: 18 },
    { x: 2110, y: 270, w: 180, h: 18 }, { x: 3030, y: 250, w: 170, h: 18 },
    { x: 4050, y: 275, w: 190, h: 18 }
];
const coins = [430, 625, 790, 1170, 1330, 1530, 1930, 2160, 2380, 2830, 3080, 3330, 3780, 4080, 4390, 4780]
    .map(x => ({ x, y: x % 2 ? 305 : 245, collected: false }));
const enemies = [850, 1450, 2000, 2420, 2910, 3400, 3890, 4520].map(x => ({ x, y: 320, w: 25, h: 30, alive: true, dir: 1 }));
const goal = { x: 5000, y: 240 };

function reset() {
    player = { x: 100, y: 280, w: 24, h: 38, vx: 0, vy: 0, grounded: false, facing: 1, attack: 0, invincible: 0 };
    camera = 0; score = 0; lives = 3; gameState = 'playing'; particles = [];
    coins.forEach(c => c.collected = false);
    enemies.forEach(e => { e.alive = true; e.dir = 1; });
    message.classList.add('hidden');
}

function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio; canvas.height = canvas.clientHeight * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function pressed(...names) { return names.some(name => keys[name]); }
window.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'f', 'F'].includes(e.key)) e.preventDefault();
    keys[e.key] = true;
    if ((e.key === 'f' || e.key === 'F') && player && gameState === 'playing') player.attack = .22;
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
document.querySelectorAll('[data-key]').forEach(button => {
    const key = button.dataset.key;
    const map = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', attack: 'f' };
    const mapped = map[key];
    button.addEventListener('pointerdown', () => { keys[mapped] = true; if (key === 'attack') player.attack = .22; });
    button.addEventListener('pointerup', () => { keys[mapped] = false; });
    button.addEventListener('pointerleave', () => { keys[mapped] = false; });
});
restartButton.addEventListener('click', reset);

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function spawn(x, y, color) {
    for (let i = 0; i < 7; i++) particles.push({ x, y, vx: (Math.random() - .5) * 90, vy: (Math.random() - .8) * 100, life: .5, color });
}
function hurt() {
    if (player.invincible > 0) return;
    lives--; player.invincible = 1.3; player.vy = -310; player.vx = -player.facing * 220; spawn(player.x, player.y, '#ff758f');
    if (lives <= 0) endGame(false);
}
function endGame(won) {
    gameState = won ? 'won' : 'lost';
    messageTitle.textContent = won ? 'ステージクリア！' : 'ゲームオーバー';
    messageCopy.textContent = won ? `スコア ${String(score).padStart(6, '0')} でゴールしました。` : 'もう一度、月明かりの中へ走り出そう。';
    message.classList.remove('hidden');
}

function update(dt) {
    if (gameState !== 'playing') return;
    const left = pressed('ArrowLeft', 'a', 'A'), right = pressed('ArrowRight', 'd', 'D');
    if (left) { player.vx -= 1050 * dt; player.facing = -1; }
    if (right) { player.vx += 1050 * dt; player.facing = 1; }
    if (!left && !right) player.vx *= Math.pow(.002, dt);
    player.vx = Math.max(-230, Math.min(230, player.vx));
    if (pressed(' ', 'ArrowUp', 'w', 'W') && player.grounded) { player.vy = -450; player.grounded = false; }
    player.vy += 1100 * dt; player.x += player.vx * dt; player.y += player.vy * dt;
    player.x = Math.max(0, Math.min(world.width - player.w, player.x));
    player.grounded = false;
    platforms.forEach(p => {
        if (player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h >= p.y && player.y + player.h <= p.y + 22 && player.vy >= 0) {
            player.y = p.y - player.h; player.vy = 0; player.grounded = true;
        }
    });
    if (player.y > 500) { player.x = Math.max(80, player.x - 220); player.y = 180; player.vy = 0; hurt(); }
    player.attack = Math.max(0, player.attack - dt); player.invincible = Math.max(0, player.invincible - dt);
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        enemy.x += enemy.dir * 28 * dt;
        if (enemy.x < 740 || enemy.x > world.width - 250) enemy.dir *= -1;
        const hitbox = { x: player.x + (player.facing > 0 ? player.w : -34), y: player.y + 7, w: 34, h: 25 };
        if (player.attack > 0 && rectsOverlap(hitbox, enemy)) { enemy.alive = false; score += 200; spawn(enemy.x, enemy.y, '#a889ff'); }
        else if (rectsOverlap(player, enemy)) hurt();
    });
    coins.forEach(coin => {
        if (!coin.collected && Math.hypot(player.x + player.w / 2 - coin.x, player.y + player.h / 2 - coin.y) < 28) {
            coin.collected = true; score += 100; spawn(coin.x, coin.y, '#ffd866');
        }
    });
    if (player.x > goal.x - 35) endGame(true);
    camera += (Math.max(0, player.x - 180) - camera) * Math.min(1, dt * 5);
    particles = particles.filter(p => (p.life -= dt) > 0);
    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt; });
    scoreEl.textContent = String(score).padStart(6, '0');
    livesEl.textContent = '♥ '.repeat(lives).trim() + ' ♡ '.repeat(3 - lives).trim();
    progressEl.style.width = `${Math.min(100, player.x / goal.x * 100)}%`;
}

function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight, scale = h / 430;
    ctx.save(); ctx.scale(scale, scale); const viewW = w / scale;
    const gradient = ctx.createLinearGradient(0, 0, 0, 430); gradient.addColorStop(0, '#f58b60'); gradient.addColorStop(.42, '#b84f68'); gradient.addColorStop(.72, '#543267'); gradient.addColorStop(1, '#242047');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, viewW, 430);
    stars.forEach(star => { ctx.globalAlpha = star.alpha * .45; ctx.fillStyle = '#ffe8a8'; ctx.fillRect((star.x - camera * .08) % (viewW + 80), star.y, star.size, star.size); });
    ctx.globalAlpha = .12; ctx.fillStyle = '#a889ff'; ctx.beginPath(); ctx.arc(viewW - 80, 76, 60, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffd866'; ctx.beginPath(); ctx.arc(viewW - 90, 105, 35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d3d61'; for (let i = 0; i < 16; i++) { const x = i * 430 - camera * .18; ctx.beginPath(); ctx.moveTo(x, 350); ctx.lineTo(x + 180, 155 + (i % 3) * 35); ctx.lineTo(x + 390, 350); ctx.fill(); }
    ctx.fillStyle = '#292044'; for (let i = 0; i < 24; i++) { const x = i * 210 - camera * .32; const height = 28 + (i % 4) * 16; const buildingWidth = 90 + (i % 3) * 20; ctx.fillRect(x, 350 - height, buildingWidth, height); ctx.fillStyle = '#ffcb69'; ctx.globalAlpha = .7; for (let y = 350 - height + 10; y < 342; y += 13) { ctx.fillRect(x + 10, y, 5, 4); if (buildingWidth > 100) ctx.fillRect(x + 32, y, 5, 4); } ctx.fillStyle = '#292044'; ctx.globalAlpha = 1; }
    ctx.save(); ctx.translate(-camera, 0);
    platforms.forEach(p => { ctx.fillStyle = p.h > 20 ? '#56334a' : '#a35a4a'; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = '#ffd866'; ctx.globalAlpha = .9; ctx.fillRect(p.x, p.y, p.w, 3); ctx.globalAlpha = .35; ctx.fillStyle = '#f4a04d'; for (let x = p.x + 15; x < p.x + p.w; x += 35) ctx.fillRect(x, p.y + 14, 14, 3); ctx.globalAlpha = 1; });
    coins.forEach(c => { if (!c.collected) { const bob = Math.sin(performance.now() / 260 + c.x) * 3; ctx.globalAlpha = .18; ctx.fillStyle = '#ffd866'; ctx.beginPath(); ctx.arc(c.x, c.y + bob, 16, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#ffd866'; ctx.beginPath(); ctx.arc(c.x, c.y + bob, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff3af'; ctx.fillRect(c.x - 1, c.y + bob - 5, 2, 10); } });
    enemies.forEach(e => { if (e.alive) { ctx.fillStyle = '#eb5b86'; ctx.beginPath(); ctx.moveTo(e.x, e.y + e.h); ctx.lineTo(e.x + 3, e.y + 7); ctx.lineTo(e.x + 8, e.y); ctx.lineTo(e.x + 14, e.y + 6); ctx.lineTo(e.x + 21, e.y); ctx.lineTo(e.x + e.w, e.y + 8); ctx.lineTo(e.x + e.w, e.y + e.h); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#17182e'; ctx.fillRect(e.x + 5, e.y + 10, 5, 5); ctx.fillRect(e.x + 16, e.y + 10, 5, 5); } });
    ctx.globalAlpha = .18; ctx.fillStyle = '#73e1dc'; ctx.fillRect(goal.x - 8, goal.y - 8, 65, 125); ctx.globalAlpha = 1; ctx.fillStyle = '#73e1dc'; ctx.fillRect(goal.x, goal.y, 5, 110); ctx.fillStyle = '#a889ff'; ctx.beginPath(); ctx.arc(goal.x + 24, goal.y + 10, 24, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.globalAlpha = .65; ctx.beginPath(); ctx.arc(goal.x + 24, goal.y + 10, 13, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    if (!(player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0)) {
        const px = player.x, py = player.y, dir = player.facing;
        ctx.globalAlpha = .28; ctx.fillStyle = '#73e1dc'; ctx.beginPath(); ctx.ellipse(px + 12, py + 41, 20, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.save(); ctx.shadowColor = '#a889ff'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#090c20'; ctx.beginPath();
        ctx.moveTo(px + 5, py + 13); ctx.lineTo(px - dir * 10, py + 23); ctx.lineTo(px - dir * 4, py + 39);
        ctx.lineTo(px + 9, py + 34); ctx.lineTo(px + 19, py + 39); ctx.lineTo(px + 21, py + 14); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#11142c'; ctx.fillRect(px - 2, py + 8, player.w + 4, player.h + 1);
        ctx.fillStyle = '#f4f3ee'; ctx.beginPath(); ctx.moveTo(px + 3, py + 10); ctx.lineTo(px + 21, py + 10); ctx.lineTo(px + 20, py + 33); ctx.lineTo(px + 15, py + 38); ctx.lineTo(px + 7, py + 38); ctx.lineTo(px + 3, py + 33); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a889ff'; ctx.beginPath(); ctx.moveTo(px + 3, py + 2); ctx.lineTo(px + 12, py - 2); ctx.lineTo(px + 21, py + 3); ctx.lineTo(px + 19, py + 15); ctx.lineTo(px + 5, py + 15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#73e1dc'; ctx.fillRect(px + 5, py + 16, 14, 3);
        ctx.fillStyle = '#ffd866'; ctx.fillRect(px + 7, py + 19, 10, 2);
        ctx.fillStyle = '#1a1930'; ctx.fillRect(px + (dir > 0 ? 16 : 4), py + 6, 4, 3);
        ctx.fillStyle = '#a889ff'; ctx.fillRect(px + 4, py + 35, 6, 5); ctx.fillRect(px + 15, py + 35, 6, 5);
        if (Math.abs(player.vx) > 80) { ctx.globalAlpha = .28; ctx.fillStyle = '#73e1dc'; ctx.fillRect(px - dir * 13, py + 15, 8, 3); ctx.fillRect(px - dir * 20, py + 23, 13, 2); ctx.globalAlpha = 1; }
        if (player.attack > 0) { ctx.strokeStyle = '#ffd866'; ctx.lineWidth = 5; ctx.shadowColor = '#ffd866'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(px + player.w / 2 + dir * 18, py + 19, 22, dir > 0 ? -.9 : 2.2, dir > 0 ? .9 : 4); ctx.stroke(); ctx.shadowBlur = 0; }
    }
    particles.forEach(p => { ctx.globalAlpha = p.life * 2; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); ctx.globalAlpha = 1; });
    ctx.restore(); ctx.restore();
}

function loop(time) { const dt = Math.min(.033, (time - lastTime) / 1000 || 0); lastTime = time; update(dt); draw(); requestAnimationFrame(loop); }
reset(); requestAnimationFrame(loop);
