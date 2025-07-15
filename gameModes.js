// Base class for all game modes
class GameMode {
    constructor(gameState, gameConfig, CONTAINER_WIDTH, CONTAINER_HEIGHT) {
        this.gameState = gameState;
        this.gameConfig = gameConfig;
        this.CONTAINER_WIDTH = CONTAINER_WIDTH;
        this.CONTAINER_HEIGHT = CONTAINER_HEIGHT;
    }

    // Methods to be overridden by subclasses
    initialize() {
        throw new Error("initialize() must be implemented by subclass");
    }

    reset() {
        throw new Error("reset() must be implemented by subclass");
    }

    update() {
        throw new Error("update() must be implemented by subclass");
    }

    handleBallLoss(ballIndex, losingPlayer) {
        throw new Error("handleBallLoss() must be implemented by subclass");
    }

    checkGameOver() {
        throw new Error("checkGameOver() must be implemented by subclass");
    }

    getScoreDisplay() {
        return `${this.gameState.leftScore} : ${this.gameState.rightScore}`;
    }
}

// PvP Mode
class PvPMode extends GameMode {
    initialize() {
        // Hide second ball
        this.gameState.balls[1].element.style.display = 'none';
        this.gameState.balls[1].active = false;
        
        // Show right paddle
        paddleRight.style.display = 'block';
        
        // Clear bricks
        clearBricks();
        
        // Clear solo mode UI elements
        this.clearSoloUI();
    }
    
    clearSoloUI() {
        const leftScore = document.getElementById('score-left');
        const rightScore = document.getElementById('score-right');
        if (leftScore) leftScore.textContent = '';
        if (rightScore) rightScore.textContent = '';
    }

    reset() {
        // Single ball mode
        this.gameState.balls[1].active = false;
        this.gameState.balls[1].element.style.display = 'none';
        
        // Reset ball position
        const startFromLeft = Math.random() > 0.5;
        setBallStartPosition(this.gameState.balls[0], startFromLeft ? 'left' : 'right');
    }

    update() {
        // Standard PvP update logic is handled in main game loop
    }

    handleBallLoss(ballIndex, losingPlayer) {
        if (losingPlayer === 'left') {
            this.gameState.rightScore++;
        } else {
            this.gameState.leftScore++;
        }
        
        updateScore();
        
        if (this.checkGameOver()) {
            return;
        }
        
        // Deactivate the ball
        const ball = this.gameState.balls[ballIndex];
        ball.active = false;
        ball.element.style.display = 'none';
        
        // Start countdown for new ball
        const activeBalls = this.gameState.balls.filter(b => b.active);
        if (activeBalls.length < 2) {
            const ballsTowardLoser = activeBalls.filter(b => 
                (losingPlayer === 'left' && b.speedX < 0) || 
                (losingPlayer === 'right' && b.speedX > 0)
            );
            
            if (ballsTowardLoser.length === 0) {
                startBallCountdown(ballIndex, losingPlayer);
            }
        }
    }

    checkGameOver() {
        if (this.gameState.leftScore >= this.gameConfig.maxScore) {
            gameOver("Player 1");
            return true;
        } else if (this.gameState.rightScore >= this.gameConfig.maxScore) {
            gameOver("Player 2");
            return true;
        }
        return false;
    }
}

// PvAI Mode
class PvAIMode extends GameMode {
    initialize() {
        // Same as PvP but with AI
        this.gameState.balls[1].element.style.display = 'none';
        this.gameState.balls[1].active = false;
        
        paddleRight.style.display = 'block';
        clearBricks();
        
        // Clear solo mode UI elements
        this.clearSoloUI();
    }
    
    clearSoloUI() {
        const leftScore = document.getElementById('score-left');
        const rightScore = document.getElementById('score-right');
        if (leftScore) leftScore.textContent = '';
        if (rightScore) rightScore.textContent = '';
    }

    reset() {
        // Single ball mode, always starts from player
        this.gameState.balls[1].active = false;
        this.gameState.balls[1].element.style.display = 'none';
        
        setBallStartPosition(this.gameState.balls[0], 'left');
    }

    update() {
        // AI update is handled in updatePaddles()
    }

    handleBallLoss(ballIndex, losingPlayer) {
        // Same as PvP
        PvPMode.prototype.handleBallLoss.call(this, ballIndex, losingPlayer);
    }

    checkGameOver() {
        if (this.gameState.leftScore >= this.gameConfig.maxScore) {
            gameOver("Player 1");
            return true;
        } else if (this.gameState.rightScore >= this.gameConfig.maxScore) {
            gameOver("AI");
            return true;
        }
        return false;
    }
}

// Brick Mode (1 player with AI)
class BrickMode extends GameMode {
    initialize() {
        // Two balls, bricks
        paddleRight.style.display = 'block';
        ball2.style.display = 'block';
        this.gameState.balls[1].active = true;
        createBricks();
        
        // Clear solo mode UI elements
        this.clearSoloUI();
    }
    
    clearSoloUI() {
        const leftScore = document.getElementById('score-left');
        const rightScore = document.getElementById('score-right');
        if (leftScore) leftScore.textContent = '';
        if (rightScore) rightScore.textContent = '';
    }

    reset() {
        // Both brick modes: each ball starts from its respective paddle
        setBallStartPosition(this.gameState.balls[0], 'left');
        setBallStartPosition(this.gameState.balls[1], 'right');
        
        // Reset bricks if needed
        if (this.gameState.bricksRemaining === 0) {
            createBricks();
        }
    }

    update() {
        // Brick collision is handled in updateBalls()
    }

    handleBallLoss(ballIndex, losingPlayer) {
        // Award point to opposite player
        if (losingPlayer === 'left') {
            this.gameState.rightScore++;
        } else {
            this.gameState.leftScore++;
        }
        
        updateScore();
        handleBrickModeballLoss(ballIndex, losingPlayer);
    }

    checkGameOver() {
        // Game over is checked when all bricks are destroyed
        return false;
    }
}

// Brick Mode 2 Players
class Brick2PMode extends BrickMode {
    checkGameOver() {
        // Game over is checked when all bricks are destroyed
        return false;
    }
}

// Solo Adventure Mode
class SoloMode extends GameMode {
    constructor(gameState, gameConfig, CONTAINER_WIDTH, CONTAINER_HEIGHT) {
        super(gameState, gameConfig, CONTAINER_WIDTH, CONTAINER_HEIGHT);
        this.currentLevel = 1;
        this.totalScore = 0;
        this.levelPatterns = ['circle', 'square', 'diamond', 'heart', 'spiral', 'triangle', 'hexagon'];
        this.transitionInProgress = false;
        this.levelScore = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.ballsLost = 0; // Track balls lost instead of lives
        
        // Load high score
        this.highScore = parseInt(localStorage.getItem('pongSoloHighScore') || '0');
    }

    initialize() {
        // Hide right paddle in solo mode
        paddleRight.style.display = 'none';
        
        // Single ball
        this.gameState.balls[1].element.style.display = 'none';
        this.gameState.balls[1].active = false;
        
        // Generate first level
        this.generateLevel();
        
        // Update UI for solo mode
        this.updateSoloUI();
    }

    reset() {
        // Reset ball to center-left
        const ball = this.gameState.balls[0];
        ball.x = 100;
        ball.y = this.CONTAINER_HEIGHT / 2;
        ball.speedX = BASE_BALL_SPEED;
        ball.speedY = generateRandomBallSpeed();
        ball.owner = 'left';
        ball.active = true;
        
        // Reset level score and combo
        this.levelScore = 0;
        this.combo = 0;
    }

    generateLevel() {
        clearBricks();
        this.gameState.bricks = [];
        this.gameState.bricksRemaining = 0;
        
        // Choose pattern based on level
        const patternIndex = (this.currentLevel - 1) % this.levelPatterns.length;
        const pattern = this.levelPatterns[patternIndex];
        const difficulty = Math.floor((this.currentLevel - 1) / this.levelPatterns.length) + 1;
        
        switch(pattern) {
            case 'circle':
                this.generateCirclePattern(difficulty);
                break;
            case 'square':
                this.generateSquarePattern(difficulty);
                break;
            case 'diamond':
                this.generateDiamondPattern(difficulty);
                break;
            case 'heart':
                this.generateHeartPattern(difficulty);
                break;
            case 'spiral':
                this.generateSpiralPattern(difficulty);
                break;
            case 'triangle':
                this.generateTrianglePattern(difficulty);
                break;
            case 'hexagon':
                this.generateHexagonPattern(difficulty);
                break;
        }
    }

    generateCirclePattern(difficulty) {
        const centerX = this.CONTAINER_WIDTH / 2;
        const centerY = this.CONTAINER_HEIGHT / 2;
        const maxRadius = Math.min(this.CONTAINER_WIDTH, this.CONTAINER_HEIGHT) * 0.35;
        const layers = 3 + Math.floor(difficulty / 2);
        
        for (let layer = 0; layer < layers; layer++) {
            const radius = maxRadius * (1 - layer / layers);
            const bricksInLayer = Math.floor(2 * Math.PI * radius / (BRICK_WIDTH + BRICK_PADDING));
            const angleStep = (2 * Math.PI) / bricksInLayer;
            
            for (let i = 0; i < bricksInLayer; i++) {
                const angle = i * angleStep;
                const x = centerX + radius * Math.cos(angle) - BRICK_WIDTH / 2;
                const y = centerY + radius * Math.sin(angle) - BRICK_HEIGHT / 2;
                
                // Health based on layer (outer = easier, inner = harder)
                const health = layer + 1 + Math.floor(difficulty / 3);
                const isIndestructible = layer === layers - 1 && difficulty > 3 && Math.random() < 0.2;
                
                this.createBrick(x, y, health, isIndestructible, i / bricksInLayer);
            }
        }
    }

    generateSquarePattern(difficulty) {
        const centerX = this.CONTAINER_WIDTH / 2;
        const centerY = this.CONTAINER_HEIGHT / 2;
        const maxSize = Math.min(this.CONTAINER_WIDTH, this.CONTAINER_HEIGHT) * 0.7;
        const layers = 3 + Math.floor(difficulty / 2);
        
        for (let layer = 0; layer < layers; layer++) {
            const size = maxSize * (1 - layer / layers);
            const bricksPerSide = Math.floor(size / (BRICK_WIDTH + BRICK_PADDING));
            
            for (let side = 0; side < 4; side++) {
                for (let i = 0; i < bricksPerSide; i++) {
                    let x, y;
                    const offset = i * (BRICK_WIDTH + BRICK_PADDING) - size / 2;
                    
                    switch(side) {
                        case 0: // Top
                            x = centerX + offset;
                            y = centerY - size / 2;
                            break;
                        case 1: // Right
                            x = centerX + size / 2 - BRICK_WIDTH;
                            y = centerY + offset;
                            break;
                        case 2: // Bottom
                            x = centerX - offset - BRICK_WIDTH;
                            y = centerY + size / 2 - BRICK_HEIGHT;
                            break;
                        case 3: // Left
                            x = centerX - size / 2;
                            y = centerY - offset - BRICK_HEIGHT;
                            break;
                    }
                    
                    const health = layer + 1 + Math.floor(difficulty / 3);
                    const isIndestructible = layer === layers - 1 && difficulty > 3 && Math.random() < 0.15;
                    
                    this.createBrick(x, y, health, isIndestructible, (side * bricksPerSide + i) / (4 * bricksPerSide));
                }
            }
        }
    }

    generateDiamondPattern(difficulty) {
        const centerX = this.CONTAINER_WIDTH / 2;
        const centerY = this.CONTAINER_HEIGHT / 2;
        const rows = 7 + difficulty;
        
        for (let row = 0; row < rows; row++) {
            const halfRows = rows / 2;
            const bricksInRow = row < halfRows ? row + 1 : rows - row;
            const rowWidth = bricksInRow * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
            
            for (let col = 0; col < bricksInRow; col++) {
                const x = centerX - rowWidth / 2 + col * (BRICK_WIDTH + BRICK_PADDING);
                const y = centerY - rows * (BRICK_HEIGHT + BRICK_PADDING) / 2 + row * (BRICK_HEIGHT + BRICK_PADDING);
                
                const distFromCenter = Math.abs(row - halfRows) + Math.abs(col - bricksInRow / 2);
                const health = Math.max(1, Math.floor(distFromCenter / 2) + 1);
                const isIndestructible = health > 4 && difficulty > 3 && Math.random() < 0.1;
                
                this.createBrick(x, y, health, isIndestructible, col / bricksInRow);
            }
        }
    }

    generateHeartPattern(difficulty) {
        const centerX = this.CONTAINER_WIDTH / 2;
        const centerY = this.CONTAINER_HEIGHT / 2;
        const scale = Math.min(this.CONTAINER_WIDTH, this.CONTAINER_HEIGHT) * 0.015;
        
        // Heart shape equation points
        const points = [];
        for (let t = 0; t < 2 * Math.PI; t += 0.1) {
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
            points.push({x: centerX + x * scale, y: centerY + y * scale});
        }
        
        // Fill heart with bricks
        const gridSize = BRICK_WIDTH + BRICK_PADDING;
        const bounds = this.getBounds(points);
        
        for (let x = bounds.minX; x <= bounds.maxX; x += gridSize) {
            for (let y = bounds.minY; y <= bounds.maxY; y += gridSize) {
                if (this.isPointInPolygon({x: x + BRICK_WIDTH/2, y: y + BRICK_HEIGHT/2}, points)) {
                    const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                    const health = Math.max(1, Math.floor(distFromCenter / (scale * 10)) + difficulty);
                    const isIndestructible = health > 5 && difficulty > 4 && Math.random() < 0.1;
                    
                    this.createBrick(x, y, Math.min(health, 10), isIndestructible, distFromCenter / (scale * 20));
                }
            }
        }
    }

    generateSpiralPattern(difficulty) {
        const centerX = this.CONTAINER_WIDTH / 2;
        const centerY = this.CONTAINER_HEIGHT / 2;
        const maxRadius = Math.min(this.CONTAINER_WIDTH, this.CONTAINER_HEIGHT) * 0.35;
        const spirals = 2 + Math.floor(difficulty / 3);
        const pointsPerSpiral = 15 + difficulty * 3;
        
        for (let spiral = 0; spiral < spirals; spiral++) {
            const angleOffset = (2 * Math.PI / spirals) * spiral;
            
            for (let i = 0; i < pointsPerSpiral; i++) {
                const t = i / pointsPerSpiral;
                const angle = angleOffset + t * 4 * Math.PI;
                const radius = maxRadius * t;
                
                const x = centerX + radius * Math.cos(angle) - BRICK_WIDTH / 2;
                const y = centerY + radius * Math.sin(angle) - BRICK_HEIGHT / 2;
                
                const health = Math.max(1, Math.floor(t * 5) + difficulty);
                const isIndestructible = health > 6 && difficulty > 4 && Math.random() < 0.05;
                
                this.createBrick(x, y, Math.min(health, 10), isIndestructible, t);
            }
        }
    }

    generateTrianglePattern(difficulty) {
        const centerX = this.CONTAINER_WIDTH / 2;
        const baseY = this.CONTAINER_HEIGHT * 0.7;
        const height = this.CONTAINER_HEIGHT * 0.5;
        const rows = 6 + difficulty;
        
        for (let row = 0; row < rows; row++) {
            const bricksInRow = row + 1;
            const rowWidth = bricksInRow * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
            const y = baseY - (row / rows) * height;
            
            for (let col = 0; col < bricksInRow; col++) {
                const x = centerX - rowWidth / 2 + col * (BRICK_WIDTH + BRICK_PADDING);
                
                const health = rows - row + Math.floor(difficulty / 2);
                const isIndestructible = health > 7 && difficulty > 5 && Math.random() < 0.1;
                
                this.createBrick(x, y, Math.min(health, 10), isIndestructible, col / bricksInRow);
            }
        }
    }

    generateHexagonPattern(difficulty) {
        const centerX = this.CONTAINER_WIDTH / 2;
        const centerY = this.CONTAINER_HEIGHT / 2;
        const size = Math.min(this.CONTAINER_WIDTH, this.CONTAINER_HEIGHT) * 0.35;
        const layers = 3 + Math.floor(difficulty / 3);
        
        for (let layer = 0; layer < layers; layer++) {
            const layerSize = size * (1 - layer / layers);
            
            for (let side = 0; side < 6; side++) {
                const angle1 = (Math.PI / 3) * side;
                const angle2 = (Math.PI / 3) * (side + 1);
                
                const bricksOnSide = Math.floor(layerSize / (BRICK_WIDTH + BRICK_PADDING));
                
                for (let i = 0; i < bricksOnSide; i++) {
                    const t = i / bricksOnSide;
                    const x = centerX + layerSize * (Math.cos(angle1) * (1-t) + Math.cos(angle2) * t) - BRICK_WIDTH / 2;
                    const y = centerY + layerSize * (Math.sin(angle1) * (1-t) + Math.sin(angle2) * t) - BRICK_HEIGHT / 2;
                    
                    const health = layer + 1 + difficulty;
                    const isIndestructible = layer === layers - 1 && difficulty > 4 && Math.random() < 0.15;
                    
                    this.createBrick(x, y, Math.min(health, 10), isIndestructible, (side * bricksOnSide + i) / (6 * bricksOnSide));
                }
            }
        }
    }

    createBrick(x, y, health, isIndestructible, colorIndex) {
        const brick = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const brickId = `brick-solo-${Date.now()}-${Math.random()}`;
        brick.setAttribute("id", brickId);
        
        // Main brick rectangle
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", BRICK_WIDTH);
        rect.setAttribute("height", BRICK_HEIGHT);
        
        if (isIndestructible) {
            rect.setAttribute("fill", "#333");
            rect.setAttribute("stroke", "#666");
        } else {
            const hue = colorIndex * 360;
            const lightness = 50 - (health - 1) * 5; // Darker = more health
            rect.setAttribute("fill", `hsl(${hue}, 70%, ${lightness}%)`);
            rect.setAttribute("stroke", "white");
        }
        
        rect.setAttribute("stroke-width", "2");
        brick.appendChild(rect);
        
        // Health text
        if (!isIndestructible && health > 1) {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x + BRICK_WIDTH / 2);
            text.setAttribute("y", y + BRICK_HEIGHT / 2 + 5);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", "16");
            text.setAttribute("fill", "white");
            text.setAttribute("font-weight", "bold");
            text.textContent = health;
            brick.appendChild(text);
        }
        
        // Indestructible symbol
        if (isIndestructible) {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x + BRICK_WIDTH / 2);
            text.setAttribute("y", y + BRICK_HEIGHT / 2 + 5);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", "20");
            text.setAttribute("fill", "#999");
            text.textContent = "∞";
            brick.appendChild(text);
        }
        
        bricksContainer.appendChild(brick);
        
        const brickData = {
            element: brick,
            rect: rect,
            x: x,
            y: y,
            width: BRICK_WIDTH,
            height: BRICK_HEIGHT,
            destroyed: false,
            health: health,
            maxHealth: health,
            isIndestructible: isIndestructible
        };
        
        this.gameState.bricks.push(brickData);
        
        if (!isIndestructible) {
            this.gameState.bricksRemaining++;
        }
    }

    getBounds(points) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const p of points) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }
        
        return {minX, maxX, minY, maxY};
    }

    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    update() {
        // Handle right wall collision for solo mode - ball should bounce
        for (let i = 0; i < this.gameState.balls.length; i++) {
            const ball = this.gameState.balls[i];
            if (!ball.active) continue;
            
            // Right wall collision - bounce back
            if (ball.x + BALL_RADIUS >= this.CONTAINER_WIDTH && ball.speedX > 0) {
                ball.speedX *= -1;
                ball.x = this.CONTAINER_WIDTH - BALL_RADIUS;
            }
        }
        
        // Check for brick collisions with special handling for health
        for (let i = 0; i < this.gameState.balls.length; i++) {
            const ball = this.gameState.balls[i];
            if (!ball.active) continue;
            
            const nextBallX = ball.x + ball.speedX;
            const nextBallY = ball.y + ball.speedY;
            
            for (let brick of this.gameState.bricks) {
                if (!brick.destroyed && !brick.isIndestructible) {
                    if (nextBallX + BALL_RADIUS >= brick.x &&
                        nextBallX - BALL_RADIUS <= brick.x + brick.width &&
                        nextBallY + BALL_RADIUS >= brick.y &&
                        nextBallY - BALL_RADIUS <= brick.y + brick.height) {
                        
                        // Handle collision
                        this.handleBrickHit(brick, ball, i);
                        
                        // Bounce ball
                        const ballCenterX = ball.x;
                        const ballCenterY = ball.y;
                        const brickCenterX = brick.x + brick.width / 2;
                        const brickCenterY = brick.y + brick.height / 2;
                        
                        const dx = ballCenterX - brickCenterX;
                        const dy = ballCenterY - brickCenterY;
                        
                        const overlapX = (brick.width / 2 + BALL_RADIUS) - Math.abs(dx);
                        const overlapY = (brick.height / 2 + BALL_RADIUS) - Math.abs(dy);
                        
                        if (overlapX < overlapY) {
                            ball.speedX *= -1;
                            if (dx < 0) {
                                ball.x = brick.x - BALL_RADIUS;
                            } else {
                                ball.x = brick.x + brick.width + BALL_RADIUS;
                            }
                        } else {
                            ball.speedY *= -1;
                            if (dy < 0) {
                                ball.y = brick.y - BALL_RADIUS;
                            } else {
                                ball.y = brick.y + brick.height + BALL_RADIUS;
                            }
                        }
                        
                        break; // Only handle one collision per frame
                    }
                }
            }
        }
    }

    handleBrickHit(brick, ball, ballIndex) {
        if (brick.isIndestructible) return;
        
        // Check for explosive ball
        const explosiveInfo = this.gameState.explosiveBalls[ballIndex];
        if (explosiveInfo) {
            // Explosive hit
            const brickCenterX = brick.x + brick.width / 2;
            const brickCenterY = brick.y + brick.height / 2;
            this.explodeBricksSolo(brickCenterX, brickCenterY, 60);
        } else {
            // Normal hit
            brick.health--;
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            
            if (brick.health <= 0) {
                // Brick destroyed
                brick.destroyed = true;
                brick.element.style.display = 'none';
                this.gameState.bricksRemaining--;
                
                // Score calculation
                const baseScore = 10 * brick.maxHealth;
                const comboBonus = this.combo * 5;
                const levelBonus = this.currentLevel * 2;
                const score = baseScore + comboBonus + levelBonus;
                
                this.levelScore += score;
                this.totalScore += score;
                
                // Chance for bonus (doubled in solo mode)
                if (Math.random() < 0.3) {
                    generateBonus(brick.x + brick.width / 2, brick.y + brick.height / 2, 'left');
                }
                
                // Check level complete
                if (this.gameState.bricksRemaining === 0) {
                    this.completeLevel();
                }
            } else {
                // Update brick appearance
                const hue = 0; // Red for damaged
                const lightness = 50 - (brick.health - 1) * 5;
                brick.rect.setAttribute("fill", `hsl(${hue}, 70%, ${lightness}%)`);
                
                // Update health text
                const text = brick.element.querySelector('text');
                if (text) {
                    text.textContent = brick.health;
                }
                
                // Small score for hit
                const hitScore = 5 * this.currentLevel;
                this.levelScore += hitScore;
                this.totalScore += hitScore;
            }
            
            updateScore();
        }
    }

    explodeBricksSolo(centerX, centerY, radius) {
        createExplosionAnimation(centerX, centerY);
        
        const bricksToDestroy = [];
        
        for (let brick of this.gameState.bricks) {
            if (!brick.destroyed && !brick.isIndestructible) {
                const brickCenterX = brick.x + brick.width / 2;
                const brickCenterY = brick.y + brick.height / 2;
                const distance = Math.sqrt(
                    Math.pow(brickCenterX - centerX, 2) + 
                    Math.pow(brickCenterY - centerY, 2)
                );
                
                if (distance <= radius) {
                    bricksToDestroy.push(brick);
                }
            }
        }
        
        // Destroy all bricks in radius
        bricksToDestroy.forEach(brick => {
            brick.destroyed = true;
            brick.element.style.display = 'none';
            this.gameState.bricksRemaining--;
            
            // Score for each destroyed brick
            const baseScore = 10 * brick.maxHealth;
            const explosionBonus = 20;
            this.levelScore += baseScore + explosionBonus;
            this.totalScore += baseScore + explosionBonus;
        });
        
        if (bricksToDestroy.length > 0) {
            updateScore();
            
            if (this.gameState.bricksRemaining === 0) {
                this.completeLevel();
            }
        }
    }

    completeLevel() {
        if (this.transitionInProgress) return;
        this.transitionInProgress = true;
        
        // Level complete bonus
        const completionBonus = 100 * this.currentLevel;
        const comboBonus = this.maxCombo * 10;
        this.totalScore += completionBonus + comboBonus;
        
        // Save high score
        if (this.totalScore > this.highScore) {
            this.highScore = this.totalScore;
            localStorage.setItem('pongSoloHighScore', this.highScore.toString());
        }
        
        // Show level complete
        this.showLevelTransition();
    }

    showLevelTransition() {
        // Create transition overlay
        const overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
        overlay.setAttribute("id", "level-transition");
        
        // Background
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("x", "0");
        bg.setAttribute("y", "0");
        bg.setAttribute("width", this.CONTAINER_WIDTH);
        bg.setAttribute("height", this.CONTAINER_HEIGHT);
        bg.setAttribute("fill", "black");
        bg.setAttribute("opacity", "0.8");
        overlay.appendChild(bg);
        
        // Level complete text
        const completeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        completeText.setAttribute("x", this.CONTAINER_WIDTH / 2);
        completeText.setAttribute("y", this.CONTAINER_HEIGHT / 2 - 60);
        completeText.setAttribute("text-anchor", "middle");
        completeText.setAttribute("font-size", "48");
        completeText.setAttribute("fill", "#4CAF50");
        completeText.setAttribute("font-weight", "bold");
        completeText.textContent = `Level ${this.currentLevel} Complete!`;
        overlay.appendChild(completeText);
        
        // Score text
        const scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        scoreText.setAttribute("x", this.CONTAINER_WIDTH / 2);
        scoreText.setAttribute("y", this.CONTAINER_HEIGHT / 2);
        scoreText.setAttribute("text-anchor", "middle");
        scoreText.setAttribute("font-size", "24");
        scoreText.setAttribute("fill", "white");
        scoreText.textContent = `Score: ${this.totalScore}`;
        overlay.appendChild(scoreText);
        
        // Max combo text
        const comboText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        comboText.setAttribute("x", this.CONTAINER_WIDTH / 2);
        comboText.setAttribute("y", this.CONTAINER_HEIGHT / 2 + 30);
        comboText.setAttribute("text-anchor", "middle");
        comboText.setAttribute("font-size", "20");
        comboText.setAttribute("fill", "#FFD700");
        comboText.textContent = `Max Combo: ${this.maxCombo}x`;
        overlay.appendChild(comboText);
        
        document.getElementById('game-svg').appendChild(overlay);
        
        // Pause game
        this.gameState.gameRunning = false;
        
        // Start countdown for next level
        setTimeout(() => {
            this.startNextLevelCountdown();
        }, 2000);
    }

    startNextLevelCountdown() {
        const overlay = document.getElementById('level-transition');
        if (overlay) overlay.remove();
        
        // Create countdown
        const countdownGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        countdownGroup.setAttribute("id", "level-countdown");
        
        const countdownText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        countdownText.setAttribute("x", this.CONTAINER_WIDTH / 2);
        countdownText.setAttribute("y", this.CONTAINER_HEIGHT / 2);
        countdownText.setAttribute("text-anchor", "middle");
        countdownText.setAttribute("font-size", "72");
        countdownText.setAttribute("fill", "white");
        countdownText.setAttribute("font-weight", "bold");
        
        countdownGroup.appendChild(countdownText);
        document.getElementById('game-svg').appendChild(countdownGroup);
        
        let count = 3;
        const countInterval = setInterval(() => {
            if (count > 0) {
                countdownText.textContent = count;
                count--;
            } else {
                clearInterval(countInterval);
                countdownGroup.remove();
                this.startNextLevel();
            }
        }, 1000);
    }

    startNextLevel() {
        this.currentLevel++;
        this.levelScore = 0;
        this.maxCombo = 0;
        this.transitionInProgress = false;
        
        // Generate new level
        this.generateLevel();
        
        // Reset ball
        this.reset();
        
        // Update UI
        this.updateSoloUI();
        
        // Resume game
        this.gameState.gameRunning = true;
        gameLoop();
    }

    handleBallLoss(ballIndex, losingPlayer) {
        // In solo mode, only left side (player) can lose the ball
        if (losingPlayer === 'left') {
            this.ballsLost++;
            this.combo = 0; // Reset combo
            
            updateScore();
            this.updateSoloUI();
            
            // Check if player can't recover (no balls left and level incomplete)
            const activeBalls = this.gameState.balls.filter(b => b.active);
            if (activeBalls.length === 0 && this.gameState.bricksRemaining > 0) {
                // Player loses the ball but can try again
                const ball = this.gameState.balls[ballIndex];
                ball.active = false;
                ball.element.style.display = 'none';
                
                // Give player a chance to recover - respawn after short delay
                setTimeout(() => {
                    this.respawnBall(ballIndex);
                }, 1000);
            }
        }
        // Right side collisions are handled in update() method with wall bounce
    }
    
    respawnBall(ballIndex) {
        const ball = this.gameState.balls[ballIndex];
        ball.x = 100;
        ball.y = this.CONTAINER_HEIGHT / 2;
        ball.speedX = BASE_BALL_SPEED;
        ball.speedY = generateRandomBallSpeed();
        ball.owner = 'left';
        ball.active = true;
        ball.element.style.display = 'block';
        setBallPosition(ball.element, ball.x, ball.y);
    }

    gameOver() {
        // Save high score
        if (this.totalScore > this.highScore) {
            this.highScore = this.totalScore;
            localStorage.setItem('pongSoloHighScore', this.highScore.toString());
        }
        
        gameOver(`Level ${this.currentLevel} Reached!`);
    }

    checkGameOver() {
        // In solo mode, game only ends when player chooses to quit
        // or when there's a special condition (could be added later)
        return false;
    }

    updateSoloUI() {
        // Update score display
        const leftScore = document.getElementById('score-left');
        const rightScore = document.getElementById('score-right');
        
        if (leftScore) {
            leftScore.textContent = `Balls Lost: ${this.ballsLost}`;
        }
        
        if (rightScore) {
            rightScore.textContent = `Level: ${this.currentLevel}`;
        }
    }

    getScoreDisplay() {
        return `Score: ${this.totalScore} | High: ${this.highScore}`;
    }
}

// Export the mode classes
window.GameMode = GameMode;
window.PvPMode = PvPMode;
window.PvAIMode = PvAIMode;
window.BrickMode = BrickMode;
window.Brick2PMode = Brick2PMode;
window.SoloMode = SoloMode;