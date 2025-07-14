// DOM Elements
const configScreen = document.getElementById("config-screen");
const gameContainer = document.getElementById("game-container");
const gameOverScreen = document.getElementById("game-over-screen");
const paddleLeft = document.getElementById("paddle-left");
const paddleRight = document.getElementById("paddle-right");
const ball = document.getElementById("ball");
const ball2 = document.getElementById("ball2");
const scoreboard = document.getElementById("scoreboard");
const startButton = document.getElementById("start-button");
const difficultySection = document.getElementById("difficulty-section");
const p2ControlsSection = document.getElementById("p2-controls-section");
const maxScoreSection = document.getElementById("max-score-section");
const bricksContainer = document.getElementById("bricks-container");
const playAgainButton = document.getElementById("play-again");
const backToMenuButton = document.getElementById("back-to-menu");
const winnerText = document.getElementById("winner-text");
const finalScoreText = document.getElementById("final-score");
const fieldWidthSelect = document.getElementById("field-width");
const backgroundPreview = document.getElementById("background-preview");
const bonusesContainer = document.getElementById("bonuses-container");
const lasersContainer = document.getElementById("lasers-container");

// Constants
const CONTAINER_HEIGHT = 400;
let CONTAINER_WIDTH = 800;
const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_RADIUS = 6;
const BASE_PADDLE_SPEED = 6;
const BASE_BALL_SPEED = 4;
const BRICK_WIDTH = 20;
const BRICK_HEIGHT = 45;
const BRICK_ROWS = 6;
const BRICK_PADDING = 5;

// Game Configuration
let gameConfig = {
    mode: 'pvp', // 'pvp', 'pvai', or 'brick'
    difficulty: 3,
    maxScore: 10,
    fieldWidth: 800,
    p1Keys: {
        up: 'a',
        down: 'q'
    },
    p2Keys: {
        up: 'arrowup',
        down: 'arrowdown'
    }
};

// AI Configuration by difficulty level
const AI_CONFIG = {
    1: { speed: 2, reactionTime: 300, errorChance: 0.3, predictionAccuracy: 0.3 },
    2: { speed: 3, reactionTime: 200, errorChance: 0.2, predictionAccuracy: 0.5 },
    3: { speed: 4, reactionTime: 150, errorChance: 0.1, predictionAccuracy: 0.7 },
    4: { speed: 5, reactionTime: 100, errorChance: 0.05, predictionAccuracy: 0.85 },
    5: { speed: 6, reactionTime: 50, errorChance: 0.02, predictionAccuracy: 0.95 }
};

// Bonus Types
const BONUS_TYPES = {
    BIG_PADDLE: 'big_paddle',
    MULTI_BALL: 'multi_ball', 
    LASER_PADDLE: 'laser_paddle',
    SLOW_BALL: 'slow_ball',
    STICKY_PADDLE: 'sticky_paddle'
};

// Game State
let gameState = {
    leftScore: 0,
    rightScore: 0,
    keysPressed: {},
    balls: [
        {
            x: 400,
            y: 200,
            speedX: BASE_BALL_SPEED,
            speedY: 3,
            owner: null, // 'left' or 'right' - last paddle that touched this ball
            active: true,
            element: ball
        },
        {
            x: 400,
            y: 200,
            speedX: -BASE_BALL_SPEED,
            speedY: -3,
            owner: null,
            active: false,
            element: ball2
        }
    ],
    paddleLeftY: 160,
    paddleRightY: 160,
    lastAIUpdate: 0,
    aiTargetY: 200,
    gameRunning: false,
    countdowns: {}, // For ball respawn countdowns
    frozenPaddles: {}, // For freezing paddles during countdown
    stickyBalls: {}, // For balls stuck to paddles
    bricks: [],
    bricksRemaining: 0,
    bonuses: [],
    activeEffects: {
        left: {},
        right: {}
    },
    effectDisplays: {
        left: [],
        right: []
    },
    lasers: []
};

// Configuration event listeners
document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'pvai') {
            difficultySection.style.display = 'block';
            p2ControlsSection.style.display = 'none';
            maxScoreSection.style.display = 'block';
        } else if (e.target.value === 'brick') {
            difficultySection.style.display = 'block';
            p2ControlsSection.style.display = 'none';
            maxScoreSection.style.display = 'none';
        } else if (e.target.value === 'brick2p') {
            difficultySection.style.display = 'none';
            p2ControlsSection.style.display = 'block';
            maxScoreSection.style.display = 'none';
        } else {
            difficultySection.style.display = 'none';
            p2ControlsSection.style.display = 'block';
            maxScoreSection.style.display = 'block';
        }
    });
});

// Field width preview
fieldWidthSelect.addEventListener('change', updateFieldPreview);

function updateFieldPreview() {
    const width = parseInt(fieldWidthSelect.value);
    
    // Update background preview to real size
    backgroundPreview.style.width = `${width}px`;
    
    // Show number of bricks that will be generated
    const availableWidth = width - 350;
    const brickCols = Math.floor(availableWidth / (BRICK_WIDTH + BRICK_PADDING));
    const totalBricks = brickCols * BRICK_ROWS;
    
    // Update preview label
    const label = document.querySelector('label[for="field-width"]');
    if (label) {
        label.textContent = `Field Width (${totalBricks} bricks in practice mode):`;
    }
}

// Initialize preview
updateFieldPreview();

startButton.addEventListener('click', startGame);
playAgainButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    resetGame();
    gameState.gameRunning = true;
    gameLoop();
});
backToMenuButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    gameContainer.classList.add('hidden');
    configScreen.classList.remove('hidden');
    backgroundPreview.classList.remove('hidden');
    gameState.gameRunning = false;
});

// Keyboard event listeners
document.addEventListener("keydown", (e) => {
    if (gameState.gameRunning) {
        gameState.keysPressed[e.key.toLowerCase()] = true;
        
        // Release sticky balls with spacebar
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            Object.keys(gameState.stickyBalls).forEach(ballIndex => {
                const ball = gameState.balls[parseInt(ballIndex)];
                const stickyInfo = gameState.stickyBalls[ballIndex];
                
                // Release ball with appropriate direction
                if (stickyInfo.player === 'left') {
                    ball.speedX = BASE_BALL_SPEED;
                } else {
                    ball.speedX = -BASE_BALL_SPEED;
                }
                ball.speedY = (Math.random() - 0.5) * 4;
                
                delete gameState.stickyBalls[ballIndex];
            });
        }
    }
});

document.addEventListener("keyup", (e) => {
    gameState.keysPressed[e.key.toLowerCase()] = false;
});

function startGame() {
    // Get configuration values
    gameConfig.mode = document.querySelector('input[name="gameMode"]:checked').value;
    gameConfig.difficulty = parseInt(document.getElementById('difficulty').value);
    gameConfig.maxScore = parseInt(document.getElementById('max-score').value);
    gameConfig.fieldWidth = parseInt(document.getElementById('field-width').value);
    gameConfig.p1Keys.up = document.getElementById('p1-up').value.toLowerCase();
    gameConfig.p1Keys.down = document.getElementById('p1-down').value.toLowerCase();
    
    // Update game dimensions
    CONTAINER_WIDTH = gameConfig.fieldWidth;
    gameContainer.style.width = `${CONTAINER_WIDTH}px`;
    document.getElementById('game-svg').setAttribute('viewBox', `0 0 ${CONTAINER_WIDTH} ${CONTAINER_HEIGHT}`);
    
    // Update middle line
    const middleLine = document.querySelector('#game-svg line');
    middleLine.setAttribute('x1', CONTAINER_WIDTH / 2);
    middleLine.setAttribute('x2', CONTAINER_WIDTH / 2);
    
    // Update right paddle position
    paddleRight.setAttribute("x", CONTAINER_WIDTH - 20);
    
    // Hide config screen and background preview, show game
    configScreen.classList.add('hidden');
    backgroundPreview.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    // Setup game based on mode
    if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
        // Both brick modes: 2 balls, bricks, same rules
        paddleRight.style.display = 'block';
        ball2.style.display = 'block';
        gameState.balls[1].active = true;
        createBricks();
    } else {
        // Standard pong modes: 1 ball, no bricks
        paddleRight.style.display = 'block';
        ball2.style.display = 'none';
        gameState.balls[1].active = false;
        clearBricks();
    }
    
    // Initialize game state
    resetGame();
    gameState.gameRunning = true;
    
    // Start game loop
    gameLoop();
}

function createBricks() {
    clearBricks();
    gameState.bricks = [];
    gameState.bricksRemaining = 0;
    
    // Calculate brick columns dynamically based on field width
    const availableWidth = CONTAINER_WIDTH - 350; // Leave more space for paddles and reaction time
    const brickCols = Math.floor(availableWidth / (BRICK_WIDTH + BRICK_PADDING));
    
    const totalBricksWidth = brickCols * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
    const totalBricksHeight = BRICK_ROWS * (BRICK_HEIGHT + BRICK_PADDING) - BRICK_PADDING;
    
    const startX = (CONTAINER_WIDTH - totalBricksWidth) / 2;
    const startY = (CONTAINER_HEIGHT - totalBricksHeight) / 2;
    
    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < brickCols; col++) {
            const x = startX + col * (BRICK_WIDTH + BRICK_PADDING);
            const y = startY + row * (BRICK_HEIGHT + BRICK_PADDING);
            
            const brick = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            brick.setAttribute("x", x);
            brick.setAttribute("y", y);
            brick.setAttribute("width", BRICK_WIDTH);
            brick.setAttribute("height", BRICK_HEIGHT);
            brick.setAttribute("fill", `hsl(${col * (360 / brickCols)}, 70%, 50%)`);
            brick.setAttribute("stroke", "white");
            brick.setAttribute("stroke-width", "1");
            brick.setAttribute("id", `brick-${row}-${col}`);
            
            bricksContainer.appendChild(brick);
            
            gameState.bricks.push({
                element: brick,
                x: x,
                y: y,
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                destroyed: false
            });
            
            gameState.bricksRemaining++;
        }
    }
}

function clearBricks() {
    bricksContainer.innerHTML = '';
    gameState.bricks = [];
    gameState.bricksRemaining = 0;
}

function resetGame() {
    gameState.leftScore = 0;
    gameState.rightScore = 0;
    gameState.paddleLeftY = 160;
    gameState.paddleRightY = 160;
    resetBalls();
    updateScore();
    
    // Clear all bonuses and effects
    clearBonuses();
    clearLasers();
    gameState.activeEffects = { left: {}, right: {} };
    
    // Clear effect displays and sticky balls
    ['left', 'right'].forEach(player => {
        gameState.effectDisplays[player].forEach(display => {
            if (display.group && display.group.parentNode) {
                display.group.remove();
            }
        });
        gameState.effectDisplays[player] = [];
    });
    gameState.stickyBalls = {};
    
    // Reset paddle sizes
    paddleLeft.setAttribute("height", PADDLE_HEIGHT);
    paddleRight.setAttribute("height", PADDLE_HEIGHT);
    
    // Apply initial paddle positions
    paddleLeft.setAttribute("y", gameState.paddleLeftY);
    paddleRight.setAttribute("y", gameState.paddleRightY);
    
    // Reset bricks if in brick mode
    if ((gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') && gameState.bricksRemaining === 0) {
        createBricks();
    }
}

function clearBonuses() {
    bonusesContainer.innerHTML = '';
    gameState.bonuses = [];
}

function clearLasers() {
    lasersContainer.innerHTML = '';
    gameState.lasers = [];
}

function resetBalls() {
    if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
        // Both brick modes: each ball starts from its respective paddle
        gameState.balls[0].x = 30; // Start from left paddle
        gameState.balls[0].y = gameState.paddleLeftY + PADDLE_HEIGHT / 2;
        gameState.balls[0].speedX = BASE_BALL_SPEED;
        gameState.balls[0].speedY = Math.random() > 0.5 ? 3 : -3;
        gameState.balls[0].owner = 'left';
        
        gameState.balls[1].x = CONTAINER_WIDTH - 30; // Start from right paddle
        gameState.balls[1].y = gameState.paddleRightY + PADDLE_HEIGHT / 2;
        gameState.balls[1].speedX = -BASE_BALL_SPEED;
        gameState.balls[1].speedY = Math.random() > 0.5 ? 3 : -3;
        gameState.balls[1].owner = 'right';
    } else {
        // Single ball mode (standard pong)
        let startFromLeft = false;
        
        if (gameConfig.mode === 'pvai') {
            startFromLeft = true; // Always start from player in AI mode
        } else if (gameConfig.mode === 'pvp') {
            startFromLeft = Math.random() > 0.5; // Random in PvP
        }
        
        if (startFromLeft) {
            gameState.balls[0].x = 30; // Start from left paddle
            gameState.balls[0].y = gameState.paddleLeftY + PADDLE_HEIGHT / 2;
            gameState.balls[0].speedX = BASE_BALL_SPEED;
            gameState.balls[0].owner = 'left';
        } else {
            gameState.balls[0].x = CONTAINER_WIDTH - 30; // Start from right paddle
            gameState.balls[0].y = gameState.paddleRightY + PADDLE_HEIGHT / 2;
            gameState.balls[0].speedX = -BASE_BALL_SPEED;
            gameState.balls[0].owner = 'right';
        }
        
        gameState.balls[0].speedY = Math.random() > 0.5 ? 3 : -3;
    }
}

function resetSingleBall(ballIndex) {
    // Reset a single ball (used when it goes out of bounds)
    const ball = gameState.balls[ballIndex];
    console.log(`DEBUG: resetSingleBall called for ball ${ballIndex}`);
    
    if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
        // Both brick modes: reset to original paddle
        if (ballIndex === 0) {
            ball.x = 30;
            ball.y = gameState.paddleLeftY + PADDLE_HEIGHT / 2;
            ball.speedX = BASE_BALL_SPEED;
            ball.owner = 'left';
        } else {
            ball.x = CONTAINER_WIDTH - 30;
            ball.y = gameState.paddleRightY + PADDLE_HEIGHT / 2;
            ball.speedX = -BASE_BALL_SPEED;
            ball.owner = 'right';
        }
        ball.speedY = Math.random() > 0.5 ? 3 : -3;
    } else {
        // Single ball modes - reverse direction toward the last scorer
        ball.x = CONTAINER_WIDTH / 2;
        ball.y = CONTAINER_HEIGHT / 2;
        ball.speedX *= -1;
        ball.speedY = Math.random() > 0.5 ? 3 : -3;
    }
    
    // Reactivate the ball and make it visible
    ball.active = true;
    ball.element.style.display = 'block';
}

function updatePaddles() {
    const currentTime = Date.now();
    
    // Player 1 (left paddle) - always human controlled
    const leftFrozen = gameState.frozenPaddles.left && currentTime < gameState.frozenPaddles.left;
    if (!leftFrozen) {
        const leftPaddleHeight = gameState.activeEffects.left.bigPaddle ? PADDLE_HEIGHT * 2 : PADDLE_HEIGHT;
        if (gameState.keysPressed[gameConfig.p1Keys.up] && gameState.paddleLeftY > 0) {
            gameState.paddleLeftY -= BASE_PADDLE_SPEED;
        }
        if (gameState.keysPressed[gameConfig.p1Keys.down] && gameState.paddleLeftY < CONTAINER_HEIGHT - leftPaddleHeight) {
            gameState.paddleLeftY += BASE_PADDLE_SPEED;
        }
    }
    paddleLeft.setAttribute("y", gameState.paddleLeftY);
    
    // Player 2 (right paddle) - AI or human depending on mode
    const rightFrozen = gameState.frozenPaddles.right && currentTime < gameState.frozenPaddles.right;
    if (gameConfig.mode === 'pvp' || gameConfig.mode === 'brick2p') {
        // Human controlled
        if (!rightFrozen) {
            const rightPaddleHeight = gameState.activeEffects.right.bigPaddle ? PADDLE_HEIGHT * 2 : PADDLE_HEIGHT;
            if (gameState.keysPressed[gameConfig.p2Keys.up] && gameState.paddleRightY > 0) {
                gameState.paddleRightY -= BASE_PADDLE_SPEED;
            }
            if (gameState.keysPressed[gameConfig.p2Keys.down] && gameState.paddleRightY < CONTAINER_HEIGHT - rightPaddleHeight) {
                gameState.paddleRightY += BASE_PADDLE_SPEED;
            }
        }
    } else {
        // AI controlled (pvai and brick modes)
        if (!rightFrozen) {
            updateAI();
        }
    }
    paddleRight.setAttribute("y", gameState.paddleRightY);
}

function updateAI() {
    const aiConfig = AI_CONFIG[gameConfig.difficulty];
    const currentTime = Date.now();
    
    // Check if AI should release sticky balls
    checkAIStickyBallRelease();
    
    // Update AI target with reaction time delay
    if (currentTime - gameState.lastAIUpdate > aiConfig.reactionTime) {
        gameState.lastAIUpdate = currentTime;
        
        // Find the closest active ball to the AI paddle
        let closestBall = null;
        let closestDistance = Infinity;
        
        for (let ball of gameState.balls) {
            if (ball.active && ball.speedX > 0) { // Ball moving toward AI paddle
                const distance = CONTAINER_WIDTH - ball.x;
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestBall = ball;
                }
            }
        }
        
        let predictedY = CONTAINER_HEIGHT / 2; // Default center
        
        if (closestBall) {
            predictedY = closestBall.y;
            
            // Use prediction based on difficulty
            if (Math.random() < aiConfig.predictionAccuracy) {
                // Predict ball position when it reaches the paddle
                const timeToReachPaddle = (CONTAINER_WIDTH - closestBall.x - BALL_RADIUS) / Math.abs(closestBall.speedX);
                predictedY = closestBall.y + (closestBall.speedY * timeToReachPaddle);
                
                // Account for bounces
                while (predictedY < 0 || predictedY > CONTAINER_HEIGHT - BALL_RADIUS * 2) {
                    if (predictedY < 0) {
                        predictedY = -predictedY;
                    } else {
                        predictedY = 2 * (CONTAINER_HEIGHT - BALL_RADIUS * 2) - predictedY;
                    }
                }
            }
            
            // Add error based on difficulty
            if (Math.random() < aiConfig.errorChance) {
                predictedY += (Math.random() - 0.5) * PADDLE_HEIGHT;
            }
        }
        
        const rightPaddleHeight = gameState.activeEffects.right.bigPaddle ? PADDLE_HEIGHT * 2 : PADDLE_HEIGHT;
        gameState.aiTargetY = predictedY - rightPaddleHeight / 2;
    }
    
    // Move AI paddle toward target
    const rightPaddleHeight = gameState.activeEffects.right.bigPaddle ? PADDLE_HEIGHT * 2 : PADDLE_HEIGHT;
    const paddleCenterY = gameState.paddleRightY + rightPaddleHeight / 2;
    const targetCenterY = gameState.aiTargetY + rightPaddleHeight / 2;
    
    if (Math.abs(paddleCenterY - targetCenterY) > 5) {
        if (paddleCenterY < targetCenterY && gameState.paddleRightY < CONTAINER_HEIGHT - rightPaddleHeight) {
            gameState.paddleRightY += Math.min(aiConfig.speed, targetCenterY - paddleCenterY);
        } else if (paddleCenterY > targetCenterY && gameState.paddleRightY > 0) {
            gameState.paddleRightY -= Math.min(aiConfig.speed, paddleCenterY - targetCenterY);
        }
    }
    
    // Ensure paddle stays within bounds
    gameState.paddleRightY = Math.max(0, Math.min(CONTAINER_HEIGHT - rightPaddleHeight, gameState.paddleRightY));
}

function checkAIStickyBallRelease() {
    // Only check for AI players (right paddle in pvai and brick modes)
    if (gameConfig.mode !== 'pvai' && gameConfig.mode !== 'brick') return;
    
    // Check if AI has sticky balls
    const aiStickyBalls = Object.keys(gameState.stickyBalls).filter(ballIndex => 
        gameState.stickyBalls[ballIndex].player === 'right'
    );
    
    if (aiStickyBalls.length === 0) return;
    
    // AI release strategy: wait a bit, then release when advantageous
    const currentTime = Date.now();
    
    aiStickyBalls.forEach(ballIndex => {
        const ball = gameState.balls[parseInt(ballIndex)];
        const stickyInfo = gameState.stickyBalls[ballIndex];
        
        // Add timestamp when ball first got stuck
        if (!stickyInfo.stuckTime) {
            stickyInfo.stuckTime = currentTime;
        }
        
        // AI decision factors
        const timeSinceStuck = currentTime - stickyInfo.stuckTime;
        const minHoldTime = 1000; // Hold for at least 1 second
        const maxHoldTime = 3000; // Release within 3 seconds max
        
        // Release conditions
        const shouldRelease = 
            timeSinceStuck > maxHoldTime || // Force release after max time
            (timeSinceStuck > minHoldTime && Math.random() < 0.3); // 30% chance per frame after min time
        
        if (shouldRelease) {
            // Release the ball
            ball.speedX = -BASE_BALL_SPEED;
            ball.speedY = (Math.random() - 0.5) * 4;
            delete gameState.stickyBalls[ballIndex];
        }
    });
}

function checkBrickCollision(ball) {
    const nextBallX = ball.x + ball.speedX;
    const nextBallY = ball.y + ball.speedY;
    
    for (let brick of gameState.bricks) {
        if (!brick.destroyed) {
            // Check if ball will intersect with brick on next frame
            if (nextBallX + BALL_RADIUS >= brick.x &&
                nextBallX - BALL_RADIUS <= brick.x + brick.width &&
                nextBallY + BALL_RADIUS >= brick.y &&
                nextBallY - BALL_RADIUS <= brick.y + brick.height) {
                
                // Destroy brick
                brick.destroyed = true;
                brick.element.style.display = 'none';
                gameState.bricksRemaining--;
                
                // Generate bonus with 10% chance
                if (Math.random() < 0.1) {
                    generateBonus(brick.x + brick.width / 2, brick.y + brick.height / 2, ball.owner);
                }
                
                // Award points based on ball ownership (both brick modes)
                if (gameConfig.mode === 'brick2p' || gameConfig.mode === 'brick') {
                    if (ball.owner === 'left') {
                        gameState.leftScore++;
                    } else if (ball.owner === 'right') {
                        gameState.rightScore++;
                    }
                    updateScore();
                }
                
                // Determine collision side more accurately
                const ballCenterX = ball.x;
                const ballCenterY = ball.y;
                const brickCenterX = brick.x + brick.width / 2;
                const brickCenterY = brick.y + brick.height / 2;
                
                const dx = ballCenterX - brickCenterX;
                const dy = ballCenterY - brickCenterY;
                
                // Calculate overlap on each axis
                const overlapX = (brick.width / 2 + BALL_RADIUS) - Math.abs(dx);
                const overlapY = (brick.height / 2 + BALL_RADIUS) - Math.abs(dy);
                
                // Bounce based on smallest overlap (most likely collision side)
                if (overlapX < overlapY) {
                    // Hit from left or right
                    ball.speedX *= -1;
                    // Adjust ball position to prevent getting stuck
                    if (dx < 0) {
                        ball.x = brick.x - BALL_RADIUS;
                    } else {
                        ball.x = brick.x + brick.width + BALL_RADIUS;
                    }
                } else {
                    // Hit from top or bottom
                    ball.speedY *= -1;
                    // Adjust ball position to prevent getting stuck
                    if (dy < 0) {
                        ball.y = brick.y - BALL_RADIUS;
                    } else {
                        ball.y = brick.y + brick.height + BALL_RADIUS;
                    }
                }
                
                // Check if all bricks are destroyed
                if (gameState.bricksRemaining === 0) {
                    if (gameConfig.mode === 'brick2p' || gameConfig.mode === 'brick') {
                        // Determine winner based on score
                        if (gameState.leftScore > gameState.rightScore) {
                            gameOver("Player 1");
                        } else if (gameState.rightScore > gameState.leftScore) {
                            gameOver("Player 2");
                        } else {
                            gameOver("Draw");
                        }
                    } else {
                        gameOver("All Bricks Destroyed!");
                    }
                }
                
                return true; // Stop checking other bricks this frame
            }
        }
    }
    return false;
}

function updateBalls() {
    for (let i = 0; i < gameState.balls.length; i++) {
        const ball = gameState.balls[i];
        
        if (!ball.active) continue;
        
        ball.x += ball.speedX;
        ball.y += ball.speedY;
        
        // Handle sticky balls - override normal movement
        if (gameState.stickyBalls[i]) {
            const stickyInfo = gameState.stickyBalls[i];
            if (stickyInfo.player === 'left') {
                const leftPaddleHeight = gameState.activeEffects.left.bigPaddle ? PADDLE_HEIGHT * 2 : PADDLE_HEIGHT;
                ball.x = 20 + BALL_RADIUS;
                ball.y = gameState.paddleLeftY + leftPaddleHeight / 2 + stickyInfo.offset;
            } else {
                const rightPaddleHeight = gameState.activeEffects.right.bigPaddle ? PADDLE_HEIGHT * 2 : PADDLE_HEIGHT;
                ball.x = CONTAINER_WIDTH - 20 - BALL_RADIUS;
                ball.y = gameState.paddleRightY + rightPaddleHeight / 2 + stickyInfo.offset;
            }
            // Skip normal collision detection for sticky balls
            ball.element.setAttribute("cx", ball.x);
            ball.element.setAttribute("cy", ball.y);
            continue;
        }
        
        // Top and bottom collision
        if (ball.y - BALL_RADIUS <= 0 || ball.y + BALL_RADIUS >= CONTAINER_HEIGHT) {
            ball.speedY *= -1;
            ball.y = ball.y - BALL_RADIUS <= 0 ? BALL_RADIUS : CONTAINER_HEIGHT - BALL_RADIUS;
        }
        
        // Check brick collisions in brick modes (before updating position)
        if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
            if (checkBrickCollision(ball)) {
                // If collision occurred, don't update ball position this frame
                ball.element.setAttribute("cx", ball.x);
                ball.element.setAttribute("cy", ball.y);
                continue;
            }
        }
        
        // Left paddle collision
        const leftPaddleHeight = gameState.activeEffects.left.bigPaddle ? PADDLE_HEIGHT * 2 : PADDLE_HEIGHT;
        if (
            ball.x - BALL_RADIUS <= 20 &&
            ball.x - BALL_RADIUS > 10 &&
            ball.y >= gameState.paddleLeftY &&
            ball.y <= gameState.paddleLeftY + leftPaddleHeight &&
            ball.speedX < 0
        ) {
            ball.owner = 'left'; // Update ownership
            
            // Check for sticky paddle effect
            if (gameState.activeEffects.left.sticky) {
                // Stick ball to paddle
                gameState.stickyBalls[i] = {
                    player: 'left',
                    offset: ball.y - (gameState.paddleLeftY + leftPaddleHeight / 2)
                };
                ball.speedX = 0;
                ball.speedY = 0;
            } else {
                // Normal bounce
                ball.speedX *= -1;
                ball.x = 20 + BALL_RADIUS;
                // Add spin based on where ball hits paddle
                const hitPosition = (ball.y - gameState.paddleLeftY) / leftPaddleHeight;
                ball.speedY = (hitPosition - 0.5) * 8;
            }
        }
        
        // Right paddle collision (always active now)
        const rightPaddleHeight = gameState.activeEffects.right.bigPaddle ? PADDLE_HEIGHT * 2 : PADDLE_HEIGHT;
        if (ball.x + BALL_RADIUS >= CONTAINER_WIDTH - 20 &&
            ball.x + BALL_RADIUS < CONTAINER_WIDTH - 10 &&
            ball.y >= gameState.paddleRightY &&
            ball.y <= gameState.paddleRightY + rightPaddleHeight &&
            ball.speedX > 0
        ) {
            ball.owner = 'right'; // Update ownership
            
            // Check for sticky paddle effect
            if (gameState.activeEffects.right.sticky) {
                // Stick ball to paddle
                gameState.stickyBalls[i] = {
                    player: 'right',
                    offset: ball.y - (gameState.paddleRightY + rightPaddleHeight / 2)
                };
                ball.speedX = 0;
                ball.speedY = 0;
            } else {
                // Normal bounce
                ball.speedX *= -1;
                ball.x = CONTAINER_WIDTH - 20 - BALL_RADIUS;
                // Add spin based on where ball hits paddle
                const hitPosition = (ball.y - gameState.paddleRightY) / rightPaddleHeight;
                ball.speedY = (hitPosition - 0.5) * 8;
            }
        }
        
        // Scoring
        if (ball.x < 0) {
            console.log(`DEBUG: Ball ${i} went out left side (x=${ball.x}), starting countdown for left player`);
            if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
                // In brick modes, award point and start countdown (left player lost ball)
                gameState.rightScore++;
                updateScore();
                startBallCountdown(i, 'left'); // Countdown on left side (losing player)
            } else {
                gameState.rightScore++;
                updateScore();
                if (gameState.rightScore >= gameConfig.maxScore) {
                    gameOver("Player 2");
                } else {
                    startBallCountdown(i, 'left'); // Countdown on left side (losing player)
                }
            }
        }
        
        if (ball.x > CONTAINER_WIDTH) {
            console.log(`DEBUG: Ball ${i} went out right side (x=${ball.x}), starting countdown for right player`);
            if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
                // In brick modes, award point and start countdown (right player lost ball)
                gameState.leftScore++;
                updateScore();
                startBallCountdown(i, 'right'); // Countdown on right side (losing player)
            } else {
                gameState.leftScore++;
                updateScore();
                if (gameState.leftScore >= gameConfig.maxScore) {
                    gameOver("Player 1");
                } else {
                    startBallCountdown(i, 'right'); // Countdown on right side (losing player)
                }
            }
        }
        
        // Apply ball position
        ball.element.setAttribute("cx", ball.x);
        ball.element.setAttribute("cy", ball.y);
    }
}

function updateScore() {
    // Create styled score display
    let leftStyle = '';
    let rightStyle = '';
    
    if (gameState.leftScore > gameState.rightScore) {
        leftStyle = 'font-weight: bold; color: #4CAF50;'; // Green for leader
    } else if (gameState.rightScore > gameState.leftScore) {
        rightStyle = 'font-weight: bold; color: #4CAF50;'; // Green for leader
    }
    
    scoreboard.innerHTML = `<span style="${leftStyle}">${gameState.leftScore}</span> : <span style="${rightStyle}">${gameState.rightScore}</span>`;
}

function gameOver(winner) {
    gameState.gameRunning = false;
    
    if (gameConfig.mode === 'brick2p' || gameConfig.mode === 'brick') {
        if (winner === "Draw") {
            winnerText.textContent = "Draw!";
            finalScoreText.textContent = `Final Score: ${gameState.leftScore} - ${gameState.rightScore}`;
        } else {
            let winnerName = winner;
            if (gameConfig.mode === 'brick' && winner === "Player 2") {
                winnerName = "AI";
            }
            winnerText.textContent = `${winnerName} Wins!`;
            finalScoreText.textContent = `Final Score: ${gameState.leftScore} - ${gameState.rightScore}`;
        }
    } else {
        let winnerName = winner;
        if (gameConfig.mode === 'pvai' && winner === "Player 2") {
            winnerName = "AI";
        }
        winnerText.textContent = `${winnerName} Wins!`;
        finalScoreText.textContent = `Final Score: ${gameState.leftScore} - ${gameState.rightScore}`;
    }
    
    gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
    if (gameState.gameRunning) {
        updatePaddles();
        updateBalls();
        updateBonuses();
        updateLasers();
        updateAutoLasers();
        updateCountdowns();
        updateEffects();
        requestAnimationFrame(gameLoop);
    }
}

// Ball Countdown System
function startBallCountdown(ballIndex, playerSide) {
    const ball = gameState.balls[ballIndex];
    ball.active = false;
    ball.element.style.display = 'none';
    
    console.log(`DEBUG: Starting countdown for ball ${ballIndex} on ${playerSide} side`);
    console.log(`DEBUG: Current active effects for ${playerSide}:`, gameState.activeEffects[playerSide]);
    
    // Check if there's already a countdown for this player
    const existingCountdownKey = Object.keys(gameState.countdowns).find(key => 
        gameState.countdowns[key].playerSide === playerSide
    );
    
    if (existingCountdownKey) {
        // Extend existing countdown by 1 second
        const existingCountdown = gameState.countdowns[existingCountdownKey];
        const currentTime = Date.now();
        const elapsed = currentTime - existingCountdown.startTime;
        const remaining = Math.max(0, 1000 - elapsed);
        
        // Add 1 second to the remaining time
        existingCountdown.startTime = currentTime - elapsed + 1000;
        
        // Extend paddle freeze
        gameState.frozenPaddles[playerSide] = Math.max(
            gameState.frozenPaddles[playerSide] || 0,
            currentTime + remaining + 1000
        );
        
        // Add this ball to the same countdown (for respawn)
        if (!existingCountdown.ballIndexes) {
            existingCountdown.ballIndexes = [parseInt(existingCountdownKey)];
        }
        existingCountdown.ballIndexes.push(ballIndex);
        
        // Remove the old countdown key and use the new ball as the key
        delete gameState.countdowns[existingCountdownKey];
        gameState.countdowns[ballIndex] = existingCountdown;
    } else {
        // Create new countdown
        gameState.frozenPaddles[playerSide] = Date.now() + 1000; // Freeze for 1 second
        
        gameState.countdowns[ballIndex] = {
            playerSide: playerSide,
            count: 3,
            startTime: Date.now(),
            textElement: null,
            ballIndexes: [ballIndex]
        };
        
        // Create countdown text
        const countdownText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        const x = playerSide === 'left' ? 100 : CONTAINER_WIDTH - 100;
        const y = 200;
        
        countdownText.setAttribute("x", x);
        countdownText.setAttribute("y", y);
        countdownText.setAttribute("text-anchor", "middle");
        countdownText.setAttribute("font-size", "48");
        countdownText.setAttribute("fill", "white");
        countdownText.setAttribute("font-weight", "bold");
        countdownText.textContent = "3";
        
        document.getElementById('game-svg').appendChild(countdownText);
        gameState.countdowns[ballIndex].textElement = countdownText;
    }
}

function updateCountdowns() {
    const currentTime = Date.now();
    
    Object.keys(gameState.countdowns).forEach(ballIndex => {
        const countdown = gameState.countdowns[ballIndex];
        const elapsed = currentTime - countdown.startTime;
        const millisecondsPerCount = 333; // 1000ms / 3 counts = ~333ms per count
        
        const currentCount = Math.max(1, 4 - Math.floor(elapsed / millisecondsPerCount));
        
        if (elapsed < 1000) {
            if (countdown.textElement) {
                countdown.textElement.textContent = currentCount;
            }
        } else {
            // Countdown finished (1 second), respawn all balls for this countdown
            if (countdown.textElement) {
                countdown.textElement.remove();
            }
            
            // Respawn balls based on what the player should have
            if (countdown.ballIndexes) {
                // Multiple balls to respawn
                const ballsToRespawn = getBallsToRespawn(countdown.playerSide, countdown.ballIndexes.length);
                console.log(`DEBUG: Multiple balls countdown finished for ${countdown.playerSide}. Lost: ${countdown.ballIndexes.length}, Should respawn: ${ballsToRespawn}`);
                
                // Respawn balls with priority: ball 0 first (main ball), then ball 1 (extra ball)
                const sortedBallIndexes = [...countdown.ballIndexes].sort((a, b) => a - b); // [0, 1] order
                for (let i = 0; i < ballsToRespawn && i < sortedBallIndexes.length; i++) {
                    const ballToRespawn = sortedBallIndexes[i];
                    console.log(`DEBUG: Respawning ball ${ballToRespawn} (priority order)`);
                    resetSingleBall(ballToRespawn);
                }
            } else {
                // Single ball to respawn
                const ballsToRespawn = getBallsToRespawn(countdown.playerSide, 1);
                console.log(`DEBUG: Single ball countdown finished for ${countdown.playerSide}. Should respawn: ${ballsToRespawn}`);
                if (ballsToRespawn > 0) {
                    console.log(`DEBUG: Respawning ball ${ballIndex}`);
                    resetSingleBall(parseInt(ballIndex));
                } else {
                    console.log(`DEBUG: Ball ${ballIndex} NOT respawning - no balls allocated for this player`);
                }
            }
            
            delete gameState.countdowns[ballIndex];
        }
    });
}

function getBallsToRespawn(playerSide, ballsLost) {
    // Check if this player has active multi-ball effect
    const playerEffects = gameState.activeEffects[playerSide];
    const multiBallEffect = playerEffects && playerEffects.multiBall;
    const hasMultiBall = multiBallEffect && (Date.now() - multiBallEffect.startTime < multiBallEffect.duration);
    
    // In all modes, player should have at least 1 ball
    let baseBalls = 1;
    
    // If multi-ball is active, player should have 2 balls total
    if (hasMultiBall) {
        baseBalls = 2;
    }
    
    console.log(`DEBUG: getBallsToRespawn - Player: ${playerSide}, PlayerEffects: ${JSON.stringify(playerEffects)}, MultiBallEffect: ${JSON.stringify(multiBallEffect)}, HasMultiBall: ${hasMultiBall}, BaseBalls: ${baseBalls}, BallsLost: ${ballsLost}`);
    
    // Return the number of balls this player should have (up to the number lost)
    const result = Math.min(ballsLost, baseBalls);
    console.log(`DEBUG: Will respawn ${result} balls`);
    return result;
}

// Effect Display System
function updateEffectDisplay(player) {
    const effects = gameState.activeEffects[player];
    const displays = gameState.effectDisplays[player];
    const currentTime = Date.now();
    
    // Clear old displays
    displays.forEach(display => {
        if (display.group && display.group.parentNode) {
            display.group.remove();
        }
    });
    displays.length = 0;
    
    const baseX = player === 'left' ? -50 : CONTAINER_WIDTH + 50;
    let yOffset = 80;
    
    // Display active effects with circular progress
    Object.keys(effects).forEach(effectType => {
        const effect = effects[effectType];
        if (effect && effect.duration && (currentTime - effect.startTime) < effect.duration) {
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.duration; // 0 to 1
            const remaining = 1 - progress; // 1 to 0
            
            // Create group for this effect
            const effectGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            
            // Background circle (gray)
            const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            bgCircle.setAttribute("cx", baseX);
            bgCircle.setAttribute("cy", yOffset);
            bgCircle.setAttribute("r", "20");
            bgCircle.setAttribute("fill", "rgba(50, 50, 50, 0.8)");
            bgCircle.setAttribute("stroke", "rgba(100, 100, 100, 0.5)");
            bgCircle.setAttribute("stroke-width", "2");
            effectGroup.appendChild(bgCircle);
            
            // Progress circle (green, diminishing)
            const progressCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            const circumference = 2 * Math.PI * 18; // radius 18 for stroke
            const strokeDashoffset = circumference * progress;
            
            progressCircle.setAttribute("cx", baseX);
            progressCircle.setAttribute("cy", yOffset);
            progressCircle.setAttribute("r", "18");
            progressCircle.setAttribute("fill", "none");
            progressCircle.setAttribute("stroke", "#4CAF50");
            progressCircle.setAttribute("stroke-width", "4");
            progressCircle.setAttribute("stroke-dasharray", circumference);
            progressCircle.setAttribute("stroke-dashoffset", strokeDashoffset);
            progressCircle.setAttribute("transform", `rotate(-90 ${baseX} ${yOffset})`);
            effectGroup.appendChild(progressCircle);
            
            // Effect icon
            const effectIcon = document.createElementNS("http://www.w3.org/2000/svg", "text");
            effectIcon.setAttribute("x", baseX);
            effectIcon.setAttribute("y", yOffset + 6);
            effectIcon.setAttribute("text-anchor", "middle");
            effectIcon.setAttribute("font-size", "20");
            effectIcon.setAttribute("fill", "white");
            effectIcon.textContent = getEffectIcon(effectType);
            effectGroup.appendChild(effectIcon);
            
            document.getElementById('game-svg').appendChild(effectGroup);
            displays.push({ group: effectGroup, type: effectType });
            
            yOffset += 50;
        }
    });
}

function getEffectIcon(effectType) {
    switch (effectType) {
        case 'bigPaddle': return '🏓';
        case 'multiBall': return '🎱';
        case 'laser': return '🔫';
        case 'slowBall': return '🐢';
        case 'sticky': return '🧲';
        default: return '?';
    }
}

function getEffectDisplayName(effectType) {
    switch (effectType) {
        case 'bigPaddle': return '🏓 Big';
        case 'multiBall': return '🎱 Multi';
        case 'laser': return '🔫 Laser';
        case 'slowBall': return '🐢 Slow';
        case 'sticky': return '🧲 Sticky';
        default: return effectType;
    }
}

function getEffectColor(effectType) {
    switch (effectType) {
        case 'bigPaddle': return '#4CAF50';
        case 'multiBall': return '#2196F3';
        case 'laser': return '#FF5722';
        case 'slowBall': return '#9C27B0';
        case 'sticky': return '#FF9800';
        default: return '#FFF';
    }
}

// Bonus Name Display
function showBonusName(type, player, isDebuff = false) {
    const bonusNames = {
        [BONUS_TYPES.BIG_PADDLE]: 'Big Paddle',
        [BONUS_TYPES.MULTI_BALL]: 'Multi Ball',
        [BONUS_TYPES.LASER_PADDLE]: 'Laser Paddle',
        [BONUS_TYPES.SLOW_BALL]: 'Slow Ball',
        [BONUS_TYPES.STICKY_PADDLE]: 'Sticky Paddle'
    };
    
    const bonusText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const x = player === 'left' ? 100 : CONTAINER_WIDTH - 100;
    const y = 150;
    
    bonusText.setAttribute("x", x);
    bonusText.setAttribute("y", y);
    bonusText.setAttribute("text-anchor", "middle");
    bonusText.setAttribute("font-size", "20");
    bonusText.setAttribute("fill", isDebuff ? "#FF4444" : "#FFD700"); // Red for debuffs, gold for buffs
    bonusText.setAttribute("font-weight", "bold");
    bonusText.textContent = (isDebuff ? "⚠️ " : "✨ ") + (bonusNames[type] || 'Bonus');
    
    document.getElementById('game-svg').appendChild(bonusText);
    
    // Remove after 2 seconds
    setTimeout(() => {
        if (bonusText.parentNode) {
            bonusText.remove();
        }
    }, 2000);
}

// Bonus System
function generateBonus(x, y, ballOwner) {
    const bonusTypes = Object.values(BONUS_TYPES);
    const randomType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
    
    const bonus = document.createElementNS("http://www.w3.org/2000/svg", "g");
    bonus.setAttribute("id", `bonus-${Date.now()}`);
    
    // Create bonus circle
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "15");
    circle.setAttribute("fill", getBonusColor(randomType));
    circle.setAttribute("stroke", "white");
    circle.setAttribute("stroke-width", "2");
    
    // Create bonus text/icon
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y + 4);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "16");
    text.setAttribute("fill", "white");
    text.setAttribute("font-weight", "bold");
    text.textContent = getBonusIcon(randomType);
    
    bonus.appendChild(circle);
    bonus.appendChild(text);
    bonusesContainer.appendChild(bonus);
    
    // Move horizontally toward the paddle that destroyed the brick
    const horizontalSpeed = 2;
    const speedX = ballOwner === 'left' ? -horizontalSpeed : horizontalSpeed; // Fall toward owner's paddle
    const speedY = 0; // No vertical movement, purely horizontal
    
    gameState.bonuses.push({
        element: bonus,
        type: randomType,
        x: x,
        y: y,
        speedX: speedX,
        speedY: speedY
    });
}

function getBonusColor(type) {
    switch (type) {
        case BONUS_TYPES.BIG_PADDLE: return '#4CAF50';
        case BONUS_TYPES.MULTI_BALL: return '#2196F3';
        case BONUS_TYPES.LASER_PADDLE: return '#FF5722';
        case BONUS_TYPES.SLOW_BALL: return '#9C27B0';
        case BONUS_TYPES.STICKY_PADDLE: return '#FF9800';
        default: return '#FFF';
    }
}

function getBonusIcon(type) {
    switch (type) {
        case BONUS_TYPES.BIG_PADDLE: return '🏓';
        case BONUS_TYPES.MULTI_BALL: return '🎱';
        case BONUS_TYPES.LASER_PADDLE: return '🔫';
        case BONUS_TYPES.SLOW_BALL: return '🐢';
        case BONUS_TYPES.STICKY_PADDLE: return '🧲';
        default: return '?';
    }
}

function updateBonuses() {
    for (let i = gameState.bonuses.length - 1; i >= 0; i--) {
        const bonus = gameState.bonuses[i];
        bonus.x += bonus.speedX;
        bonus.y += bonus.speedY;
        
        // Update visual position
        const circle = bonus.element.querySelector('circle');
        const text = bonus.element.querySelector('text');
        circle.setAttribute("cx", bonus.x);
        circle.setAttribute("cy", bonus.y);
        text.setAttribute("x", bonus.x);
        text.setAttribute("y", bonus.y + 4);
        
        // Check collision with paddles
        if (checkBonusCollision(bonus)) {
            // Remove bonus
            bonus.element.remove();
            gameState.bonuses.splice(i, 1);
            continue;
        }
        
        // Remove if out of bounds (any edge)
        if (bonus.y > CONTAINER_HEIGHT + 20 || bonus.y < -20 || 
            bonus.x > CONTAINER_WIDTH + 20 || bonus.x < -20) {
            bonus.element.remove();
            gameState.bonuses.splice(i, 1);
        }
    }
}

function checkBonusCollision(bonus) {
    // Check left paddle
    if (bonus.x >= 10 && bonus.x <= 20 && 
        bonus.y >= gameState.paddleLeftY && bonus.y <= gameState.paddleLeftY + PADDLE_HEIGHT) {
        applyBonus(bonus.type, 'left');
        return true;
    }
    
    // Check right paddle
    if (bonus.x >= CONTAINER_WIDTH - 20 && bonus.x <= CONTAINER_WIDTH - 10 && 
        bonus.y >= gameState.paddleRightY && bonus.y <= gameState.paddleRightY + PADDLE_HEIGHT) {
        applyBonus(bonus.type, 'right');
        return true;
    }
    
    return false;
}

function applyBonus(type, player) {
    const effects = gameState.activeEffects[player];
    
    // Show bonus name on appropriate side
    if (type === BONUS_TYPES.SLOW_BALL) {
        // Slow ball affects opponent, show message on opponent's side
        const opponentSide = player === 'left' ? 'right' : 'left';
        showBonusName(type, opponentSide, true); // true = is debuff
    } else {
        // Other bonuses affect the player who picked them up
        showBonusName(type, player, false); // false = is buff
    }
    
    switch (type) {
        case BONUS_TYPES.BIG_PADDLE:
            if (effects.bigPaddle) {
                // Extend existing effect
                effects.bigPaddle.duration += 10000;
            } else {
                // Create new effect
                effects.bigPaddle = {
                    duration: 10000,
                    startTime: Date.now()
                };
            }
            updatePaddleSize(player);
            break;
            
        case BONUS_TYPES.MULTI_BALL:
            if (effects.multiBall) {
                // Extend existing effect
                effects.multiBall.duration += 15000;
            } else {
                // Create new effect
                effects.multiBall = {
                    duration: 15000, // 15 seconds
                    startTime: Date.now()
                };
            }
            createMultiBall();
            break;
            
        case BONUS_TYPES.LASER_PADDLE:
            if (effects.laser) {
                // Extend existing effect
                effects.laser.duration += 3000;
            } else {
                // Create new effect
                effects.laser = {
                    duration: 3000,
                    startTime: Date.now(),
                    lastShot: 0,
                    shootInterval: 500 // Shoot every 500ms
                };
            }
            break;
            
        case BONUS_TYPES.SLOW_BALL:
            if (effects.slowBall) {
                // Extend existing effect
                effects.slowBall.duration += 7000;
            } else {
                // Create new effect
                effects.slowBall = {
                    duration: 7000,
                    startTime: Date.now()
                };
            }
            applySlowBall(player);
            break;
            
        case BONUS_TYPES.STICKY_PADDLE:
            if (effects.sticky) {
                // Extend existing effect
                effects.sticky.duration += 20000;
            } else {
                // Create new effect
                effects.sticky = {
                    duration: 20000,
                    startTime: Date.now()
                };
            }
            break;
    }
}

function updatePaddleSize(player) {
    const paddle = player === 'left' ? paddleLeft : paddleRight;
    const effect = gameState.activeEffects[player].bigPaddle;
    
    if (effect && Date.now() - effect.startTime < effect.duration) {
        paddle.setAttribute("height", PADDLE_HEIGHT * 2);
    } else {
        paddle.setAttribute("height", PADDLE_HEIGHT);
        delete gameState.activeEffects[player].bigPaddle;
    }
}

function createMultiBall() {
    // Find inactive ball or create new one
    let newBall = gameState.balls.find(ball => !ball.active);
    
    if (!newBall) {
        // Create new ball element
        const ballElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ballElement.setAttribute("r", BALL_RADIUS);
        ballElement.setAttribute("fill", "white");
        document.getElementById('game-svg').appendChild(ballElement);
        
        newBall = {
            x: 400,
            y: 200,
            speedX: BASE_BALL_SPEED,
            speedY: 3,
            owner: null,
            active: false,
            element: ballElement
        };
        gameState.balls.push(newBall);
    }
    
    // Activate the ball
    newBall.active = true;
    newBall.element.style.display = 'block';
    newBall.x = CONTAINER_WIDTH / 2;
    newBall.y = CONTAINER_HEIGHT / 2;
    newBall.speedX = Math.random() > 0.5 ? BASE_BALL_SPEED : -BASE_BALL_SPEED;
    newBall.speedY = (Math.random() - 0.5) * 6;
}

function applySlowBall(player) {
    // Slow down opponent's balls only
    const opponentSide = player === 'left' ? 'right' : 'left';
    
    for (let ball of gameState.balls) {
        if (ball.active && ball.owner === opponentSide) {
            ball.speedX *= 0.5;
            ball.speedY *= 0.5;
        }
    }
}

function updateEffects() {
    // Update left paddle effects
    updatePaddleSize('left');
    updateEffectDisplay('left');
    
    // Update right paddle effects
    updatePaddleSize('right');
    updateEffectDisplay('right');
    
    // Remove expired effects
    for (let player of ['left', 'right']) {
        const effects = gameState.activeEffects[player];
        for (let effectName in effects) {
            const effect = effects[effectName];
            if (Date.now() - effect.startTime >= effect.duration) {
                delete effects[effectName];
            }
        }
    }
    
    // Restore ball speed if slow effect expired
    if (!gameState.activeEffects.left.slowBall && !gameState.activeEffects.right.slowBall) {
        for (let ball of gameState.balls) {
            if (ball.active) {
                const currentSpeed = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
                if (currentSpeed < BASE_BALL_SPEED * 0.8) {
                    const factor = BASE_BALL_SPEED / currentSpeed;
                    ball.speedX *= factor;
                    ball.speedY *= factor;
                }
            }
        }
    }
}

function updateAutoLasers() {
    const currentTime = Date.now();
    
    // Check both players for laser effects
    ['left', 'right'].forEach(player => {
        const effects = gameState.activeEffects[player];
        if (effects.laser) {
            // Initialize lastShot if not set
            if (!effects.laser.lastShot) {
                effects.laser.lastShot = effects.laser.startTime;
            }
            
            if (currentTime - effects.laser.lastShot > effects.laser.shootInterval) {
                fireLaser(player);
                effects.laser.lastShot = currentTime;
            }
        }
    });
}

function updateLasers() {
    for (let i = gameState.lasers.length - 1; i >= 0; i--) {
        const laser = gameState.lasers[i];
        
        // Move horizontally toward center
        if (laser.player === 'left') {
            laser.x += laser.speed;
        } else {
            laser.x -= laser.speed;
        }
        
        // Update visual position
        laser.element.setAttribute("x", laser.x);
        
        // Check collision with bricks
        if (checkLaserBrickCollision(laser)) {
            laser.element.remove();
            gameState.lasers.splice(i, 1);
            continue;
        }
        
        // Remove if out of bounds horizontally
        if (laser.x < 0 || laser.x > CONTAINER_WIDTH) {
            laser.element.remove();
            gameState.lasers.splice(i, 1);
        }
    }
}

function checkLaserBrickCollision(laser) {
    for (let brick of gameState.bricks) {
        if (!brick.destroyed &&
            laser.x >= brick.x && laser.x <= brick.x + brick.width &&
            laser.y >= brick.y && laser.y <= brick.y + brick.height) {
            
            // Destroy brick
            brick.destroyed = true;
            brick.element.style.display = 'none';
            gameState.bricksRemaining--;
            
            // Generate bonus with 10% chance
            if (Math.random() < 0.1) {
                generateBonus(brick.x + brick.width / 2, brick.y + brick.height / 2, laser.owner);
            }
            
            // Check if all bricks are destroyed
            if (gameState.bricksRemaining === 0) {
                if (gameConfig.mode === 'brick2p' || gameConfig.mode === 'brick') {
                    if (gameState.leftScore > gameState.rightScore) {
                        gameOver("Player 1");
                    } else if (gameState.rightScore > gameState.leftScore) {
                        gameOver("Player 2");
                    } else {
                        gameOver("Draw");
                    }
                } else {
                    gameOver("All Bricks Destroyed!");
                }
            }
            
            return true;
        }
    }
    return false;
}

function fireLaser(player) {
    const effects = gameState.activeEffects[player];
    if (!effects.laser) return;
    
    const paddleX = player === 'left' ? 20 : CONTAINER_WIDTH - 20;
    const paddleY = player === 'left' ? gameState.paddleLeftY : gameState.paddleRightY;
    
    const laser = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    laser.setAttribute("x", paddleX);
    laser.setAttribute("y", paddleY + PADDLE_HEIGHT / 2 - 1);
    laser.setAttribute("width", "10"); // Horizontal laser beam
    laser.setAttribute("height", "2");
    laser.setAttribute("fill", "#FF5722");
    
    lasersContainer.appendChild(laser);
    
    gameState.lasers.push({
        element: laser,
        x: paddleX,
        y: paddleY + PADDLE_HEIGHT / 2,
        speed: 8,
        player: player,
        owner: player
    });
}