// Harry Potter Yahtzee Game - Full Game Logic with AI Opponent

// Character images mapping (based on your uploaded files)
const characterImages = {
    0: 'src/imports/First-1/dobby.jpg',       // Dobby
    1: 'src/imports/First-1/dumbledore.jpg',  // Dumbledore
    2: 'src/imports/First-1/harry.jpg',       // Harry
    3: 'src/imports/First-1/hermione.jpg',    // Hermione
    4: 'src/imports/First-1/ron.jpg',         // Ron
    5: 'src/imports/First-1/voldemort.jpg',   // Voldemort
    'question': 'src/imports/First-1/questionmark.jpg'
};

// Game state
let rollsLeft = 3;
let diceValues = [null, null, null, null, null, null]; // 6 dice
let heldDice = [false, false, false, false, false, false];
let playerScores = {};
let aiScores = {};
let usedCategories = [];

// AI state
let aiDiceValues = [null, null, null, null, null, null];
let aiHeldDice = [false, false, false, false, false, false];
let aiRollsLeft = 3;
let isAITurn = false;

// Category scoring functions
const categories = {
    'pair': {
        name: 'Pair',
        calculate: (dice) => {
            const counts = countDice(dice);
            for (let char = 5; char >= 0; char--) {
                if (counts[char] >= 2) {
                    return char * 2; // Return sum of the pair
                }
            }
            return 0;
        }
    },
    'two-pairs': {
        name: 'Two Pairs',
        calculate: (dice) => {
            const counts = countDice(dice);
            const pairs = [];
            for (let char = 0; char < 6; char++) {
                if (counts[char] >= 2) {
                    pairs.push(char);
                }
            }
            if (pairs.length >= 2) {
                return pairs[0] * 2 + pairs[1] * 2;
            }
            return 0;
        }
    },
    'three-kind': {
        name: 'Three of a Kind',
        calculate: (dice) => {
            const counts = countDice(dice);
            for (let char = 5; char >= 0; char--) {
                if (counts[char] >= 3) {
                    return dice.reduce((sum, d) => sum + d, 0);
                }
            }
            return 0;
        }
    },
    'four-kind': {
        name: 'Four of a Kind',
        calculate: (dice) => {
            const counts = countDice(dice);
            for (let char = 5; char >= 0; char--) {
                if (counts[char] >= 4) {
                    return dice.reduce((sum, d) => sum + d, 0);
                }
            }
            return 0;
        }
    },
    'full-house': {
        name: 'Full House',
        calculate: (dice) => {
            const counts = countDice(dice);
            let hasThree = false;
            let hasTwo = false;
            for (let char = 0; char < 6; char++) {
                if (counts[char] === 3) hasThree = true;
                if (counts[char] === 2) hasTwo = true;
            }
            return (hasThree && hasTwo) ? 25 : 0;
        }
    },
    'small-straight': {
        name: 'Small Straight',
        calculate: (dice) => {
            const unique = [...new Set(dice)].sort((a, b) => a - b);
            // Check for 4 consecutive numbers
            for (let i = 0; i <= unique.length - 4; i++) {
                if (unique[i+1] === unique[i] + 1 &&
                    unique[i+2] === unique[i] + 2 &&
                    unique[i+3] === unique[i] + 3) {
                    return 30;
                }
            }
            return 0;
        }
    },
    'large-straight': {
        name: 'Large Straight',
        calculate: (dice) => {
            const unique = [...new Set(dice)].sort((a, b) => a - b);
            // Check for 5 consecutive numbers (0,1,2,3,4 or 1,2,3,4,5)
            if (unique.length === 5) {
                if ((unique[0] === 0 && unique[4] === 4) ||
                    (unique[0] === 1 && unique[4] === 5)) {
                    return 40;
                }
            }
            return 0;
        }
    },
    'yahtzee': {
        name: 'YAHTZEE!',
        calculate: (dice) => {
            const counts = countDice(dice);
            for (let char = 0; char < 6; char++) {
                if (counts[char] >= 5) {  // At least 5 matching
                    return 50;
                }
            }
            return 0;
        }
    },
    'chance': {
        name: 'Chance',
        calculate: (dice) => {
            return dice.reduce((sum, d) => sum + d, 0);
        }
    }
};

function countDice(dice) {
    const counts = [0, 0, 0, 0, 0, 0];
    dice.forEach(d => counts[d]++);
    return counts;
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.start-button')) {
        initStartingPage();
    } else if (document.querySelector('.roll-dice-button')) {
        initGamePage();
    }
});

// ============ STARTING PAGE ============
function initStartingPage() {
    const startButton = document.querySelector('.start-button');
    
    startButton.addEventListener('click', () => {
        startButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            startButton.style.transform = 'scale(1)';
        }, 100);
        
        setTimeout(() => {
            window.location.href = 'game.html';
        }, 200);
    });
    
    startButton.style.cursor = 'pointer';
    startButton.style.transition = 'transform 0.1s ease';
}

// ============ GAME PAGE ============
function initGamePage() {
    loadGameState();
    
    const rollButton = document.querySelector('.roll-dice-button');
    const rollsLeftNumber = document.querySelector('.rolls-number');
    const diceItems = document.querySelectorAll('.character-item');
    const scoreCategories = document.querySelectorAll('.score-category');
    
    // Initialize menu and info dropdowns
    initMenuDropdown();
    initInfoDropdown();
    
    // Add data-category attributes if missing
    const categoryClasses = ['one-pair', 'two-pairs', 'three-kind', 'four-kind', 'full-house', 'small-straight', 'large-straight', 'yahtzee', 'chance'];
    const categoryKeys = ['pair', 'two-pairs', 'three-kind', 'four-kind', 'full-house', 'small-straight', 'large-straight', 'yahtzee', 'chance'];
    
    scoreCategories.forEach((category, index) => {
        if (!category.getAttribute('data-category')) {
            category.setAttribute('data-category', categoryKeys[index]);
        }
    });
    
    // Update initial display
    rollsLeftNumber.textContent = rollsLeft;
    updateDiceDisplay();
    updateScoreDisplay();
    updateInstructionText();
    updateHeaderScores();
    
    // Roll button click
    rollButton.addEventListener('click', () => {
        if (rollsLeft > 0 && !isAITurn) {
            rollDice();
            rollsLeft--;
            rollsLeftNumber.textContent = rollsLeft;
            
            // Animation
            rollButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                rollButton.style.transform = 'scale(1)';
            }, 100);
            
            // Update instruction text
            updateInstructionText();
            
            // Disable if no rolls left
            if (rollsLeft === 0) {
                rollButton.style.opacity = '0.5';
                rollButton.style.cursor = 'not-allowed';
            }
            
            saveGameState();
        }
    });
    
    rollButton.style.cursor = 'pointer';
    rollButton.style.transition = 'transform 0.1s ease';
    
    // Make dice clickable to hold/unhold
    diceItems.forEach((diceItem, index) => {
        diceItem.style.cursor = 'pointer';
        
        diceItem.addEventListener('click', () => {
            // Can only hold after first roll and not during AI turn
            if (diceValues[index] !== null && rollsLeft < 3 && !isAITurn) {
                heldDice[index] = !heldDice[index];
                
                if (heldDice[index]) {
                    diceItem.style.border = '3px solid #34c759';
                    diceItem.style.boxShadow = '0px 0px 10px 2px rgba(52, 199, 89, 0.5)';
                } else {
                    diceItem.style.border = '2px solid black';
                    diceItem.style.boxShadow = '0px 4px 4px 0px rgba(0, 0, 0, 0.25)';
                }
                
                saveGameState();
            }
        });
    });
    
    // Make score categories clickable
    scoreCategories.forEach((category) => {
        const categoryKey = category.getAttribute('data-category');
        
        category.style.transition = 'transform 0.1s ease';
        category.style.cursor = 'pointer';
        
        category.addEventListener('mouseenter', () => {
            if (!usedCategories.includes(categoryKey) && diceValues[0] !== null && !isAITurn) {
                category.style.transform = 'translateX(5px)';
            }
        });
        
        category.addEventListener('mouseleave', () => {
            category.style.transform = 'translateX(0)';
        });
        
        category.addEventListener('click', () => {
            if (!usedCategories.includes(categoryKey) && diceValues[0] !== null && !isAITurn) {
                scoreCategory(categoryKey);
            }
        });
    });
}

// ============ MENU AND INFO DROPDOWNS ============
function initMenuDropdown() {
    const menuButton = document.querySelector('.menu-button');
    const menuDropdown = document.querySelector('.menu-dropdown');
    const restartButton = document.querySelector('.restart-game');
    
    if (menuButton && menuDropdown) {
        // Toggle menu dropdown
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('show');
            // Close info dropdown if open
            const infoDropdown = document.querySelector('.info-dropdown');
            if (infoDropdown) {
                infoDropdown.classList.remove('show');
            }
        });
        
        // Restart game
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                const confirm = window.confirm('Are you sure you want to restart the game? All progress will be lost.');
                if (confirm) {
                    restartGame();
                    menuDropdown.classList.remove('show');
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuButton.contains(e.target) && !menuDropdown.contains(e.target)) {
                menuDropdown.classList.remove('show');
            }
        });
    }
}

function initInfoDropdown() {
    const infoButton = document.querySelector('.info-button');
    const infoDropdown = document.querySelector('.info-dropdown');
    
    if (infoButton && infoDropdown) {
        // Toggle info dropdown
        infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            infoDropdown.classList.toggle('show');
            // Close menu dropdown if open
            const menuDropdown = document.querySelector('.menu-dropdown');
            if (menuDropdown) {
                menuDropdown.classList.remove('show');
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!infoButton.contains(e.target) && !infoDropdown.contains(e.target)) {
                infoDropdown.classList.remove('show');
            }
        });
    }
}

function restartGame() {
    // Clear all game state
    rollsLeft = 3;
    diceValues = [null, null, null, null, null, null];
    heldDice = [false, false, false, false, false, false];
    playerScores = {};
    aiScores = {};
    usedCategories = [];
    isAITurn = false;
    
    // Clear localStorage
    localStorage.removeItem('yahtzee_rollsLeft');
    localStorage.removeItem('yahtzee_diceValues');
    localStorage.removeItem('yahtzee_heldDice');
    localStorage.removeItem('yahtzee_playerScores');
    localStorage.removeItem('yahtzee_aiScores');
    localStorage.removeItem('yahtzee_usedCategories');
    
    // Update UI
    const rollsLeftNumber = document.querySelector('.rolls-number');
    const rollButton = document.querySelector('.roll-dice-button');
    
    if (rollsLeftNumber) rollsLeftNumber.textContent = rollsLeft;
    if (rollButton) {
        rollButton.style.opacity = '1';
        rollButton.style.cursor = 'pointer';
    }
    
    updateDiceDisplay();
    updateScoreDisplay();
    updateInstructionText();
    updateHeaderScores();
    
    // Reset category boxes
    const scoreCategories = document.querySelectorAll('.score-category');
    scoreCategories.forEach((category) => {
        category.querySelector('.category-box').style.background = 'white';
        category.style.cursor = 'pointer';
        category.style.opacity = '1';
    });
}

function updateInstructionText() {
    const instructionText = document.querySelector('.instruction-text');
    if (instructionText) {
        if (rollsLeft === 3) {
            instructionText.textContent = "Click 'Roll Dice' to start your turn!";
        } else if (rollsLeft > 0) {
            instructionText.textContent = "Click dice to hold them before re-rolling!";
        } else {
            instructionText.textContent = "Choose a category to score!";
        }
    }
}

function rollDice() {
    const diceItems = document.querySelectorAll('.character-item');
    
    // Roll animation
    let animationFrames = 0;
    const maxFrames = 10;
    
    const rollAnimation = setInterval(() => {
        diceItems.forEach((item, index) => {
            if (!heldDice[index]) {
                const randomChar = Math.floor(Math.random() * 6);
                const img = item.querySelector('img');
                if (img) {
                    img.src = characterImages[randomChar];
                }
            }
        });
        
        animationFrames++;
        if (animationFrames >= maxFrames) {
            clearInterval(rollAnimation);
            
            // Set final values
            for (let i = 0; i < 6; i++) {
                if (!heldDice[i]) {
                    diceValues[i] = Math.floor(Math.random() * 6);
                }
            }
            
            updateDiceDisplay();
        }
    }, 50);
}

function updateDiceDisplay() {
    const diceItems = document.querySelectorAll('.character-item');
    
    diceItems.forEach((item, index) => {
        const img = item.querySelector('img');
        if (img) {
            if (diceValues[index] !== null) {
                img.src = characterImages[diceValues[index]];
            } else {
                img.src = characterImages['question'];
            }
        }
        
        // Maintain held state visually
        if (heldDice[index]) {
            item.style.border = '3px solid #34c759';
            item.style.boxShadow = '0px 0px 10px 2px rgba(52, 199, 89, 0.5)';
        } else {
            item.style.border = '2px solid black';
            item.style.boxShadow = '0px 4px 4px 0px rgba(0, 0, 0, 0.25)';
        }
    });
}

function scoreCategory(categoryKey) {
    // Calculate score for current dice
    const score = categories[categoryKey].calculate(diceValues);
    
    // Save player score
    playerScores[categoryKey] = score;
    usedCategories.push(categoryKey);
    
    // Update display
    updateScoreDisplay();
    updateHeaderScores();
    
    // Reset player round
    resetRound();
    
    // Start AI turn after delay
    setTimeout(() => {
        startAITurn(categoryKey);
    }, 1000);
    
    saveGameState();
}

// ============ AI GAMEPLAY ============
async function startAITurn(categoryKey) {
    isAITurn = true;
    aiRollsLeft = 3;
    aiDiceValues = [null, null, null, null, null, null];
    aiHeldDice = [false, false, false, false, false, false];
    
    // Show AI is thinking
    const instructionText = document.querySelector('.instruction-text');
    if (instructionText) {
        instructionText.textContent = "🤖 AI is thinking...";
    }
    
    await sleep(800);
    
    // AI rolls up to 3 times with strategy
    while (aiRollsLeft > 0) {
        if (instructionText) {
            instructionText.textContent = `🤖 AI is rolling... (${3 - aiRollsLeft + 1}/3)`;
        }
        
        // AI rolls dice
        for (let i = 0; i < 6; i++) {
            if (!aiHeldDice[i]) {
                aiDiceValues[i] = Math.floor(Math.random() * 6);
            }
        }
        
        aiRollsLeft--;
        await sleep(1000);
        
        // AI decides which dice to hold
        if (aiRollsLeft > 0) {
            if (instructionText) {
                instructionText.textContent = "🤖 AI is analyzing dice...";
            }
            await sleep(800);
            aiDecideHolding(categoryKey);
            await sleep(1000);
        }
    }
    
    // AI scores the category
    if (instructionText) {
        instructionText.textContent = "🤖 AI is scoring...";
    }
    await sleep(800);
    
    const aiScore = categories[categoryKey].calculate(aiDiceValues);
    aiScores[categoryKey] = aiScore;
    updateScoreDisplay();
    updateHeaderScores();
    
    // Flash the scored category
    const categoryElement = document.querySelector(`[data-category="${categoryKey}"]`);
    if (categoryElement) {
        const originalBg = categoryElement.querySelector('.category-box').style.background;
        categoryElement.querySelector('.category-box').style.background = '#fffacd';
        setTimeout(() => {
            categoryElement.querySelector('.category-box').style.background = originalBg;
        }, 500);
    }
    
    await sleep(1500);
    
    // Reset for next turn
    if (instructionText) {
        instructionText.textContent = "Click 'Roll Dice' to start your turn!";
    }
    
    isAITurn = false;
    
    // Check if game is over
    if (usedCategories.length === 9) {
        endGame();
    }
    
    saveGameState();
}

function aiDecideHolding(targetCategory) {
    // AI strategy: hold dice that contribute to the target category
    const counts = countDice(aiDiceValues);
    
    // Reset all holds first
    aiHeldDice = [false, false, false, false, false, false];
    
    // Strategy based on category
    switch(targetCategory) {
        case 'yahtzee':
            // Hold the most common character
            const mostCommonChar = counts.indexOf(Math.max(...counts));
            aiDiceValues.forEach((val, i) => {
                if (val === mostCommonChar) aiHeldDice[i] = true;
            });
            break;
            
        case 'four-kind':
        case 'three-kind':
            // Hold any characters that appear 2+ times
            const repeatedChars = counts.map((count, char) => count >= 2 ? char : -1).filter(c => c !== -1);
            if (repeatedChars.length > 0) {
                const targetChar = repeatedChars[0];
                aiDiceValues.forEach((val, i) => {
                    if (val === targetChar) aiHeldDice[i] = true;
                });
            }
            break;
            
        case 'full-house':
            // Hold pairs and triples
            const pairChars = [];
            counts.forEach((count, char) => {
                if (count >= 2) pairChars.push(char);
            });
            if (pairChars.length >= 1) {
                aiDiceValues.forEach((val, i) => {
                    if (pairChars.includes(val)) aiHeldDice[i] = true;
                });
            }
            break;
            
        case 'small-straight':
        case 'large-straight':
            // Hold dice that form sequences
            const sorted = [...new Set(aiDiceValues)].sort((a, b) => a - b);
            aiDiceValues.forEach((val, i) => {
                if (sorted.includes(val)) {
                    // Check if part of potential straight
                    const index = sorted.indexOf(val);
                    if (index > 0 && sorted[index - 1] === val - 1) aiHeldDice[i] = true;
                    if (index < sorted.length - 1 && sorted[index + 1] === val + 1) aiHeldDice[i] = true;
                }
            });
            break;
            
        case 'pair':
        case 'two-pairs':
            // Hold any pairs
            counts.forEach((count, char) => {
                if (count >= 2) {
                    aiDiceValues.forEach((val, i) => {
                        if (val === char) aiHeldDice[i] = true;
                    });
                }
            });
            break;
            
        case 'chance':
            // Hold higher value dice (4, 5)
            aiDiceValues.forEach((val, i) => {
                if (val >= 4) aiHeldDice[i] = true;
            });
            break;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function resetRound() {
    rollsLeft = 3;
    diceValues = [null, null, null, null, null, null];
    heldDice = [false, false, false, false, false, false];
    
    const rollsLeftNumber = document.querySelector('.rolls-number');
    const rollButton = document.querySelector('.roll-dice-button');
    
    if (rollsLeftNumber) rollsLeftNumber.textContent = rollsLeft;
    if (rollButton) {
        rollButton.style.opacity = '1';
        rollButton.style.cursor = 'pointer';
    }
    
    updateDiceDisplay();
    updateInstructionText();
}

function endGame() {
    // Calculate total scores
    const playerTotal = Object.values(playerScores).reduce((sum, score) => sum + score, 0);
    const aiTotal = Object.values(aiScores).reduce((sum, score) => sum + score, 0);
    
    // Show winner
    const winner = playerTotal > aiTotal ? '🎉 You Win!' : (playerTotal < aiTotal ? '🤖 AI Wins!' : '🤝 It\'s a Tie!');
    
    setTimeout(() => {
        alert(`🎮 GAME OVER!\n\n👤 Your Score: ${playerTotal}\n🤖 AI Score: ${aiTotal}\n\n${winner}`);
        
        // Ask to play again
        const playAgain = confirm('Would you like to play again?');
        if (playAgain) {
            // Reset game
            playerScores = {};
            aiScores = {};
            usedCategories = [];
            resetRound();
            updateScoreDisplay();
            saveGameState();
        }
    }, 500);
}

function updateScoreDisplay() {
    const scoreCategories = document.querySelectorAll('.score-category');
    
    scoreCategories.forEach((category) => {
        const categoryKey = category.getAttribute('data-category');
        const scoreLabels = category.querySelectorAll('.score-label');
        
        // Update player score
        if (playerScores[categoryKey] !== undefined) {
            scoreLabels[0].textContent = `You: ${playerScores[categoryKey]}`;
        } else {
            scoreLabels[0].textContent = 'You';
        }
        
        // Update AI score
        if (aiScores[categoryKey] !== undefined) {
            scoreLabels[1].textContent = `AI: ${aiScores[categoryKey]}`;
        } else {
            scoreLabels[1].textContent = 'AI';
        }
        
        // Mark used categories
        if (usedCategories.includes(categoryKey)) {
            category.querySelector('.category-box').style.background = '#e0e0e0';
            category.style.cursor = 'not-allowed';
            category.style.opacity = '0.7';
        }
    });
}

function updateHeaderScores() {
    const playerTotal = Object.values(playerScores).reduce((sum, score) => sum + score, 0);
    const aiTotal = Object.values(aiScores).reduce((sum, score) => sum + score, 0);
    
    // Update "You" and "AI" text in header with scores
    const playerYou = document.querySelector('.player-you');
    const playerAI = document.querySelector('.player-ai');
    
    if (playerYou) {
        playerYou.textContent = `You: ${playerTotal}`;
        // Adjust positioning to stay within border
        playerYou.style.left = '12px';
        playerYou.style.fontSize = '9px';
    }
    if (playerAI) {
        playerAI.textContent = `AI: ${aiTotal}`;
        // Adjust positioning to stay within border (right aligned)
        playerAI.style.right = '12px';
        playerAI.style.left = 'auto';
        playerAI.style.fontSize = '9px';
    }
}

// ============ SAVE/LOAD STATE ============
function saveGameState() {
    localStorage.setItem('yahtzee_rollsLeft', rollsLeft);
    localStorage.setItem('yahtzee_diceValues', JSON.stringify(diceValues));
    localStorage.setItem('yahtzee_heldDice', JSON.stringify(heldDice));
    localStorage.setItem('yahtzee_playerScores', JSON.stringify(playerScores));
    localStorage.setItem('yahtzee_aiScores', JSON.stringify(aiScores));
    localStorage.setItem('yahtzee_usedCategories', JSON.stringify(usedCategories));
}

function loadGameState() {
    const savedRollsLeft = localStorage.getItem('yahtzee_rollsLeft');
    const savedDiceValues = localStorage.getItem('yahtzee_diceValues');
    const savedHeldDice = localStorage.getItem('yahtzee_heldDice');
    const savedPlayerScores = localStorage.getItem('yahtzee_playerScores');
    const savedAiScores = localStorage.getItem('yahtzee_aiScores');
    const savedUsedCategories = localStorage.getItem('yahtzee_usedCategories');
    
    if (savedRollsLeft) rollsLeft = parseInt(savedRollsLeft);
    if (savedDiceValues) diceValues = JSON.parse(savedDiceValues);
    if (savedHeldDice) heldDice = JSON.parse(savedHeldDice);
    if (savedPlayerScores) playerScores = JSON.parse(savedPlayerScores);
    if (savedAiScores) aiScores = JSON.parse(savedAiScores);
    if (savedUsedCategories) usedCategories = JSON.parse(savedUsedCategories);
}