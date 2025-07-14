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
const pauseScreen = document.getElementById("pause-screen");
const resumeButton = document.getElementById("resume-game");
const restartButton = document.getElementById("restart-game");
const pauseBackToMenuButton = document.getElementById("pause-back-to-menu");
const effectsLeft = document.getElementById("effects-left");
const effectsRight = document.getElementById("effects-right");

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

// Game Configuration with localStorage support
function loadGameConfig() {
    const saved = localStorage.getItem('pongGameConfig');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.warn('Failed to parse saved config, using defaults');
        }
    }
    
    // Default configuration
    return {
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
}

function saveGameConfig() {
    try {
        localStorage.setItem('pongGameConfig', JSON.stringify(gameConfig));
    } catch (e) {
        console.warn('Failed to save config to localStorage');
    }
}

let gameConfig = loadGameConfig();

// Menu navigation state
let menuState = {
    focusedElement: null,
    navigableElements: []
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
    GHOST_BALL: 'ghost_ball',
    EXPLOSIVE_BALL: 'explosive_ball'
};

// Helper functions for SVG positioning
function setBallPosition(ballElement, x, y) {
    // For SVG <image> elements, position from top-left corner
    ballElement.setAttribute("x", x - BALL_RADIUS);
    ballElement.setAttribute("y", y - BALL_RADIUS);
}

function setPaddlePosition(paddleElement, x, y) {
    paddleElement.setAttribute("x", x);
    paddleElement.setAttribute("y", y);
}

// Helper functions for paddle dimensions
function getPaddleHeight(player) {
    const paddle = player === 'left' ? paddleLeft : paddleRight;
    return parseInt(paddle.getAttribute("height")) || PADDLE_HEIGHT;
}

function getLeftPaddleHeight() {
    return getPaddleHeight('left');
}

function getRightPaddleHeight() {
    return getPaddleHeight('right');
}

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
    paused: false,
    countdowns: {}, // For ball respawn countdowns
    frozenPaddles: {}, // For freezing paddles during countdown
    bricks: [],
    bricksRemaining: 0,
    bonuses: [],
    activeEffects: {
        left: {},
        right: {}
    },
    ghostBalls: {}, // For balls with ghost effect
    explosiveBalls: {}, // For balls with explosive effect
    explosionAnimations: [], // For visual explosion effects
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

// Apply saved configuration to form elements
function applyConfigToForm() {
    // Set game mode
    const modeRadio = document.querySelector(`input[name="gameMode"][value="${gameConfig.mode}"]`);
    if (modeRadio) {
        modeRadio.checked = true;
        // Trigger change event to update UI
        modeRadio.dispatchEvent(new Event('change'));
    }
    
    // Set difficulty
    const difficultySelect = document.getElementById('difficulty');
    if (difficultySelect) {
        difficultySelect.value = gameConfig.difficulty.toString();
    }
    
    // Set max score
    const maxScoreSelect = document.getElementById('max-score');
    if (maxScoreSelect) {
        maxScoreSelect.value = gameConfig.maxScore.toString();
    }
    
    // Set field width
    if (fieldWidthSelect) {
        fieldWidthSelect.value = gameConfig.fieldWidth.toString();
    }
    
    // Set player 1 keys
    const p1UpInput = document.getElementById('p1-up');
    const p1DownInput = document.getElementById('p1-down');
    if (p1UpInput) p1UpInput.value = gameConfig.p1Keys.up.toUpperCase();
    if (p1DownInput) p1DownInput.value = gameConfig.p1Keys.down.toUpperCase();
}

// Menu keyboard navigation functions
function initMenuNavigation() {
    // Get all navigable elements in order
    menuState.navigableElements = [
        ...document.querySelectorAll('input[name="gameMode"]'),
        document.getElementById('difficulty'),
        document.getElementById('max-score'),
        document.getElementById('field-width'),
        document.getElementById('p1-up'),
        document.getElementById('p1-down'),
        document.getElementById('start-button')
    ].filter(el => el && !el.closest('#p2-controls-section, #difficulty-section')?.style.display === 'none');
    
    // Set initial focus
    if (menuState.navigableElements.length > 0) {
        setMenuFocus(0);
    }
}

function setMenuFocus(index) {
    // Remove previous focus
    if (menuState.focusedElement) {
        menuState.focusedElement.classList.remove('menu-focused');
    }
    
    // Set new focus
    if (index >= 0 && index < menuState.navigableElements.length) {
        menuState.focusedElement = menuState.navigableElements[index];
        menuState.focusedElement.classList.add('menu-focused');
        menuState.focusedElement.focus();
    }
}

function navigateMenu(direction) {
    if (!menuState.focusedElement) {
        initMenuNavigation();
        return;
    }
    
    const currentIndex = menuState.navigableElements.indexOf(menuState.focusedElement);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'up') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : menuState.navigableElements.length - 1;
    } else if (direction === 'down') {
        newIndex = currentIndex < menuState.navigableElements.length - 1 ? currentIndex + 1 : 0;
    }
    
    setMenuFocus(newIndex);
}

function activateMenuElement() {
    if (!menuState.focusedElement) return;
    
    const element = menuState.focusedElement;
    
    if (element.type === 'radio') {
        element.checked = true;
        element.dispatchEvent(new Event('change'));
    } else if (element.tagName === 'SELECT') {
        // For selects, cycle through options
        const currentIndex = element.selectedIndex;
        const nextIndex = (currentIndex + 1) % element.options.length;
        element.selectedIndex = nextIndex;
        element.dispatchEvent(new Event('change'));
    } else if (element.tagName === 'BUTTON') {
        element.click();
    } else if (element.type === 'text') {
        // For text inputs, enter edit mode (they're already focused)
        element.select();
    }
}

// Initialize preview and apply saved config
updateFieldPreview();
applyConfigToForm();
initMenuNavigation();

// Add keyboard navigation for configuration menu
document.addEventListener('keydown', (e) => {
    // Only handle keys when config screen is visible
    if (!configScreen.classList.contains('hidden')) {
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                navigateMenu('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                navigateMenu('down');
                break;
            case 'Enter':
                e.preventDefault();
                // If no element is focused or start button is focused, start the game
                if (!menuState.focusedElement || menuState.focusedElement === startButton) {
                    startGame();
                } else {
                    activateMenuElement();
                }
                break;
            case 'Escape':
                // Clear focus
                if (menuState.focusedElement) {
                    menuState.focusedElement.classList.remove('menu-focused');
                    menuState.focusedElement.blur();
                    menuState.focusedElement = null;
                }
                break;
        }
    }
});

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

// Pause functionality
resumeButton.addEventListener('click', () => {
    gameState.paused = false;
    pauseScreen.classList.add('hidden');
    gameLoop();
});

restartButton.addEventListener('click', () => {
    gameState.paused = false;
    pauseScreen.classList.add('hidden');
    resetGame();
    gameState.gameRunning = true;
    gameLoop();
});

pauseBackToMenuButton.addEventListener('click', () => {
    gameState.paused = false;
    gameState.gameRunning = false;
    pauseScreen.classList.add('hidden');
    gameContainer.classList.add('hidden');
    configScreen.classList.remove('hidden');
    backgroundPreview.classList.remove('hidden');
});

// Keyboard event listeners
document.addEventListener("keydown", (e) => {
    if (gameState.gameRunning) {
        // Handle pause with Escape key
        if (e.key === 'Escape') {
            if (gameState.paused) {
                gameState.paused = false;
                pauseScreen.classList.add('hidden');
                gameLoop();
            } else {
                gameState.paused = true;
                pauseScreen.classList.remove('hidden');
            }
        } else if (!gameState.paused) {
            gameState.keysPressed[e.key.toLowerCase()] = true;
            
        }
    }
});

document.addEventListener("keyup", (e) => {
    if (!gameState.paused) {
        gameState.keysPressed[e.key.toLowerCase()] = false;
    }
});

function startGame() {
    // Get configuration values
    gameConfig.mode = document.querySelector('input[name="gameMode"]:checked').value;
    gameConfig.difficulty = parseInt(document.getElementById('difficulty').value);
    gameConfig.maxScore = parseInt(document.getElementById('max-score').value);
    gameConfig.fieldWidth = parseInt(document.getElementById('field-width').value);
    gameConfig.p1Keys.up = document.getElementById('p1-up').value.toLowerCase();
    gameConfig.p1Keys.down = document.getElementById('p1-down').value.toLowerCase();
    
    // Save configuration to localStorage
    saveGameConfig();
    
    // Update game dimensions
    CONTAINER_WIDTH = gameConfig.fieldWidth;
    gameContainer.style.width = `${CONTAINER_WIDTH}px`;
    document.getElementById('game-svg').setAttribute('viewBox', `0 0 ${CONTAINER_WIDTH} ${CONTAINER_HEIGHT}`);
    
    // Update middle line
    const middleLine = document.getElementById('middle-line');
    middleLine.setAttribute('x', (CONTAINER_WIDTH / 2) - 1);
    
    // Update right paddle position
    setPaddlePosition(paddleRight, CONTAINER_WIDTH - 20, gameState.paddleRightY);
    
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
    gameState.ghostBalls = {};
    gameState.explosiveBalls = {};
    clearExplosionAnimations();
    
    // Clear effect displays
    ['left', 'right'].forEach(player => {
        gameState.effectDisplays[player].forEach(display => {
            if (display.group && display.group.parentNode) {
                display.group.remove();
            }
        });
        gameState.effectDisplays[player] = [];
    });
    
    // Reset paddle sizes
    paddleLeft.setAttribute("height", PADDLE_HEIGHT);
    paddleRight.setAttribute("height", PADDLE_HEIGHT);
    
    // Apply initial paddle positions
    setPaddlePosition(paddleLeft, 10, gameState.paddleLeftY);
    setPaddlePosition(paddleRight, CONTAINER_WIDTH - 20, gameState.paddleRightY);
    
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

function clearExplosionAnimations() {
    gameState.explosionAnimations.forEach(explosion => {
        if (explosion.element && explosion.element.parentNode) {
            explosion.element.remove();
        }
    });
    gameState.explosionAnimations = [];
}

function createExplosionAnimation(centerX, centerY) {
    // Create explosion group
    const explosionGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    explosionGroup.setAttribute("id", `explosion-${Date.now()}`);
    
    // Create multiple concentric circles for explosion effect
    const colors = ["#FFD700", "#FF6B00", "#FF0000", "#8B0000"];
    const circles = [];
    
    for (let i = 0; i < 4; i++) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", centerX);
        circle.setAttribute("cy", centerY);
        circle.setAttribute("r", "5"); // Start with visible radius
        circle.setAttribute("fill", colors[i]);
        circle.setAttribute("opacity", "0.8");
        circle.setAttribute("stroke", "white");
        circle.setAttribute("stroke-width", "1");
        explosionGroup.appendChild(circle);
        circles.push(circle);
    }
    
    document.getElementById('game-svg').appendChild(explosionGroup);
    
    // Add to animations array
    gameState.explosionAnimations.push({
        element: explosionGroup,
        circles: circles,
        centerX: centerX,
        centerY: centerY,
        startTime: Date.now(),
        maxRadius: 80,
        duration: 600 // 0.6 seconds
    });
}

function updateExplosionAnimations() {
    const currentTime = Date.now();
    
    for (let i = gameState.explosionAnimations.length - 1; i >= 0; i--) {
        const explosion = gameState.explosionAnimations[i];
        const elapsed = currentTime - explosion.startTime;
        const progress = elapsed / explosion.duration;
        
        if (progress >= 1) {
            // Animation finished, remove it
            if (explosion.element && explosion.element.parentNode) {
                explosion.element.remove();
            }
            gameState.explosionAnimations.splice(i, 1);
        } else {
            // Update explosion animation
            explosion.circles.forEach((circle, index) => {
                const delay = index * 0.1; // Stagger the circles
                const circleProgress = Math.max(0, (progress - delay) / (1 - delay));
                
                if (circleProgress > 0) {
                    const radius = 5 + (circleProgress * explosion.maxRadius);
                    const opacity = 0.8 * (1 - circleProgress); // Fade out as it expands
                    
                    circle.setAttribute("r", radius);
                    circle.setAttribute("opacity", opacity);
                }
            });
        }
    }
}

function generateRandomBallSpeed() {
    let randomY = (Math.random() - 0.5) * 12; // -6 to 6
    if (Math.abs(randomY) < 2) {
        randomY = randomY < 0 ? -2 : 2; // Ensure minimum angle
    }
    return randomY;
}

function setBallStartPosition(ball, player) {
    if (player === 'left') {
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
    ball.speedY = generateRandomBallSpeed();
}

function resetBalls() {
    if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
        // Both brick modes: each ball starts from its respective paddle
        setBallStartPosition(gameState.balls[0], 'left');
        setBallStartPosition(gameState.balls[1], 'right');
    } else {
        // Single ball mode (standard pong)
        let startFromLeft = false;
        
        if (gameConfig.mode === 'pvai') {
            startFromLeft = true; // Always start from player in AI mode
        } else if (gameConfig.mode === 'pvp') {
            startFromLeft = Math.random() > 0.5; // Random in PvP
        }
        
        setBallStartPosition(gameState.balls[0], startFromLeft ? 'left' : 'right');
    }
}

function resetSingleBall(ballIndex, losingPlayer = null) {
    // Reset a single ball (used when it goes out of bounds)
    const ball = gameState.balls[ballIndex];
    console.log(`DEBUG: resetSingleBall called for ball ${ballIndex}, losing player: ${losingPlayer}`);
    
    if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
        // Both brick modes: respawn from the losing player's own paddle (like game start)
        if (losingPlayer === 'left' || losingPlayer === 'right') {
            setBallStartPosition(ball, losingPlayer);
            console.log(`DEBUG: Ball ${ballIndex} respawning from ${losingPlayer.toUpperCase()} paddle (${losingPlayer} player lost), x=${ball.x}, speedX=${ball.speedX}`);
        } else {
            // Fallback to original logic (shouldn't happen with new system)
            const fallbackPlayer = ballIndex === 0 ? 'left' : 'right';
            setBallStartPosition(ball, fallbackPlayer);
            console.log(`DEBUG: Ball ${ballIndex} using fallback positioning`);
        }
    } else {
        // Single ball modes - reverse direction toward the last scorer
        ball.x = CONTAINER_WIDTH / 2;
        ball.y = CONTAINER_HEIGHT / 2;
        ball.speedX *= -1;
        ball.speedY = Math.random() > 0.5 ? 3 : -3;
        console.log(`DEBUG: Ball ${ballIndex} reset to center (single ball mode)`);
    }
    
    // Reactivate the ball and make it visible
    ball.active = true;
    ball.element.style.display = 'block';
}

function updatePaddles() {
    const currentTime = Date.now();
    
    // Helper function to update paddle position based on controls
    function updateHumanPaddle(player, upKey, downKey) {
        const isLeft = player === 'left';
        const currentY = isLeft ? gameState.paddleLeftY : gameState.paddleRightY;
        const paddleHeight = getPaddleHeight(player);
        const frozen = gameState.frozenPaddles[player] && currentTime < gameState.frozenPaddles[player];
        
        if (!frozen) {
            let newY = currentY;
            if (gameState.keysPressed[upKey] && currentY > 0) {
                newY -= BASE_PADDLE_SPEED;
            }
            if (gameState.keysPressed[downKey] && currentY < CONTAINER_HEIGHT - paddleHeight) {
                newY += BASE_PADDLE_SPEED;
            }
            
            if (isLeft) {
                gameState.paddleLeftY = newY;
            } else {
                gameState.paddleRightY = newY;
            }
        }
        
        const paddle = isLeft ? paddleLeft : paddleRight;
        const paddleX = isLeft ? 10 : CONTAINER_WIDTH - 20;
        const paddleY = isLeft ? gameState.paddleLeftY : gameState.paddleRightY;
        setPaddlePosition(paddle, paddleX, paddleY);
    }
    
    // Player 1 (left paddle) - always human controlled
    updateHumanPaddle('left', gameConfig.p1Keys.up, gameConfig.p1Keys.down);
    
    // Player 2 (right paddle) - AI or human depending on mode
    const rightFrozen = gameState.frozenPaddles.right && currentTime < gameState.frozenPaddles.right;
    if (gameConfig.mode === 'pvp' || gameConfig.mode === 'brick2p') {
        // Human controlled
        updateHumanPaddle('right', gameConfig.p2Keys.up, gameConfig.p2Keys.down);
    } else {
        // AI controlled (pvai and brick modes)
        if (!rightFrozen) {
            updateAI();
        }
        setPaddlePosition(paddleRight, CONTAINER_WIDTH - 20, gameState.paddleRightY);
    }
}

function updateAI() {
    const aiConfig = AI_CONFIG[gameConfig.difficulty];
    const currentTime = Date.now();
    
    
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
        
        gameState.aiTargetY = predictedY - getRightPaddleHeight() / 2;
    }
    
    // Move AI paddle toward target
    const paddleCenterY = gameState.paddleRightY + getRightPaddleHeight() / 2;
    const targetCenterY = gameState.aiTargetY + getRightPaddleHeight() / 2;
    
    if (Math.abs(paddleCenterY - targetCenterY) > 5) {
        if (paddleCenterY < targetCenterY && gameState.paddleRightY < CONTAINER_HEIGHT - getRightPaddleHeight()) {
            gameState.paddleRightY += Math.min(aiConfig.speed, targetCenterY - paddleCenterY);
        } else if (paddleCenterY > targetCenterY && gameState.paddleRightY > 0) {
            gameState.paddleRightY -= Math.min(aiConfig.speed, paddleCenterY - targetCenterY);
        }
    }
    
    // Ensure paddle stays within bounds
    gameState.paddleRightY = Math.max(0, Math.min(CONTAINER_HEIGHT - getRightPaddleHeight(), gameState.paddleRightY));
}


function updateGhostBallVisibility(ballIndex, ball) {
    const ghostInfo = gameState.ghostBalls[ballIndex];
    if (!ghostInfo) return;
    
    // Determine which paddle the ball is moving toward
    const targetPaddle = ball.speedX > 0 ? 'right' : 'left';
    const distanceToTarget = targetPaddle === 'right' 
        ? CONTAINER_WIDTH - 20 - ball.x  // Distance to right paddle
        : ball.x - 20;                   // Distance to left paddle
    
    const isVisible = ball.element.style.opacity !== '0';
    
    if (distanceToTarget <= 150 && distanceToTarget > 50) {
        // Ball should be invisible (ghost mode)
        if (isVisible) {
            ball.element.style.opacity = '0';
        }
    } else if (distanceToTarget <= 50) {
        // Ball should be visible again
        if (!isVisible) {
            ball.element.style.opacity = '1';
            // Remove ghost effect after one use
            delete gameState.ghostBalls[ballIndex];
        }
    }
}

function explodeBricks(centerX, centerY, explosionRadius, ballOwner) {
    // Create visual explosion animation
    createExplosionAnimation(centerX, centerY);
    
    const bricksToDestroy = [];
    
    for (let brick of gameState.bricks) {
        if (!brick.destroyed) {
            const brickCenterX = brick.x + brick.width / 2;
            const brickCenterY = brick.y + brick.height / 2;
            const distance = Math.sqrt(
                Math.pow(brickCenterX - centerX, 2) + 
                Math.pow(brickCenterY - centerY, 2)
            );
            
            if (distance <= explosionRadius) {
                bricksToDestroy.push(brick);
            }
        }
    }
    
    // Destroy all bricks in explosion radius
    bricksToDestroy.forEach(brick => {
        brick.destroyed = true;
        brick.element.style.display = 'none';
        gameState.bricksRemaining--;
        
        // Award points for each destroyed brick
        if (gameConfig.mode === 'brick2p' || gameConfig.mode === 'brick') {
            if (ballOwner === 'left') {
                gameState.leftScore++;
            } else if (ballOwner === 'right') {
                gameState.rightScore++;
            }
        }
        
        // 10% chance to generate bonus for each destroyed brick
        if (Math.random() < 0.1) {
            generateBonus(brick.x + brick.width / 2, brick.y + brick.height / 2, ballOwner);
        }
    });
    
    if (bricksToDestroy.length > 0) {
        // Award bonus points if this explosion destroyed the last brick(s)
        if (gameState.bricksRemaining === 0 && (gameConfig.mode === 'brick2p' || gameConfig.mode === 'brick')) {
            if (ballOwner === 'left') {
                gameState.leftScore += 10;
            } else if (ballOwner === 'right') {
                gameState.rightScore += 10;
            }
        }
        
        updateScore();
        
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
    }
    
    return bricksToDestroy.length;
}

function checkBrickCollision(ball, ballIndex) {
    const nextBallX = ball.x + ball.speedX;
    const nextBallY = ball.y + ball.speedY;
    
    for (let brick of gameState.bricks) {
        if (!brick.destroyed) {
            // Check if ball will intersect with brick on next frame
            if (nextBallX + BALL_RADIUS >= brick.x &&
                nextBallX - BALL_RADIUS <= brick.x + brick.width &&
                nextBallY + BALL_RADIUS >= brick.y &&
                nextBallY - BALL_RADIUS <= brick.y + brick.height) {
                
                // Check if ball has explosive effect
                const explosiveInfo = gameState.explosiveBalls[ballIndex];
                if (explosiveInfo) {
                    // Explosive collision - destroy multiple bricks
                    const brickCenterX = brick.x + brick.width / 2;
                    const brickCenterY = brick.y + brick.height / 2;
                    explodeBricks(brickCenterX, brickCenterY, 60, ball.owner); // 60px explosion radius
                } else {
                    // Normal collision - destroy single brick
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
                        
                        // Award bonus points if this was the last brick
                        if (gameState.bricksRemaining === 0) {
                            if (ball.owner === 'left') {
                                gameState.leftScore += 10;
                            } else if (ball.owner === 'right') {
                                gameState.rightScore += 10;
                            }
                        }
                        
                        updateScore();
                    }
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
                
                // Check if all bricks are destroyed (only for non-explosive collisions)
                if (!explosiveInfo && gameState.bricksRemaining === 0) {
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
        
        // Handle ghost ball visibility
        updateGhostBallVisibility(i, ball);
        
        ball.x += ball.speedX;
        ball.y += ball.speedY;
        
        
        // Top and bottom collision
        if (ball.y - BALL_RADIUS <= 0 || ball.y + BALL_RADIUS >= CONTAINER_HEIGHT) {
            ball.speedY *= -1;
            ball.y = ball.y - BALL_RADIUS <= 0 ? BALL_RADIUS : CONTAINER_HEIGHT - BALL_RADIUS;
        }
        
        // Check brick collisions in brick modes (before updating position)
        if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
            if (checkBrickCollision(ball, i)) {
                // If collision occurred, don't update ball position this frame
                setBallPosition(ball.element, ball.x, ball.y);
                continue;
            }
        }
        
        // Helper function for paddle collision detection and handling
        function handlePaddleCollision(player) {
            const isLeft = player === 'left';
            const paddleX = isLeft ? 20 : CONTAINER_WIDTH - 20;
            const paddleY = isLeft ? gameState.paddleLeftY : gameState.paddleRightY;
            const paddleHeight = getPaddleHeight(player);
            const collisionCondition = isLeft 
                ? (ball.x - BALL_RADIUS <= 20 && ball.x - BALL_RADIUS > 10 && ball.speedX < 0)
                : (ball.x + BALL_RADIUS >= CONTAINER_WIDTH - 20 && ball.x + BALL_RADIUS < CONTAINER_WIDTH - 10 && ball.speedX > 0);
            
            if (collisionCondition &&
                ball.y >= paddleY &&
                ball.y <= paddleY + paddleHeight) {
                
                ball.owner = player; // Update ownership
                
                // Normal bounce
                ball.speedX *= -1;
                ball.x = isLeft ? paddleX + BALL_RADIUS : paddleX - BALL_RADIUS;
                // Add spin based on where ball hits paddle
                const hitPosition = (ball.y - paddleY) / paddleHeight;
                ball.speedY = (hitPosition - 0.5) * 8;
                return true;
            }
            return false;
        }
        
        // Check paddle collisions
        handlePaddleCollision('left');
        handlePaddleCollision('right');
        
        // Scoring
        if (ball.x < 0) {
            console.log(`DEBUG: Ball ${i} went out left side (x=${ball.x}), starting countdown for left player`);
            if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
                // In brick modes, award point and handle ball respawn
                gameState.rightScore++;
                updateScore();
                handleBrickModeballLoss(i, 'left'); // Handle ball loss in brick mode
            } else {
                gameState.rightScore++;
                updateScore();
                if (gameState.rightScore >= gameConfig.maxScore) {
                    gameOver("Player 2");
                } else {
                    // Deactivate the ball that went out
                    ball.active = false;
                    ball.element.style.display = 'none';
                    
                    // Only start countdown if less than 2 balls remain in total
                    const activeBalls = gameState.balls.filter(b => b.active);
                    if (activeBalls.length < 2) {
                        // Check if left player has no balls coming towards them
                        const ballsTowardLeft = activeBalls.filter(b => b.speedX < 0); // Moving left
                        if (ballsTowardLeft.length === 0) {
                            // Left player has no incoming balls, start countdown for them
                            startBallCountdown(i, 'left');
                        }
                    }
                }
            }
        }
        
        if (ball.x > CONTAINER_WIDTH) {
            console.log(`DEBUG: Ball ${i} went out right side (x=${ball.x}), starting countdown for right player`);
            if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
                // In brick modes, award point and handle ball respawn
                gameState.leftScore++;
                updateScore();
                handleBrickModeballLoss(i, 'right'); // Handle ball loss in brick mode
            } else {
                gameState.leftScore++;
                updateScore();
                if (gameState.leftScore >= gameConfig.maxScore) {
                    gameOver("Player 1");
                } else {
                    // Deactivate the ball that went out
                    ball.active = false;
                    ball.element.style.display = 'none';
                    
                    // Only start countdown if less than 2 balls remain in total
                    const activeBalls = gameState.balls.filter(b => b.active);
                    if (activeBalls.length < 2) {
                        // Check if right player has no balls coming towards them
                        const ballsTowardRight = activeBalls.filter(b => b.speedX > 0); // Moving right
                        if (ballsTowardRight.length === 0) {
                            // Right player has no incoming balls, start countdown for them
                            startBallCountdown(i, 'right');
                        }
                    }
                }
            }
        }
        
        // Apply ball position
        setBallPosition(ball.element, ball.x, ball.y);
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
    if (gameState.gameRunning && !gameState.paused) {
        updatePaddles();
        updateBalls();
        updateBonuses();
        updateLasers();
        updateAutoLasers();
        updateCountdowns();
        updateEffects();
        updateExplosionAnimations();
        requestAnimationFrame(gameLoop);
    }
}

// Brick Mode Ball Loss Handler
function handleBrickModeballLoss(ballIndex, losingPlayer) {
    const ball = gameState.balls[ballIndex];
    ball.active = false;
    ball.element.style.display = 'none';
    
    console.log(`DEBUG: Ball ${ballIndex} lost by ${losingPlayer} in brick mode`);
    
    // In brick mode, determine ball ownership:
    // Ball 0 belongs to left player, Ball 1 belongs to right player
    const ballOwner = ballIndex === 0 ? 'left' : 'right';
    
    console.log(`DEBUG: Ball ${ballIndex} owner is ${ballOwner}, losing player is ${losingPlayer}`);
    
    if (ballOwner === losingPlayer) {
        // This ball belongs to the losing player - start countdown
        console.log(`DEBUG: Ball ${ballIndex} belongs to losing player ${losingPlayer} - starting countdown`);
        startBallCountdown(ballIndex, losingPlayer);
    } else {
        // This ball belongs to the winning player - respawn immediately for the winner
        console.log(`DEBUG: Ball ${ballIndex} belongs to winning player ${ballOwner} - respawning immediately for ${ballOwner}`);
        setTimeout(() => {
            resetSingleBall(ballIndex, ballOwner); // Use ballOwner, not losingPlayer
        }, 100); // Small delay to avoid visual glitches
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
                    console.log(`DEBUG: Respawning ball ${ballToRespawn} (priority order) for losing player: ${countdown.playerSide}`);
                    resetSingleBall(ballToRespawn, countdown.playerSide);
                }
            } else {
                // Single ball to respawn
                const ballsToRespawn = getBallsToRespawn(countdown.playerSide, 1);
                console.log(`DEBUG: Single ball countdown finished for ${countdown.playerSide}. Should respawn: ${ballsToRespawn}`);
                if (ballsToRespawn > 0) {
                    console.log(`DEBUG: Respawning ball ${ballIndex} for losing player: ${countdown.playerSide}`);
                    resetSingleBall(parseInt(ballIndex), countdown.playerSide);
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
    
    // In brick modes, players always get all their lost balls back
    if (gameConfig.mode === 'brick' || gameConfig.mode === 'brick2p') {
        console.log(`DEBUG: getBallsToRespawn (BRICK mode) - Player: ${playerSide}, BallsLost: ${ballsLost}, Will respawn ALL: ${ballsLost}`);
        return ballsLost; // Always respawn all balls in brick mode
    }
    
    // In standard pong modes, player should have at least 1 ball
    let baseBalls = 1;
    
    // If multi-ball is active, player should have 2 balls total
    if (hasMultiBall) {
        baseBalls = 2;
    }
    
    console.log(`DEBUG: getBallsToRespawn (PONG mode) - Player: ${playerSide}, HasMultiBall: ${hasMultiBall}, BaseBalls: ${baseBalls}, BallsLost: ${ballsLost}`);
    
    // Return the number of balls this player should have (up to the number lost)
    const result = Math.min(ballsLost, baseBalls);
    console.log(`DEBUG: Will respawn ${result} balls`);
    return result;
}

// Effect Display System
function updateEffectDisplay(player) {
    const effects = gameState.activeEffects[player];
    const currentTime = Date.now();
    const container = player === 'left' ? effectsLeft : effectsRight;
    
    // Check if container exists
    if (!container) {
        console.error(`Effect container for ${player} not found!`);
        return;
    }
    
    // Clear existing displays
    container.innerHTML = '';
    
    // Display active effects with circular progress
    Object.keys(effects).forEach(effectType => {
        const effect = effects[effectType];
        if (effect && effect.duration && (currentTime - effect.startTime) < effect.duration) {
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.duration; // 0 to 1
            const remaining = 1 - progress; // 1 to 0
            const isDebuff = isEffectDebuff(effectType);
            
            // Create effect icon container
            const iconDiv = document.createElement('div');
            iconDiv.className = 'effect-icon';
            iconDiv.textContent = getEffectIcon(effectType);
            
            // Create progress ring using CSS
            const progressDiv = document.createElement('div');
            progressDiv.className = `effect-progress ${isDebuff ? 'debuff' : ''}`;
            
            // Set CSS custom property for progress
            const progressPercent = remaining * 100; // remaining goes from 1 to 0
            progressDiv.style.setProperty('--progress', progressPercent);
            
            iconDiv.appendChild(progressDiv);
            container.appendChild(iconDiv);
        }
    });
}

function getEffectIcon(effectType) {
    switch (effectType) {
        case 'bigPaddle': return '🏓';
        case 'multiBall': return '🎱';
        case 'laser': return '🔫';
        case 'slowBall': return '🐢';
        case 'explosiveBall': return '💥';
        case 'ghostWarning': return '👻';
        default: return '❓';
    }
}

function isEffectDebuff(effectType) {
    // Slow ball and ghost warning are debuffs/warnings
    return effectType === 'slowBall' || effectType === 'ghostWarning';
}

function getEffectDisplayName(effectType) {
    switch (effectType) {
        case 'bigPaddle': return '🏓 Big';
        case 'multiBall': return '🎱 Multi';
        case 'laser': return '🔫 Laser';
        case 'slowBall': return '🐢 Slow';
        case 'explosiveBall': return '💥 Boom';
        case 'ghostWarning': return '👻 Ghost';
        default: return effectType;
    }
}

function getEffectColor(effectType) {
    switch (effectType) {
        case 'bigPaddle': return '#4CAF50';
        case 'multiBall': return '#2196F3';
        case 'laser': return '#FF5722';
        case 'slowBall': return '#9C27B0';
        case 'explosiveBall': return '#E91E63';
        case 'ghostWarning': return '#607D8B';
        default: return '#FFF';
    }
}

// Bonus name display removed - only effect icons with circles are shown

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
        case BONUS_TYPES.GHOST_BALL: return '#607D8B';
        case BONUS_TYPES.EXPLOSIVE_BALL: return '#E91E63';
        default: return '#FFF';
    }
}

function getBonusIcon(type) {
    switch (type) {
        case BONUS_TYPES.BIG_PADDLE: return '🏓';
        case BONUS_TYPES.MULTI_BALL: return '🎱';
        case BONUS_TYPES.LASER_PADDLE: return '🔫';
        case BONUS_TYPES.SLOW_BALL: return '🐢';
        case BONUS_TYPES.GHOST_BALL: return '👻';
        case BONUS_TYPES.EXPLOSIVE_BALL: return '💥';
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
        bonus.y >= gameState.paddleLeftY && bonus.y <= gameState.paddleLeftY + getLeftPaddleHeight()) {
        applyBonus(bonus.type, 'left');
        return true;
    }
    
    // Check right paddle
    if (bonus.x >= CONTAINER_WIDTH - 20 && bonus.x <= CONTAINER_WIDTH - 10 && 
        bonus.y >= gameState.paddleRightY && bonus.y <= gameState.paddleRightY + getRightPaddleHeight()) {
        applyBonus(bonus.type, 'right');
        return true;
    }
    
    return false;
}

function applyBonus(type, player) {
    const effects = gameState.activeEffects[player];
    
    // Bonus names are no longer displayed - only effect icons with circles are shown
    
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
            createMultiBall(player);
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
            // Apply slow effect to opponent's side, but show effect icon on opponent's side too
            const opponentSide = player === 'left' ? 'right' : 'left';
            const opponentEffects = gameState.activeEffects[opponentSide];
            
            if (opponentEffects.slowBall) {
                // Extend existing effect on opponent
                opponentEffects.slowBall.duration += 7000;
            } else {
                // Create new effect on opponent
                opponentEffects.slowBall = {
                    duration: 7000,
                    startTime: Date.now()
                };
            }
            applySlowBall(player);
            break;
            
        case BONUS_TYPES.GHOST_BALL:
            // Apply ghost effect to one of the player's balls
            applyGhostBall(player);
            
            // Show temporary indicator on opponent that a ghost ball is incoming
            const ghostOpponentSide = player === 'left' ? 'right' : 'left';
            const ghostOpponentEffects = gameState.activeEffects[ghostOpponentSide];
            ghostOpponentEffects.ghostWarning = {
                duration: 3000, // 3 seconds warning
                startTime: Date.now()
            };
            break;
            
        case BONUS_TYPES.EXPLOSIVE_BALL:
            if (effects.explosiveBall) {
                // Extend existing effect
                effects.explosiveBall.duration += 10000;
            } else {
                // Create new effect
                effects.explosiveBall = {
                    duration: 10000, // 10 seconds
                    startTime: Date.now()
                };
            }
            applyExplosiveBall(player);
            break;
            
    }
}

function updatePaddleSize(player) {
    const paddle = player === 'left' ? paddleLeft : paddleRight;
    const effect = gameState.activeEffects[player].bigPaddle;
    const currentHeight = parseInt(paddle.getAttribute("height"));
    const targetHeight = effect && Date.now() - effect.startTime < effect.duration ? 120 : PADDLE_HEIGHT;
    
    // Only update if height actually changed
    if (currentHeight !== targetHeight) {
        // Update paddle properties first
        paddle.setAttribute("height", targetHeight);
        paddle.setAttribute("href", targetHeight > PADDLE_HEIGHT ? "icons/paddle-big.svg" : "icons/paddle.svg");
        
        // If paddle would go out of bounds (bottom), adjust position slightly
        const currentY = player === 'left' ? gameState.paddleLeftY : gameState.paddleRightY;
        if (currentY + targetHeight > CONTAINER_HEIGHT) {
            const newY = CONTAINER_HEIGHT - targetHeight;
            const paddleX = player === 'left' ? 10 : CONTAINER_WIDTH - 20;
            
            if (player === 'left') {
                gameState.paddleLeftY = newY;
            } else {
                gameState.paddleRightY = newY;
            }
            setPaddlePosition(paddle, paddleX, newY);
        }
        // If paddle is at top and shrinking, no adjustment needed
        // The paddle naturally grows/shrinks from its current position
    }
    
    // Clean up expired effects
    if (!effect || Date.now() - effect.startTime >= effect.duration) {
        delete gameState.activeEffects[player].bigPaddle;
    }
}

function createMultiBall(player) {
    // Find a ball belonging to this player to duplicate
    const playerBalls = gameState.balls.filter(ball => ball.active && ball.owner === player);
    if (playerBalls.length === 0) {
        console.log('No balls found for player', player, 'to duplicate');
        return; // No balls to duplicate
    }
    
    // Pick a random ball from the player's balls to duplicate
    const sourceBall = playerBalls[Math.floor(Math.random() * playerBalls.length)];
    
    // Find inactive ball or create new one
    let newBall = gameState.balls.find(ball => !ball.active);
    
    if (!newBall) {
        // Create new ball element using image like the main balls
        const ballElement = document.createElementNS("http://www.w3.org/2000/svg", "image");
        ballElement.setAttribute("width", "12");
        ballElement.setAttribute("height", "12");
        ballElement.setAttribute("href", "icons/ball.svg");
        ballElement.style.display = 'none';
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
    
    // Duplicate the source ball at its current position
    newBall.active = true;
    newBall.element.style.display = 'block';
    newBall.x = sourceBall.x + (Math.random() - 0.5) * 20; // Small random offset
    newBall.y = sourceBall.y + (Math.random() - 0.5) * 20;
    newBall.owner = player;
    
    // Give it a completely random angle but reasonable speed
    const randomAngle = Math.random() * 2 * Math.PI; // 0 to 2π
    const speed = BASE_BALL_SPEED;
    newBall.speedX = Math.cos(randomAngle) * speed;
    newBall.speedY = Math.sin(randomAngle) * speed;
    
    // Update visual position
    setBallPosition(newBall.element, newBall.x, newBall.y);
}

function applySlowBall(player) {
    // Slow down opponent's balls only
    const opponentSide = player === 'left' ? 'right' : 'left';
    
    for (let ball of gameState.balls) {
        if (ball.active && ball.owner === opponentSide) {
            // Only slow down if not already slowed (prevent multiple applications)
            const currentSpeed = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
            if (currentSpeed > BASE_BALL_SPEED * 0.6) {
                ball.speedX *= 0.5;
                ball.speedY *= 0.5;
            }
        }
    }
}

function applyGhostBall(player) {
    // Find an active ball belonging to this player to make ghostly
    const playerBalls = gameState.balls
        .map((ball, index) => ({ball, index}))
        .filter(({ball}) => ball.active && ball.owner === player);
    
    if (playerBalls.length > 0) {
        // Pick a random ball from the player's balls
        const randomBall = playerBalls[Math.floor(Math.random() * playerBalls.length)];
        
        // Apply ghost effect (one-time use)
        gameState.ghostBalls[randomBall.index] = {
            player: player,
            applied: false
        };
    }
}

function applyExplosiveBall(player) {
    // Find an active ball belonging to this player to make explosive
    const playerBalls = gameState.balls
        .map((ball, index) => ({ball, index}))
        .filter(({ball}) => ball.active && ball.owner === player);
    
    if (playerBalls.length > 0) {
        // Pick a random ball from the player's balls
        const randomBall = playerBalls[Math.floor(Math.random() * playerBalls.length)];
        
        // Apply explosive effect (temporary)
        gameState.explosiveBalls[randomBall.index] = {
            player: player,
            startTime: Date.now()
        };
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
    
    // Clean up expired explosive balls
    const currentTime = Date.now();
    Object.keys(gameState.explosiveBalls).forEach(ballIndex => {
        const explosiveInfo = gameState.explosiveBalls[ballIndex];
        const player = explosiveInfo.player;
        const playerEffects = gameState.activeEffects[player];
        
        if (!playerEffects.explosiveBall || 
            currentTime - playerEffects.explosiveBall.startTime >= playerEffects.explosiveBall.duration) {
            delete gameState.explosiveBalls[ballIndex];
        }
    });
    
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
        
        // Check collision with enemy paddle
        if (checkLaserPaddleCollision(laser)) {
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
            
            // Award points based on laser ownership (both brick modes)
            if (gameConfig.mode === 'brick2p' || gameConfig.mode === 'brick') {
                if (laser.owner === 'left') {
                    gameState.leftScore++;
                } else if (laser.owner === 'right') {
                    gameState.rightScore++;
                }
                
                // Award bonus points if this was the last brick
                if (gameState.bricksRemaining === 0) {
                    if (laser.owner === 'left') {
                        gameState.leftScore += 10;
                    } else if (laser.owner === 'right') {
                        gameState.rightScore += 10;
                    }
                }
                
                updateScore();
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

function checkLaserPaddleCollision(laser) {
    // Check if laser hits enemy paddle
    const enemyPlayer = laser.player === 'left' ? 'right' : 'left';
    
    if (enemyPlayer === 'left') {
        // Check collision with left paddle
        if (laser.x >= 10 && laser.x <= 20 && 
            laser.y >= gameState.paddleLeftY && laser.y <= gameState.paddleLeftY + getLeftPaddleHeight()) {
            // Hit left paddle - reduce left player's score
            gameState.leftScore = Math.max(0, gameState.leftScore - 5);
            updateScore();
            console.log(`Laser from right player hit left paddle! Left score reduced to ${gameState.leftScore}`);
            return true;
        }
    } else {
        // Check collision with right paddle
        if (laser.x >= CONTAINER_WIDTH - 20 && laser.x <= CONTAINER_WIDTH - 10 && 
            laser.y >= gameState.paddleRightY && laser.y <= gameState.paddleRightY + getRightPaddleHeight()) {
            // Hit right paddle - reduce right player's score
            gameState.rightScore = Math.max(0, gameState.rightScore - 5);
            updateScore();
            console.log(`Laser from left player hit right paddle! Right score reduced to ${gameState.rightScore}`);
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
    laser.setAttribute("y", paddleY + getPaddleHeight(player) / 2 - 1);
    laser.setAttribute("width", "10"); // Horizontal laser beam
    laser.setAttribute("height", "2");
    laser.setAttribute("fill", "#FF5722");
    
    lasersContainer.appendChild(laser);
    
    gameState.lasers.push({
        element: laser,
        x: paddleX,
        y: paddleY + getPaddleHeight(player) / 2,
        speed: 8,
        player: player,
        owner: player
    });
}