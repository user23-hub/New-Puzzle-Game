document.addEventListener('DOMContentLoaded', () => {
    // Puzzle config
    let ROWS = 3, COLS = 4, TILE_COUNT = 10;
    let puzzlePieces = [];
    let moveCount = 0;
    let undoCount = 0;
    let undoStack = [];
    let user = { name: '', phone: '' };
    let timer = null;
    let timeElapsed = 0;
    let level = 1;
    let imagePuzzle = false;
    let imgSrc = null;
    let imgTiles = [];
    let imgLoaded = false;

    const bgLevels = [
        "level-1", "level-2", "level-3",
        "level-4", "level-5", "level-6"
    ];

    // DOM
    const puzzleContainer = document.getElementById('puzzle-container');
    const shuffleButton = document.getElementById('shuffle-button');
    const moveCounter = document.getElementById('move-counter');
    const undoCounter = document.getElementById('undo-counter');
    const userModal = document.getElementById('user-modal');
    const userForm = document.getElementById('user-form');
    const userNameInput = document.getElementById('user-name');
    const userPhoneInput = document.getElementById('user-phone');
    const userInfo = document.getElementById('user-info');
    const gameContainer = document.getElementById('game-container');
    const winOverlay = document.getElementById('win-overlay');
    const letsGoOverlay = document.getElementById('letsgo-overlay');
    const timerElem = document.getElementById('timer');
    const nextLevelBtn = document.getElementById('nextlevel-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingBarInner = document.getElementById('loading-bar-inner');
    const bodyElem = document.body;
    const resetButton = document.getElementById('reset-button');
    const undoButton = document.getElementById('undo-button');
    const toggleMode = document.getElementById('toggle-mode');
    const imgUpload = document.getElementById('img-upload');
    const imgBtn = document.getElementById('img-btn');
    const shareBtn = document.getElementById('share-button');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const moveSound = document.getElementById('move-sound');
    const winSound = document.getElementById('win-sound');

    // Generate pieces array: [1..TILE_COUNT, null, null]
    function getInitialPuzzle() {
        let arr = [...Array(TILE_COUNT).keys()].map(n => n + 1);
        arr.push(null, null); // 2 empty slots
        return arr;
    }

    // UI
    function createPuzzle() {
        puzzleContainer.innerHTML = '';
        for (let i = 0; i < puzzlePieces.length; i++) {
            const piece = puzzlePieces[i];
            const div = document.createElement('div');
            div.className = 'puzzle-piece';
            if (piece) {
                if (imagePuzzle && imgLoaded && imgTiles[piece-1]) {
                    div.style.backgroundImage = `url(${imgTiles[piece-1]})`;
                    div.textContent = '';
                } else {
                    div.style.backgroundImage = '';
                    div.textContent = piece;
                }
            } else {
                div.classList.add('hidden');
                div.textContent = '';
                div.style.backgroundImage = '';
            }
            puzzleContainer.appendChild(div);
        }
    }

    function updateMoveCounter() {
        moveCounter.textContent = `Moves: ${moveCount}`;
        undoCounter.textContent = `Undos: ${undoCount}`;
    }

    function showLetsGoOverlay(cb) {
        letsGoOverlay.style.display = 'flex';
        setTimeout(() => {
            letsGoOverlay.style.display = 'none';
            cb && cb();
        }, 1200);
    }

    function showWinOverlay(text = "WIN", showNextLevel = false) {
        winOverlay.querySelector('span').textContent = text;
        winOverlay.style.display = 'flex';
        nextLevelBtn.style.display = showNextLevel ? '' : 'none';
    }
    function hideWinOverlay() {
        winOverlay.style.display = 'none';
    }

    function showTimer(show) {
        timerElem.style.display = show ? '' : 'none';
    }
    function updateTimer() {
        timerElem.textContent = `Time: ${timeElapsed}s`;
    }
    function startTimer() {
        showTimer(true);
        timeElapsed = 0;
        updateTimer();
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
            timeElapsed++;
            updateTimer();
        }, 1000);
    }
    function resetTimer() {
        if (timer) clearInterval(timer);
        timeElapsed = 0;
        updateTimer();
    }

    // Loading overlay
    function showLoadingOverlay(duration = 5000, cb) {
        loadingOverlay.style.display = 'flex';
        loadingBarInner.style.width = '0%';
        let start = Date.now();
        function animate() {
            let elapsed = Date.now() - start;
            let percent = Math.min(100, (elapsed / duration) * 100);
            loadingBarInner.style.width = percent + '%';
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                loadingBarInner.style.width = '100%';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                    cb && cb();
                }, 200);
            }
        }
        animate();
    }

    // Puzzle logic
    function shufflePuzzle() {
        do {
            for (let i = puzzlePieces.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [puzzlePieces[i], puzzlePieces[j]] = [puzzlePieces[j], puzzlePieces[i]];
            }
        } while (isSolved());
        moveCount = 0;
        undoCount = 0;
        undoStack.length = 0;
        updateMoveCounter();
        createPuzzle();
        hideWinOverlay();
    }

    function getAdjacentIndices(index) {
        const adj = [];
        const row = Math.floor(index / COLS), col = index % COLS;
        if (row > 0) adj.push(index - COLS);
        if (row < ROWS - 1) adj.push(index + COLS);
        if (col > 0) adj.push(index - 1);
        if (col < COLS - 1) adj.push(index + 1);
        return adj;
    }

    function movePiece(index) {
        const emptyIndices = puzzlePieces
            .map((v, i) => v === null ? i : -1)
            .filter(i => i !== -1);
        for (const emptyIndex of emptyIndices) {
            if (getAdjacentIndices(emptyIndex).includes(index)) {
                let prev = puzzlePieces.slice();
                [puzzlePieces[emptyIndex], puzzlePieces[index]] = [puzzlePieces[index], puzzlePieces[emptyIndex]];
                moveCount++;
                undoStack.push(prev);
                updateMoveCounter();
                createPuzzle();
                playSound(moveSound);
                if (isSolved()) {
                    finishLevel();
                }
                break;
            }
        }
    }

    function isSolved() {
        for (let i = 0; i < TILE_COUNT; i++) {
            if (puzzlePieces[i] !== i + 1) return false;
        }
        if (puzzlePieces[TILE_COUNT] !== null || puzzlePieces[TILE_COUNT + 1] !== null) return false;
        return true;
    }

    // User form
    userForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = userNameInput.value.trim();
        const phone = userPhoneInput.value.trim();
        if (!name || !phone.match(/^[0-9]{10,}$/)) {
            alert('Please enter valid name and phone number (at least 10 digits).');
            return;
        }
        user.name = name;
        user.phone = phone;
        userInfo.textContent = `Player: ${user.name} | Phone: ${user.phone}`;
        userModal.style.display = 'none';
        gameContainer.style.display = '';
        // Show loading overlay, then Let's Go, then start game
        showLoadingOverlay(2000, () => {
            showLetsGoOverlay(() => {
                startGame();
            });
        });
    });

    function startGame() {
        imagePuzzle = false;
        imgSrc = null;
        imgTiles = [];
        imgLoaded = false;
        puzzlePieces = getInitialPuzzle();
        moveCount = 0;
        undoCount = 0;
        undoStack.length = 0;
        updateMoveCounter();
        createPuzzle();
        hideWinOverlay();
        showTimer(false);
        resetTimer();
        shufflePuzzle();
        setBodyBgForLevel(1);
        level = 1;
    }

    function startNextLevel() {
        level++;
        setBodyBgForLevel(level);
        puzzlePieces = getInitialPuzzle();
        moveCount = 0;
        undoCount = 0;
        undoStack.length = 0;
        updateMoveCounter();
        createPuzzle();
        hideWinOverlay();
        startTimer();
        shufflePuzzle();
    }

    function setBodyBgForLevel(levelNum) {
        bgLevels.forEach(cls => bodyElem.classList.remove(cls));
        let idx = (levelNum - 1) % bgLevels.length;
        bodyElem.classList.add(bgLevels[idx]);
    }

    function finishLevel() {
        if (timer) clearInterval(timer);
        playSound(winSound);
        showConfetti();
        if (level === 1) {
            showWinOverlay("WIN", true);
        } else {
            showWinOverlay("WIN", false);
        }
    }

    puzzleContainer.addEventListener('click', e => {
        if (e.target.className.includes('puzzle-piece') && !e.target.className.includes('hidden') && winOverlay.style.display !== 'flex' && loadingOverlay.style.display !== 'flex') {
            const index = Array.from(puzzleContainer.children).indexOf(e.target);
            movePiece(index);
        }
    });

    shuffleButton.addEventListener('click', () => {
        if (winOverlay.style.display === 'flex') hideWinOverlay();
        shufflePuzzle();
        if (level > 1) {
            resetTimer();
            startTimer();
        }
    });

    resetButton.addEventListener('click', () => {
        if (winOverlay.style.display === 'flex') hideWinOverlay();
        puzzlePieces = getInitialPuzzle();
        moveCount = 0;
        undoCount = 0;
        undoStack.length = 0;
        updateMoveCounter();
        createPuzzle();
        if (level > 1) {
            resetTimer();
            startTimer();
        }
        shufflePuzzle();
    });

    undoButton.addEventListener('click', () => {
        if (undoStack.length > 0 && winOverlay.style.display !== 'flex' && loadingOverlay.style.display !== 'flex') {
            puzzlePieces = undoStack.pop();
            undoCount++;
            moveCount--;
            updateMoveCounter();
            createPuzzle();
        }
    });

    // Dark/Light mode
    toggleMode.addEventListener('change', (e) => {
        if (toggleMode.checked) {
            bodyElem.classList.remove('light-mode');
            bodyElem.classList.add('dark-mode');
        } else {
            bodyElem.classList.remove('dark-mode');
            bodyElem.classList.add('light-mode');
        }
    });

    // Image Puzzle
    imgBtn.addEventListener('click', () => {
        imgUpload.click();
    });
    imgUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            loadImagePuzzle(url);
        }
    });
    // Demo image if user double-clicks button (for demo/testing)
    imgBtn.addEventListener('dblclick', () => {
        loadImagePuzzle('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80');
    });
    function loadImagePuzzle(url) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = function() {
            imgTiles = sliceImage(img, COLS, ROWS);
            imgLoaded = true;
            imagePuzzle = true;
            puzzlePieces = getInitialPuzzle();
            moveCount = 0;
            undoCount = 0;
            undoStack.length = 0;
            updateMoveCounter();
            createPuzzle();
            shufflePuzzle();
        };
        img.onerror = function() {
            alert("Failed to load image!");
        }
        img.src = url;
        imgSrc = url;
    }
    function sliceImage(img, cols, rows) {
        const tileW = img.width / cols;
        const tileH = img.height / rows;
        const tiles = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (tiles.length >= TILE_COUNT) break;
                const canvas = document.createElement('canvas');
                canvas.width = 80; canvas.height = 80;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, x * tileW, y * tileH, tileW, tileH, 0, 0, 80, 80);
                tiles.push(canvas.toDataURL());
            }
        }
        return tiles;
    }

    // Confetti animation
    function showConfetti() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        confettiCanvas.style.display = 'block';
        let ctx = confettiCanvas.getContext('2d');
        let particles = [];
        for (let i = 0; i < 120; i++) {
            particles.push({
                x: Math.random() * confettiCanvas.width,
                y: Math.random() * confettiCanvas.height/2,
                r: Math.random() * 8 + 4,
                d: Math.random() * 80 + 40,
                color: `hsl(${Math.random()*360},100%,60%)`,
                tilt: Math.random()*10-10
            });
        }
        let angle = 0, tiltAngle = 0;
        function draw() {
            ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
            for(let i=0;i<particles.length;i++) {
                let p = particles[i];
                ctx.beginPath();
                ctx.lineWidth = p.r;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r/3, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.r);
                ctx.stroke();
            }
            update();
        }
        function update() {
            angle += 0.01;
            tiltAngle += 0.1;
            for(let i=0;i<particles.length;i++) {
                let p = particles[i];
                p.y += (Math.cos(angle+p.d) + 3 + p.r/2)/2;
                p.x += Math.sin(angle);
                p.tilt = Math.sin(tiltAngle - i/3) * 15;
                if (p.y > confettiCanvas.height) {
                    p.x = Math.random() * confettiCanvas.width;
                    p.y = -10;
                }
            }
        }
        let anim = setInterval(draw, 16);
        setTimeout(() => {
            clearInterval(anim);
            confettiCanvas.style.display = "none";
        }, 1800);
    }

    // Sound
    function playSound(audioElem) {
        if (!audioElem) return;
        audioElem.currentTime = 0;
        audioElem.play();
    }

    // Share result
    shareBtn.addEventListener('click', () => {
        const text = `🎉 I solved the Sliding Puzzle Game!
Player: ${user.name}
Level: ${level}
Moves: ${moveCount}
Time: ${timeElapsed}s
${imagePuzzle ? "Puzzle Mode: Image" : "Puzzle Mode: Number"}
Try it out yourself!`;
        if (navigator.share) {
            navigator.share({ text })
                .catch(() => {copyToClipboard(text); alert('Result copied to clipboard!')});
        } else {
            copyToClipboard(text);
            alert('Result copied to clipboard!');
        }
    });
    function copyToClipboard(str) {
        const el = document.createElement('textarea');
        el.value = str;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }

    // Win overlay/next level
    winOverlay.addEventListener('click', e => {
        if (e.target === winOverlay && nextLevelBtn.style.display === 'none') {
            hideWinOverlay();
        }
    });
    nextLevelBtn.addEventListener('click', () => {
        hideWinOverlay();
        showTimer(true);
        startNextLevel();
    });

    // Start with modal
    userModal.style.display = 'flex';
    gameContainer.style.display = 'none';
    // Responsiveness for confetti
    window.addEventListener('resize', ()=> {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    });
});