class SuperSurfers {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Game state
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.distance = 0;
        this.combo = 1;
        this.speed = 1;
        this.maxCombo = 1;
        this.powerUpsUsed = 0;
        
        // Game objects
        this.player = null;
        this.obstacles = [];
        this.powerUps = [];
        this.particles = [];
        this.backgrounds = [];
        
        // Power-up states
        this.activePowerUps = {
            jetpack: { active: false, duration: 0, maxDuration: 5000 },
            magnet: { active: false, duration: 0, maxDuration: 8000 },
            shield: { active: false, duration: 0, maxDuration: 10000 },
            multiplier: { active: false, duration: 0, maxDuration: 6000 }
        };
        
        // Game settings
        this.gravity = 0.8;
        this.jumpPower = -15;
        this.slideHeight = 0.3;
        this.obstacleSpeed = 3;
        this.powerUpSpeed = 2;
        this.spawnRate = 0.02;
        this.powerUpSpawnRate = 0.005;
        
        // Environment system
        this.currentEnvironment = 'city';
        this.environments = {
            city: {
                name: 'Urban City',
                background: ['#87CEEB', '#98FB98', '#F0E68C'],
                ground: '#8B4513',
                obstacles: ['barrier', 'hole', 'spike', 'moving'],
                theme: 'urban'
            },
            space: {
                name: 'Space Station',
                background: ['#000011', '#1a0033', '#330066'],
                ground: '#444444',
                obstacles: ['barrier', 'hole', 'spike', 'moving', 'laser'],
                theme: 'space'
            },
            forest: {
                name: 'Mystical Forest',
                background: ['#0d4f3c', '#1a5f4a', '#2d7a5f'],
                ground: '#2d5016',
                obstacles: ['barrier', 'hole', 'spike', 'moving', 'vine'],
                theme: 'nature'
            },
            desert: {
                name: 'Desert Oasis',
                background: ['#f4a460', '#daa520', '#b8860b'],
                ground: '#cd853f',
                obstacles: ['barrier', 'hole', 'spike', 'moving', 'sand'],
                theme: 'desert'
            },
            ocean: {
                name: 'Underwater',
                background: ['#006994', '#0080a3', '#0099cc'],
                ground: '#004d66',
                obstacles: ['barrier', 'hole', 'spike', 'moving', 'bubble'],
                theme: 'ocean'
            }
        };
        this.environmentChangeDistance = 2000;
        
        // Input handling
        this.keys = {};
        this.setupInput();
        
        // Sound system
        this.sounds = {
            jump: this.createSound(200, 'sine', 0.1),
            collect: this.createSound(800, 'square', 0.2),
            powerup: this.createSound(400, 'sawtooth', 0.3),
            crash: this.createSound(150, 'triangle', 0.5),
            background: this.createBackgroundMusic()
        };
        this.soundEnabled = true;
        
        // UI elements
        this.setupUI();
        
        // Start the game loop
        this.gameLoop();
    }
    
    setupCanvas() {
        // Set canvas size based on screen size
        const maxWidth = Math.min(window.innerWidth * 0.9, 800);
        const maxHeight = Math.min(window.innerHeight * 0.9, 600);
        
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
        
        // Game world dimensions
        this.gameWidth = this.canvas.width;
        this.gameHeight = this.canvas.height;
        this.groundY = this.gameHeight - 100;
        this.laneWidth = this.gameWidth / 3;
    }
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.handleInput(e.code);
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            if (this.gameState === 'playing') {
                if (x < this.gameWidth / 3) {
                    this.keys['ArrowLeft'] = true;
                } else if (x > (this.gameWidth * 2) / 3) {
                    this.keys['ArrowRight'] = true;
                } else if (y < this.gameHeight / 2) {
                    this.keys['Space'] = true;
                } else {
                    this.keys['ArrowDown'] = true;
                }
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys = {};
        });
    }
    
    setupUI() {
        // Start screen
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Game over screen
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.showMenu();
        });
        
        // Pause screen
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('restartFromPauseBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('menuFromPauseBtn').addEventListener('click', () => {
            this.showMenu();
        });
    }
    
    handleInput(keyCode) {
        if (this.gameState !== 'playing') return;
        
        switch(keyCode) {
            case 'Space':
                this.player.jump();
                break;
            case 'ArrowDown':
                this.player.slide();
                break;
            case 'ArrowLeft':
                this.player.moveLeft();
                break;
            case 'ArrowRight':
                this.player.moveRight();
                break;
            case 'Escape':
                this.pauseGame();
                break;
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.distance = 0;
        this.combo = 1;
        this.speed = 1;
        this.maxCombo = 1;
        this.powerUpsUsed = 0;
        
        // Reset power-ups
        Object.keys(this.activePowerUps).forEach(key => {
            this.activePowerUps[key].active = false;
            this.activePowerUps[key].duration = 0;
        });
        
        // Clear arrays
        this.obstacles = [];
        this.powerUps = [];
        this.particles = [];
        this.backgrounds = [];
        
        // Create player with customization
        this.player = new Player(this.laneWidth + this.laneWidth / 2, this.groundY - 50, this.getPlayerSkin());
        
        // Create initial backgrounds
        this.createBackgrounds();
        
        this.showScreen('startScreen', false);
        this.updateUI();
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showScreen('pauseScreen', true);
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.showScreen('pauseScreen', false);
        }
    }
    
    showMenu() {
        this.gameState = 'menu';
        this.showScreen('startScreen', true);
        this.showScreen('gameOverScreen', false);
        this.showScreen('pauseScreen', false);
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.updateFinalStats();
        this.showScreen('gameOverScreen', true);
    }
    
    showScreen(screenId, show) {
        const screen = document.getElementById(screenId);
        if (show) {
            screen.classList.remove('hidden');
        } else {
            screen.classList.add('hidden');
        }
    }
    
    updateFinalStats() {
        document.getElementById('finalScore').textContent = this.score.toLocaleString();
        document.getElementById('finalDistance').textContent = Math.floor(this.distance) + 'm';
        document.getElementById('maxCombo').textContent = 'x' + this.maxCombo;
        document.getElementById('powerUpsUsed').textContent = this.powerUpsUsed;
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('distance').textContent = Math.floor(this.distance) + 'm';
        document.getElementById('combo').textContent = 'x' + this.combo;
        document.getElementById('speed').textContent = this.speed.toFixed(1) + 'x';
        
        // Update power-up indicators
        Object.keys(this.activePowerUps).forEach(key => {
            const powerUp = document.getElementById(key);
            const isActive = this.activePowerUps[key].active;
            powerUp.setAttribute('data-active', isActive);
            
            if (isActive) {
                const remaining = Math.ceil((this.activePowerUps[key].maxDuration - this.activePowerUps[key].duration) / 1000);
                powerUp.querySelector('.power-up-timer').textContent = remaining;
            }
        });
    }
    
    createBackgrounds() {
        // Create multiple background layers for parallax effect
        for (let i = 0; i < 3; i++) {
            this.backgrounds.push({
                x: i * this.gameWidth,
                speed: (i + 1) * 0.5,
                height: this.gameHeight,
                color: `hsl(${120 + i * 20}, 70%, ${60 + i * 10}%)`
            });
        }
    }
    
    checkEnvironmentChange() {
        const environmentKeys = Object.keys(this.environments);
        const currentIndex = environmentKeys.indexOf(this.currentEnvironment);
        const nextIndex = (currentIndex + 1) % environmentKeys.length;
        
        if (this.distance > 0 && this.distance % this.environmentChangeDistance < 10) {
            this.currentEnvironment = environmentKeys[nextIndex];
            this.createEnvironmentTransition();
        }
    }
    
    createEnvironmentTransition() {
        // Create transition particles
        for (let i = 0; i < 50; i++) {
            this.particles.push(new Particle(
                Math.random() * this.gameWidth,
                Math.random() * this.gameHeight,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                '#FFFFFF',
                Math.random() * 2000 + 1000
            ));
        }
    }
    
    spawnObstacle() {
        if (Math.random() < this.spawnRate) {
            const lane = Math.floor(Math.random() * 3);
            const x = lane * this.laneWidth + this.laneWidth / 2;
            const env = this.environments[this.currentEnvironment];
            const type = env.obstacles[Math.floor(Math.random() * env.obstacles.length)];
            
            this.obstacles.push(new Obstacle(x, this.groundY, type, this.currentEnvironment));
        }
    }
    
    spawnPowerUp() {
        if (Math.random() < this.powerUpSpawnRate) {
            const lane = Math.floor(Math.random() * 3);
            const x = lane * this.laneWidth + this.laneWidth / 2;
            const types = ['jetpack', 'magnet', 'shield', 'multiplier'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            this.powerUps.push(new PowerUp(x, this.groundY - 30, type));
        }
    }
    
    updatePowerUps() {
        Object.keys(this.activePowerUps).forEach(key => {
            const powerUp = this.activePowerUps[key];
            if (powerUp.active) {
                powerUp.duration += 16; // Assuming 60fps
                if (powerUp.duration >= powerUp.maxDuration) {
                    powerUp.active = false;
                    powerUp.duration = 0;
                }
            }
        });
    }
    
    activatePowerUp(type) {
        this.activePowerUps[type].active = true;
        this.activePowerUps[type].duration = 0;
        this.powerUpsUsed++;
        
        // Create activation effect
        this.createParticleEffect(this.player.x, this.player.y, type);
        this.playSound('powerup');
    }
    
    createParticleEffect(x, y, type) {
        const colors = {
            jetpack: '#FF6B6B',
            magnet: '#4ECDC4',
            shield: '#45B7D1',
            multiplier: '#FFD700'
        };
        
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(
                x, y,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                colors[type] || '#FFFFFF',
                Math.random() * 1000 + 500
            ));
        }
    }
    
    checkCollisions() {
        // Check obstacle collisions
        this.obstacles.forEach((obstacle, index) => {
            if (this.player.checkCollision(obstacle)) {
                if (this.activePowerUps.shield.active) {
                    // Shield absorbs the hit
                    this.obstacles.splice(index, 1);
                    this.createParticleEffect(obstacle.x, obstacle.y, 'shield');
                } else {
                    this.playSound('crash');
                    this.gameOver();
                }
            }
        });
        
        // Check power-up collisions
        this.powerUps.forEach((powerUp, index) => {
            if (this.player.checkCollision(powerUp)) {
                this.activatePowerUp(powerUp.type);
                this.powerUps.splice(index, 1);
                this.score += 100 * this.combo;
                this.playSound('collect');
            }
        });
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update player
        this.player.update();
        
        // Update obstacles
        this.obstacles.forEach((obstacle, index) => {
            obstacle.update();
            if (obstacle.x < -50) {
                this.obstacles.splice(index, 1);
                this.score += 10 * this.combo;
                this.combo = Math.min(this.combo + 0.1, 10);
                this.maxCombo = Math.max(this.maxCombo, this.combo);
            }
        });
        
        // Update power-ups
        this.powerUps.forEach((powerUp, index) => {
            powerUp.update();
            if (powerUp.x < -50) {
                this.powerUps.splice(index, 1);
            }
        });
        
        // Update particles
        this.particles.forEach((particle, index) => {
            particle.update();
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
        
        // Update backgrounds
        this.backgrounds.forEach(background => {
            background.x -= background.speed * this.speed;
            if (background.x <= -this.gameWidth) {
                background.x = this.gameWidth;
            }
        });
        
        // Update power-ups
        this.updatePowerUps();
        
        // Spawn new objects
        this.spawnObstacle();
        this.spawnPowerUp();
        
        // Update game stats
        this.distance += this.speed * 0.1;
        this.speed = Math.min(1 + this.distance / 1000, 5);
        
        // Check for environment change
        this.checkEnvironmentChange();
        
        // Check collisions
        this.checkCollisions();
        
        // Update UI
        this.updateUI();
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
        
        // Draw environment-specific background
        this.drawEnvironmentBackground();
        
        // Draw ground
        const env = this.environments[this.currentEnvironment];
        this.ctx.fillStyle = env.ground;
        this.ctx.fillRect(0, this.groundY, this.gameWidth, this.gameHeight - this.groundY);
        
        // Draw lane dividers
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        for (let i = 1; i < 3; i++) {
            const x = i * this.laneWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.groundY);
            this.ctx.lineTo(x, this.gameHeight);
            this.ctx.stroke();
        }
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => obstacle.render(this.ctx));
        
        // Draw power-ups
        this.powerUps.forEach(powerUp => powerUp.render(this.ctx));
        
        // Draw particles
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // Draw player
        this.player.render(this.ctx);
        
        // Draw power-up effects
        if (this.activePowerUps.jetpack.active) {
            this.drawJetpackEffect();
        }
        if (this.activePowerUps.shield.active) {
            this.drawShieldEffect();
        }
    }
    
    drawJetpackEffect() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.7;
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y + 20, 15, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    drawShieldEffect() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#45B7D1';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, 30, 0, Math.PI * 2);
        this.ctx.stroke();
        this.        ctx.restore();
    }
    
    drawEnvironmentBackground() {
        const env = this.environments[this.currentEnvironment];
        
        // Create gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.gameHeight);
        env.background.forEach((color, index) => {
            gradient.addColorStop(index / (env.background.length - 1), color);
        });
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        
        // Add environment-specific details
        this.drawEnvironmentDetails(env);
    }
    
    drawEnvironmentDetails(env) {
        this.ctx.save();
        
        switch(env.theme) {
            case 'space':
                this.drawStars();
                break;
            case 'nature':
                this.drawTrees();
                break;
            case 'desert':
                this.drawSandDunes();
                break;
            case 'ocean':
                this.drawBubbles();
                break;
            case 'urban':
                this.drawBuildings();
                break;
        }
        
        this.ctx.restore();
    }
    
    drawStars() {
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 100; i++) {
            const x = (i * 37) % this.gameWidth;
            const y = (i * 23) % this.gameHeight;
            const size = Math.random() * 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawTrees() {
        this.ctx.fillStyle = '#8B4513';
        for (let i = 0; i < 5; i++) {
            const x = (i * 150) % this.gameWidth;
            this.ctx.fillRect(x, this.groundY - 80, 20, 80);
            this.ctx.fillStyle = '#228B22';
            this.ctx.beginPath();
            this.ctx.arc(x + 10, this.groundY - 80, 30, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#8B4513';
        }
    }
    
    drawSandDunes() {
        this.ctx.fillStyle = '#D2B48C';
        for (let i = 0; i < 3; i++) {
            const x = (i * 200) % this.gameWidth;
            this.ctx.beginPath();
            this.ctx.arc(x, this.groundY, 100, 0, Math.PI);
            this.ctx.fill();
        }
    }
    
    drawBubbles() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 20; i++) {
            const x = (i * 50) % this.gameWidth;
            const y = (i * 30) % this.gameHeight;
            const size = Math.random() * 10 + 5;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawBuildings() {
        this.ctx.fillStyle = '#696969';
        for (let i = 0; i < 8; i++) {
            const x = (i * 100) % this.gameWidth;
            const height = Math.random() * 100 + 50;
            this.ctx.fillRect(x, this.groundY - height, 80, height);
            
            // Windows
            this.ctx.fillStyle = '#FFD700';
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 4; k++) {
                    if (Math.random() > 0.3) {
                        this.ctx.fillRect(x + 10 + j * 20, this.groundY - height + 10 + k * 15, 10, 8);
                    }
                }
            }
            this.ctx.fillStyle = '#696969';
        }
    }
    
    createSound(frequency, type, duration) {
        return () => {
            if (!this.soundEnabled) return;
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
    }
    
    createBackgroundMusic() {
        return () => {
            if (!this.soundEnabled) return;
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            
            oscillator.start(audioContext.currentTime);
        };
    }
    
    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
    
    getPlayerSkin() {
        // Character customization system
        const skins = [
            { name: 'Classic', color: '#FF6B6B', hat: '🎩' },
            { name: 'Space', color: '#4ECDC4', hat: '🚀' },
            { name: 'Ninja', color: '#2C3E50', hat: '🥷' },
            { name: 'Pirate', color: '#8B4513', hat: '🏴‍☠️' },
            { name: 'Robot', color: '#95A5A6', hat: '🤖' },
            { name: 'Wizard', color: '#9B59B6', hat: '🧙' }
        ];
        
        // Unlock skins based on score milestones
        const unlockedSkins = skins.filter((skin, index) => {
            return index === 0 || this.score >= (index * 10000);
        });
        
        return unlockedSkins[Math.floor(Math.random() * unlockedSkins.length)] || skins[0];
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

class Player {
    constructor(x, y, skin = { name: 'Classic', color: '#FF6B6B', hat: '🎩' }) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.velY = 0;
        this.isJumping = false;
        this.isSliding = false;
        this.lane = 1; // 0, 1, or 2
        this.targetX = x;
        this.animationFrame = 0;
        this.animationSpeed = 0.2;
        this.skin = skin;
        this.trail = [];
        this.maxTrailLength = 10;
    }
    
    jump() {
        if (!this.isJumping && !this.isSliding) {
            this.velY = -15;
            this.isJumping = true;
            // Play jump sound
            if (window.game && window.game.playSound) {
                window.game.playSound('jump');
            }
        }
    }
    
    slide() {
        if (!this.isJumping && !this.isSliding) {
            this.isSliding = true;
            this.height = 20;
            setTimeout(() => {
                this.isSliding = false;
                this.height = 50;
            }, 1000);
        }
    }
    
    moveLeft() {
        if (this.lane > 0) {
            this.lane--;
            this.targetX = this.lane * (800 / 3) + (800 / 3) / 2;
        }
    }
    
    moveRight() {
        if (this.lane < 2) {
            this.lane++;
            this.targetX = this.lane * (800 / 3) + (800 / 3) / 2;
        }
    }
    
    update() {
        // Add to trail
        this.trail.push({ x: this.x, y: this.y, life: 1.0 });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Update trail
        this.trail.forEach(point => {
            point.life -= 0.1;
        });
        this.trail = this.trail.filter(point => point.life > 0);
        
        // Apply gravity
        this.velY += 0.8;
        this.y += this.velY;
        
        // Check ground collision
        if (this.y >= 500) {
            this.y = 500;
            this.velY = 0;
            this.isJumping = false;
        }
        
        // Smooth lane movement
        const dx = this.targetX - this.x;
        this.x += dx * 0.2;
        
        // Update animation
        this.animationFrame += this.animationSpeed;
        if (this.animationFrame >= 4) {
            this.animationFrame = 0;
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // Draw trail
        this.trail.forEach((point, index) => {
            ctx.globalAlpha = point.life * 0.3;
            ctx.fillStyle = this.skin.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5 * point.life, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Draw player body
        ctx.fillStyle = this.skin.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height, this.width, this.height);
        
        // Draw head
        ctx.fillStyle = '#FFDBAC';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height - 15, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - this.height - 18, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - this.height - 18, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw hat/accessory
        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.skin.hat, this.x, this.y - this.height - 25);
        
        // Draw running animation
        if (!this.isJumping && !this.isSliding) {
            const legOffset = Math.sin(this.animationFrame * Math.PI) * 3;
            ctx.fillStyle = this.skin.color;
            ctx.fillRect(this.x - 8, this.y - 10, 4, 15 + legOffset);
            ctx.fillRect(this.x + 4, this.y - 10, 4, 15 - legOffset);
        }
        
        // Add glow effect
        ctx.shadowColor = this.skin.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.skin.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height, this.width, this.height);
        
        ctx.restore();
    }
    
    checkCollision(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }
}

class Obstacle {
    constructor(x, y, type, environment = 'city') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.environment = environment;
        this.width = 40;
        this.height = 60;
        this.speed = 3;
        
        // Set properties based on type and environment
        this.setAppearance(type, environment);
    }
    
    setAppearance(type, environment) {
        const themes = {
            city: {
                barrier: { height: 80, color: '#8B4513', icon: '🚧' },
                hole: { height: 20, color: '#000', icon: '🕳️' },
                spike: { height: 40, color: '#FF0000', icon: '⚡' },
                moving: { height: 50, color: '#FFA500', icon: '🚗' }
            },
            space: {
                barrier: { height: 80, color: '#444444', icon: '🚧' },
                hole: { height: 20, color: '#000', icon: '🕳️' },
                spike: { height: 40, color: '#FF0000', icon: '⚡' },
                moving: { height: 50, color: '#FFA500', icon: '🚀' },
                laser: { height: 30, color: '#FF00FF', icon: '💥' }
            },
            nature: {
                barrier: { height: 80, color: '#8B4513', icon: '🌳' },
                hole: { height: 20, color: '#000', icon: '🕳️' },
                spike: { height: 40, color: '#FF0000', icon: '⚡' },
                moving: { height: 50, color: '#FFA500', icon: '🐻' },
                vine: { height: 60, color: '#228B22', icon: '🌿' }
            },
            desert: {
                barrier: { height: 80, color: '#8B4513', icon: '🏜️' },
                hole: { height: 20, color: '#000', icon: '🕳️' },
                spike: { height: 40, color: '#FF0000', icon: '⚡' },
                moving: { height: 50, color: '#FFA500', icon: '🐪' },
                sand: { height: 30, color: '#D2B48C', icon: '🌪️' }
            },
            ocean: {
                barrier: { height: 80, color: '#8B4513', icon: '🪨' },
                hole: { height: 20, color: '#000', icon: '🕳️' },
                spike: { height: 40, color: '#FF0000', icon: '⚡' },
                moving: { height: 50, color: '#FFA500', icon: '🦈' },
                bubble: { height: 25, color: '#87CEEB', icon: '💧' }
            }
        };
        
        const theme = themes[environment] || themes.city;
        const obstacle = theme[type] || theme.barrier;
        
        this.height = obstacle.height;
        this.color = obstacle.color;
        this.icon = obstacle.icon;
        
        if (type === 'moving') {
            this.moveDirection = Math.random() > 0.5 ? 1 : -1;
        }
    }
    
    update() {
        this.x -= this.speed;
        
        if (this.type === 'moving') {
            this.x += this.moveDirection * 0.5;
            if (this.x < 50 || this.x > 750) {
                this.moveDirection *= -1;
            }
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // Draw obstacle base
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y - this.height, this.width, this.height);
        
        // Draw icon
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x + this.width/2, this.y - this.height/2);
        
        // Special rendering for certain types
        if (this.type === 'spike') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.width/2, this.y - this.height);
            ctx.lineTo(this.x + this.width, this.y);
            ctx.closePath();
            ctx.fill();
        }
        
        // Add glow effect for special obstacles
        if (['laser', 'bubble', 'sand'].includes(this.type)) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y - this.height, this.width, this.height);
        }
        
        ctx.restore();
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 30;
        this.height = 30;
        this.speed = 2;
        this.rotation = 0;
        this.bobOffset = 0;
        
        this.colors = {
            jetpack: '#FF6B6B',
            magnet: '#4ECDC4',
            shield: '#45B7D1',
            multiplier: '#FFD700'
        };
        
        this.icons = {
            jetpack: '🚀',
            magnet: '🧲',
            shield: '🛡️',
            multiplier: '⚡'
        };
    }
    
    update() {
        this.x -= this.speed;
        this.rotation += 0.1;
        this.bobOffset = Math.sin(Date.now() * 0.005) * 5;
    }
    
    render(ctx) {
        ctx.save();
        
        // Draw glow effect
        ctx.shadowColor = this.colors[this.type];
        ctx.shadowBlur = 20;
        
        // Draw power-up
        ctx.translate(this.x + this.width/2, this.y + this.height/2 + this.bobOffset);
        ctx.rotate(this.rotation);
        
        ctx.fillStyle = this.colors[this.type];
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Draw icon
        ctx.fillStyle = '#FFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icons[this.type], 0, 0);
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, velX, velY, color, life) {
        this.x = x;
        this.y = y;
        this.velX = velX;
        this.velY = velY;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 4 + 2;
    }
    
    update() {
        this.x += this.velX;
        this.y += this.velY;
        this.velY += 0.1; // gravity
        this.life -= 16;
        this.velX *= 0.99; // friction
        this.velY *= 0.99;
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new SuperSurfers();
});