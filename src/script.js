window.addEventListener("load", function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("scoreEl");
  const metersEl = document.getElementById("metersEl");
  const startGameEl = document.getElementById("startGameEl");
  const startGameBtn = document.getElementById("startGameBtn");
  const restartGameEl = document.getElementById("restartGameEl");
  const restartGameBtn = document.getElementById("restartGameBtn");
  const backToLobbyBtn = document.getElementById("backToLobbyBtn");
  const highScoreEl = document.getElementById("highScoreEl");
  const bestMetersEl = document.getElementById("bestMetersEl");

  // Mobile 9:16 portrait optimization
  function resize() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const targetRatio = 9 / 16;
    
    let width, height;
    if (vw / vh > targetRatio) {
      height = vh;
      width = vh * targetRatio;
    } else {
      width = vw;
      height = vw / targetRatio;
    }
    
    canvas.width = 720; // Internal resolution
    canvas.height = 1280;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    
    // Ensure overlays and controls match the canvas size
    const overlayWidth = width + "px";
    const overlayHeight = height + "px";
    const controls = document.getElementById('gameControls');
    if (controls) {
      controls.style.width = overlayWidth;
      controls.style.height = overlayHeight;
      controls.style.left = canvas.offsetLeft + "px";
      controls.style.top = canvas.offsetTop + "px";
    }

    if (startGameEl) {
      const startDiv = startGameEl.querySelector('div');
      if (startDiv) {
        startDiv.style.width = "100%";
        startDiv.style.height = "100%";
      }
      startGameEl.style.width = overlayWidth;
      startGameEl.style.height = overlayHeight;
    }
    if (restartGameEl) {
      const restartDiv = restartGameEl.querySelector('div');
      if (restartDiv) {
        restartDiv.style.width = "100%";
        restartDiv.style.height = "100%";
      }
      restartGameEl.style.width = overlayWidth;
      restartGameEl.style.height = overlayHeight;
    }
  }
  window.addEventListener("resize", resize);
  resize();

  const CANVAS_WIDTH = 720;
  const CANVAS_HEIGHT = 1280;

  const backgroundMusic = new Audio();

  let score = 0;
  let metersTraveled = 0;
  let bestDistance = parseInt(localStorage.getItem('highwayRacerBestDistance')) || 0;
  let highScore = parseInt(localStorage.getItem('highwayRacerHighScore')) || 0;
  let selectedRoad = 'background';
  let selectedCar = 'car1';
  let playerBaseSpeed = 250;
  let drops = [];
  let explosions = [];
  let enemies = [];
  let boosterActive = 0; // Timer for booster effect
  const enemyTypes = [
    "car",
    "taxi",
    "audi",
    "truck",
    "police",
    "minivan",
    "ambulance",
    "minitruck",
  ];

  class InputHandler {
    constructor() {
      this.codes = [];
      this.touchX = 0;
      this.touchY = 0;

      window.addEventListener("keydown", ({ code }) => {
        if (!this.codes.includes(code)) this.codes.push(code);
      });
      window.addEventListener("keyup", ({ code }) => {
        this.codes.splice(this.codes.indexOf(code), 1);
      });

      // Mobile Touch Controls
      canvas.addEventListener("touchstart", (e) => {
        if (gameOver) return;
        const touch = e.touches[0];
        this.touchX = touch.clientX;
        this.touchY = touch.clientY;
        
        // Jump mechanic on touch
        player.jump();
      });

      canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - this.touchX;
        const dy = touch.clientY - this.touchY;
        
        player.pos.x += dx * 1.5;
        player.pos.y += dy * 1.5;
        
        this.touchX = touch.clientX;
        this.touchY = touch.clientY;
      }, { passive: false });

      startGameBtn.addEventListener("click", () => {
        startGameEl.style.display = "none";
        backgroundMusic.play().catch(() => {});
        init();
      });
      restartGameBtn.addEventListener("click", () => {
        restartGameEl.style.display = "none";
        init();
      });

      backToLobbyBtn.addEventListener("click", () => {
        restartGameEl.style.display = "none";
        startGameEl.style.display = "flex";
      });

      // On-screen controls
      const buttons = {
        'btnUp': 'KeyW',
        'btnDown': 'KeyS',
        'btnLeft': 'KeyA',
        'btnRight': 'KeyD'
      };

      Object.entries(buttons).forEach(([id, code]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        
        const handleStart = (e) => {
          e.preventDefault();
          // We use the button ID as a virtual key code
          if (!this.codes.includes(id)) this.codes.push(id);
        };
        const handleEnd = (e) => {
          e.preventDefault();
          const index = this.codes.indexOf(id);
          if (index > -1) this.codes.splice(index, 1);
        };

        btn.addEventListener('touchstart', handleStart);
        btn.addEventListener('touchend', handleEnd);
        btn.addEventListener('mousedown', handleStart);
        btn.addEventListener('mouseup', handleEnd);
        btn.addEventListener('mouseleave', handleEnd);
      });

      const jumpBtn = document.getElementById('btnJump');
      if (jumpBtn) {
        const handleJump = (e) => {
          e.preventDefault();
          player.jump();
        };
        jumpBtn.addEventListener('touchstart', handleJump);
        jumpBtn.addEventListener('mousedown', handleJump);
      }
    }
  }

  class Background {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.width = CANVAS_WIDTH;
      this.height = CANVAS_HEIGHT;
      this.updateImage();
    }
    updateImage() {
      this.image = document.getElementById(selectedRoad);
    }
    update() {
      this.y += gameSpeed;
      if (this.y >= this.height) this.y = 0;
      this.draw();
    }
    draw() {
      ctx.drawImage(this.image, 0, this.y, this.width, this.height);
      ctx.drawImage(this.image, 0, this.y - this.height, this.width, this.height);
    }
  }

  class Player {
    constructor() {
      this.maxFuel = 100;
      this.fuel = this.maxFuel;
      this.fuelDecrement = 0.05;
      this.maxHealth = 100;
      this.health = this.maxHealth;
      this.width = 80;
      this.height = 140;
      this.pos = {
        x: CANVAS_WIDTH * 0.5 - this.width * 0.5,
        y: CANVAS_HEIGHT * 0.8,
      };
      this.z = 0; // For jumping height
      this.vz = 0;
      this.gravity = 0.6;
      this.jumpTimer = 0;
      this.jumpCooldown = 0; // 10 seconds cooldown
      this.maxJumpCooldown = 600; // ~10 seconds at 60fps
      
      this.hitbox = { x: 0, y: 0, width: 60, height: 120 };
      this.image = document.getElementById("player");
    }
    update() {
      this.handleInput();
      this.applyPhysics();
      this.handleBoundaries();
      this.updateHitbox();
      this.fuel -= this.fuelDecrement;
      if (this.jumpCooldown > 0) this.jumpCooldown--;
      this.draw();
    }
    handleInput() {
      // Keyboard Movement
      if (input.codes.includes('KeyW') || input.codes.includes('ArrowUp')) this.pos.y -= 5;
      if (input.codes.includes('KeyS') || input.codes.includes('ArrowDown')) this.pos.y += 5;
      if (input.codes.includes('KeyA') || input.codes.includes('ArrowLeft')) this.pos.x -= 7;
      if (input.codes.includes('KeyD') || input.codes.includes('ArrowRight')) this.pos.x += 7;
      
      // On-screen D-pad logic (held buttons)
      if (input.codes.includes('btnUp')) this.pos.y -= 5;
      if (input.codes.includes('btnDown')) this.pos.y += 5;
      if (input.codes.includes('btnLeft')) this.pos.x -= 7;
      if (input.codes.includes('btnRight')) this.pos.x += 7;
    }
    applyPhysics() {
      // Gravity and Jumping
      if (this.z > 0 || this.vz !== 0) {
        this.vz -= this.gravity;
        this.z += this.vz;
        if (this.z < 0) {
          this.z = 0;
          this.vz = 0;
        }
      }
    }
    jump() {
      if (this.z === 0 && this.jumpCooldown <= 0) {
        this.vz = 15;
        this.jumpCooldown = this.maxJumpCooldown;
        console.log("Jump activated, cooldown set to:", this.jumpCooldown);
      } else {
        console.log("Jump blocked. z:", this.z, "cooldown:", this.jumpCooldown);
      }
    }
    updateHitbox() {
      this.hitbox.x = this.pos.x + 10;
      this.hitbox.y = this.pos.y + 10;
    }
    handleBoundaries() {
      const margin = 20;
      if (this.pos.x < margin) this.pos.x = margin;
      if (this.pos.x > CANVAS_WIDTH - this.width - margin) this.pos.x = CANVAS_WIDTH - this.width - margin;
      if (this.pos.y < CANVAS_HEIGHT * 0.2) this.pos.y = CANVAS_HEIGHT * 0.2;
      if (this.pos.y > CANVAS_HEIGHT - this.height - margin) this.pos.y = CANVAS_HEIGHT - this.height - margin;
    }
    draw() {
      ctx.save();
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(this.pos.x + this.width/2, this.pos.y + this.height - 10, 30 + this.z/5, 15 + this.z/10, 0, 0, Math.PI*2);
      ctx.fill();
      
      // Scale based on height (z)
      const scale = 1 + this.z / 500;
      const dw = this.width * scale;
      const dh = this.height * scale;
      ctx.drawImage(this.image, this.pos.x - (dw - this.width)/2, this.pos.y - this.z - (dh - this.height)/2, dw, dh);
      ctx.restore();
    }
  }

  class StatusBar {
    constructor(x, y, text, color) {
      this.x = x;
      this.y = y;
      this.width = 150;
      this.height = 15;
      this.text = text;
      this.color = color;
    }
    draw(value, max) {
      const pct = Math.max(0, value / max);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width * pct, this.height);
      ctx.fillStyle = "white";
      ctx.font = "bold 16px Arial";
      ctx.fillText(this.text, this.x, this.y - 5);
    }
  }

  class Enemy {
    constructor(image) {
      this.width = 80;
      this.height = 140;
      this.x = Math.random() * (CANVAS_WIDTH - 150) + 50;
      this.y = -200;
      this.speed = Math.random() * 3 + 4;
      this.image = image;
      this.hitbox = { x: 0, y: 0, width: 60, height: 120 };
    }
    update() {
      this.y += this.speed + gameSpeed/2;
      this.hitbox.x = this.x + 10;
      this.hitbox.y = this.y + 10;
      this.draw();
    }
    draw() {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
  }

  class Explosion {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.frame = 0;
      this.maxFrame = 10;
      this.timer = 0;
    }
    update() {
      this.timer++;
      if (this.timer % 3 === 0) this.frame++;
      this.draw();
    }
    draw() {
      const img = document.getElementById("explosion");
      ctx.drawImage(img, this.frame * 96, 0, 96, 96, this.x - 50, this.y - 50, 150, 150);
    }
  }

  class FuelDrop {
    constructor() {
      this.width = 60;
      this.height = 60;
      this.x = Math.random() * (CANVAS_WIDTH - 100) + 50;
      this.y = -100;
      this.speed = gameSpeed;
      this.image = document.getElementById("gasCan");
      this.hitbox = { x: 0, y: 0, width: 40, height: 40 };
      this.amount = Math.random() > 0.5 ? 30 : 10;
    }
    update() {
      this.y += this.speed;
      this.hitbox.x = this.x + 10;
      this.hitbox.y = this.y + 10;
      this.draw();
    }
    draw() {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
      // Optional: draw text for amount
      ctx.fillStyle = "white";
      ctx.font = "bold 14px Arial";
      ctx.fillText(`+${this.amount}%`, this.x + 5, this.y - 5);
    }
  }

  class BoosterDrop {
    constructor() {
      this.width = 70;
      this.height = 70;
      this.x = Math.random() * (CANVAS_WIDTH - 100) + 50;
      this.y = -100;
      this.speed = gameSpeed;
      this.image = document.getElementById("health"); // Reusing health sprite for booster or placeholder
      this.hitbox = { x: 0, y: 0, width: 50, height: 50 };
    }
    update() {
      this.y += this.speed;
      this.hitbox.x = this.x + 10;
      this.hitbox.y = this.y + 10;
      this.draw();
    }
    draw() {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = "cyan";
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
      ctx.fillStyle = "cyan";
      ctx.font = "bold 14px Arial";
      ctx.fillText("BOOST", this.x + 5, this.y - 5);
      ctx.restore();
    }
  }

  class HealthDrop {
    constructor() {
      this.width = 60;
      this.height = 60;
      this.x = Math.random() * (CANVAS_WIDTH - 100) + 50;
      this.y = -100;
      this.speed = gameSpeed;
      this.image = document.getElementById("health");
      this.hitbox = { x: 0, y: 0, width: 40, height: 40 };
      this.amount = 25;
    }
    update() {
      this.y += this.speed;
      this.hitbox.x = this.x + 10;
      this.hitbox.y = this.y + 10;
      this.draw();
    }
    draw() {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
      ctx.fillStyle = "#ff4444";
      ctx.font = "bold 14px Arial";
      ctx.fillText(`+${this.amount}HP`, this.x + 5, this.y - 5);
    }
  }

  function checkCollision(a, b) {
    if (player.z > 20) return false; // Can jump over things
    return a.hitbox.x < b.hitbox.x + b.hitbox.width &&
           a.hitbox.x + a.hitbox.width > b.hitbox.x &&
           a.hitbox.y < b.hitbox.y + b.hitbox.height &&
           a.hitbox.y + a.hitbox.height > b.hitbox.y;
  }

  function init() {
    score = 0;
    metersTraveled = 0;
    enemies = [];
    drops = [];
    explosions = [];
    player.health = 100;
    player.fuel = 100;
    player.pos.x = CANVAS_WIDTH/2 - player.width/2;
    player.pos.y = CANVAS_HEIGHT * 0.8;
    gameOver = false;
    gameSpeed = playerBaseSpeed / 30; // Scale base speed
    boosterActive = 0;
    document.getElementById('gameControls').style.display = 'block';
    animate(0);
  }

  const player = new Player();
  const input = new InputHandler();
  const background = new Background();
  
  function updateRoadButtons() {
    console.log("Updating road buttons. Best distance:", bestDistance);
    document.querySelectorAll('.road-btn').forEach(btn => {
      const distance = parseInt(btn.dataset.distance) || 0;
      const road = btn.dataset.road;
      
      if (bestDistance >= distance) {
        btn.dataset.unlocked = "true";
        btn.classList.remove('text-gray-500', 'bg-[#1a1a2e]/50', 'opacity-60', 'border-white/5');
        btn.classList.add('text-white', 'bg-[#1a1a2e]', 'cursor-pointer', 'border-white/10');
        btn.innerHTML = `<span class="relative z-10 font-black italic tracking-tighter text-sm">${road.toUpperCase()}</span>`;
        if (road === 'default') btn.querySelector('span').innerText = 'HIGHWAY';
      } else {
        btn.dataset.unlocked = "false";
        btn.classList.add('text-gray-500', 'bg-[#1a1a2e]/50', 'opacity-60', 'border-white/5');
        btn.classList.remove('text-white', 'bg-[#1a1a2e]', 'cursor-pointer', 'border-emerald-500', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
        btn.innerHTML = `<span class="relative z-10 font-bold opacity-30 text-[10px]">${road.toUpperCase()} (${distance}m)</span>`;
      }
    });

    // Update Car Buttons based on High Score
    document.querySelectorAll('.car-btn').forEach(btn => {
      const unlockScore = parseInt(btn.dataset.unlock) || 0;
      const img = btn.querySelector('img');
      const lockOverlay = btn.querySelector('div.absolute');
      
      if (highScore >= unlockScore) {
        btn.dataset.unlocked = "true";
        btn.classList.remove('opacity-60', 'border-white/5', 'bg-[#1a1a2e]/50');
        btn.classList.add('opacity-100', 'bg-[#1a1a2e]');
        if (img) img.classList.remove('grayscale');
        if (lockOverlay && lockOverlay.querySelector('span')) lockOverlay.classList.add('hidden');
      } else {
        btn.dataset.unlocked = "false";
        btn.classList.add('opacity-60', 'border-white/5', 'bg-[#1a1a2e]/50');
        if (img) img.classList.add('grayscale');
        if (lockOverlay) lockOverlay.classList.remove('hidden');
      }
    });
  }

  document.querySelectorAll('.car-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.unlocked === "true") {
        document.querySelectorAll('.car-btn').forEach(b => {
          b.classList.remove('border-emerald-500', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
          b.classList.add('border-white/5');
        });
        btn.classList.remove('border-white/5');
        btn.classList.add('border-emerald-500', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
        selectedCar = btn.dataset.car;
        playerBaseSpeed = parseInt(btn.dataset.speed);
        player.image.src = `public/Cars/${selectedCar}.png`;
      }
    });
  });

  document.querySelectorAll('.road-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.unlocked === "true") {
        document.querySelectorAll('.road-btn').forEach(b => {
          b.classList.remove('border-emerald-500', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
          b.classList.add('border-white/10');
        });
        btn.classList.remove('border-white/10');
        btn.classList.add('border-emerald-500', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
        selectedRoad = btn.dataset.road === 'default' ? 'background' : 'road_' + btn.dataset.road;
        background.updateImage();
      }
    });
  });

  updateRoadButtons();

  const healthBar = new StatusBar(20, 40, "HEALTH", "#ff4444");
  const fuelBar = new StatusBar(CANVAS_WIDTH - 170, 40, "FUEL", "#ffcc00");

  // --- Three.js 3D Car Preview ---
  let scene, camera, renderer, carModel;
  function initThreeJs() {
    const container = document.getElementById('threeJsCanvas');
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    const loader = new THREE.GLTFLoader();
    loader.load('public/Models/car.glb', (gltf) => {
      carModel = gltf.scene;
      scene.add(carModel);
      carModel.scale.set(1.5, 1.5, 1.5);
      carModel.rotation.y = Math.PI / 4;
    }, undefined, (error) => {
      console.error('Error loading 3D model:', error);
    });

    function animateThree() {
      requestAnimationFrame(animateThree);
      if (carModel) {
        carModel.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    }
    animateThree();
  }

  // Import Three.js GLTFLoader
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/three@0.160.0/examples/js/loaders/GLTFLoader.js';
  script.onload = () => {
    initThreeJs();
  };
  document.head.appendChild(script);

  // --- Lobby Tab Logic ---
  const tabTrack = document.getElementById('tabTrack');
  const tabCar = document.getElementById('tabCar');
  const panelTrack = document.getElementById('panelTrack');
  const panelCar = document.getElementById('panelCar');

  function showPanel(panel) {
    panelTrack.classList.add('hidden');
    panelCar.classList.add('hidden');
    tabTrack.classList.remove('border-emerald-500/50');
    tabCar.classList.remove('border-emerald-500/50');

    panel.classList.remove('hidden');
    if (panel === panelTrack) tabTrack.classList.add('border-emerald-500/50');
    if (panel === panelCar) tabCar.classList.add('border-emerald-500/50');
  }

  tabTrack.addEventListener('click', () => showPanel(panelTrack));
  tabCar.addEventListener('click', () => showPanel(panelCar));

  let lastTime = 0;
  let gameSpeed = 8; // Increased from 5
  let gameOver = false;
  let enemyTimer = 0;

  function animate(timestamp) {
    const deltaTime = timestamp - lastTime || 0;
    if (lastTime === 0) {
      lastTime = timestamp;
      if (!gameOver) requestAnimationFrame(animate);
      return;
    }
    lastTime = timestamp;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    background.update();

    if (boosterActive > 0) {
      boosterActive--;
      gameSpeed = 25; // Increased from 15
      // Visual feedback for boosting
      ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      if (gameSpeed > 20) gameSpeed = 10; // Reset after booster
    }

    // Spawn enemies
    enemyTimer += deltaTime || 0;
    if (enemyTimer > 800) { // Reduced from 1000 for more enemies
      const id = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const img = document.getElementById(id);
      if (img) {
        enemies.push(new Enemy(img));
      }
      enemyTimer = 0;
    }

    // Spawn Drops
    if (Math.random() < 0.007) drops.push(new FuelDrop()); // Increased spawn rates
    if (Math.random() < 0.003) drops.push(new BoosterDrop());
    if (Math.random() < 0.004) drops.push(new HealthDrop());

    enemies = enemies.filter(e => e.y < CANVAS_HEIGHT + 200);
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemy.update();
      if (checkCollision(player, enemy)) {
        if (boosterActive > 0) {
          // Smash enemies while boosting!
          explosions.push(new Explosion(enemy.x + 40, enemy.y + 70));
          enemies.splice(i, 1);
          score += 100; // Increased bonus points
        } else {
          player.health -= 20;
          explosions.push(new Explosion(enemy.x + 40, enemy.y + 70));
          enemies.splice(i, 1);
        }
      }
    }

    drops = drops.filter(d => d.y < CANVAS_HEIGHT + 100);
    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i];
      drop.update();
      if (checkCollision(player, drop)) {
        if (drop instanceof FuelDrop) {
          player.fuel = Math.min(100, player.fuel + drop.amount);
        } else if (drop instanceof BoosterDrop) {
          boosterActive = 420; // Increased duration to ~7 seconds
        } else if (drop instanceof HealthDrop) {
          player.health = Math.min(100, player.health + drop.amount);
        }
        drops.splice(i, 1);
      }
    }

    explosions = explosions.filter(e => e.frame < e.maxFrame);
    explosions.forEach(e => e.update());

    // Progressive Speed Increase
    gameSpeed += 0.001; // Increased acceleration from 0.0005

    player.update();
    healthBar.draw(player.health, 100);
    fuelBar.draw(player.fuel, 100);

    // Speed Meter & Jump Cooldown
    ctx.fillStyle = "white";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`SPEED: ${Math.round(gameSpeed * 10)} KM/H`, 20, 80);
    ctx.fillText(`DISTANCE: ${Math.floor(metersTraveled)} M`, 20, 105);
    
    // Debug info on screen
    // ctx.fillText(`Z: ${Math.round(player.z)} CD: ${player.jumpCooldown}`, 20, 130);
    
    const jumpReady = player.jumpCooldown <= 0;
    ctx.fillStyle = jumpReady ? "#44ff44" : "#ff4444";
    const cooldownSec = Math.ceil(player.jumpCooldown / 60);
    ctx.fillText(jumpReady ? "JUMP READY" : `JUMP IN: ${cooldownSec}S`, 20, 130);
    
    // Progress bar for jump cooldown
    if (!jumpReady) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(20, 140, 150, 5);
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(20, 140, 150 * (player.jumpCooldown / player.maxJumpCooldown), 5);
    }

    // Score
    score += Math.floor(gameSpeed / 5);
    metersTraveled += 1;
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`SCORE: ${score}`, CANVAS_WIDTH/2, 40);

    if (player.health <= 0 || player.fuel <= 0) {
      gameOver = true;
      const finalDistance = Math.floor(metersTraveled);
      if (finalDistance > bestDistance) {
        bestDistance = finalDistance;
        localStorage.setItem('highwayRacerBestDistance', bestDistance);
        console.log("New record! Best distance saved:", bestDistance);
      }
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('highwayRacerHighScore', highScore);
      }
      updateRoadButtons();
      scoreEl.innerText = score;
      metersEl.innerText = finalDistance;
      highScoreEl.innerText = highScore;
      bestMetersEl.innerText = bestDistance;
      restartGameEl.style.display = "flex";
      document.getElementById('gameControls').style.display = 'none';
      return;
    }

    if (!gameOver) requestAnimationFrame(animate);
  }
});