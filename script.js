const boardElement = document.getElementById('board');
const statusText = document.getElementById('status');
const qNumberText = document.getElementById('question-number');
const editToolbar = document.getElementById('edit-toolbar');

// ボタン・入力類
const btnPlayMode = document.getElementById('btn-play-mode');
const btnEditMode = document.getElementById('btn-edit-mode');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnSave = document.getElementById('btn-save');
const btnReset = document.getElementById('btn-reset');
const inputJump = document.getElementById('input-jump');
const btnJump = document.getElementById('btn-jump');

// ①盤面サイズを14に変更
const BOARD_SIZE = 14;
const MAX_QUESTIONS = 180; 

let currentMode = 'play'; 
let currentQuestionIndex = 0; 
let isFirstMove = true;      
let currentTurn = 'black';   

let boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

// 180問分のデータ構造
let questionsData = Array(MAX_QUESTIONS).fill(null).map(() => ({
    initialStones: [], 
    correctRow: null,
    correctCol: null
}));

// データの読み込み
const savedData = localStorage.getItem('tsumego_14board_questions');
if (savedData) {
    questionsData = JSON.parse(savedData);
}

// 問題を読み込む
function loadQuestion(index) {
    boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    isFirstMove = true;
    currentTurn = 'black'; 

    const q = questionsData[index];
    q.initialStones.forEach(s => {
        boardState[s.row][s.col] = s.color;
    });

    qNumberText.textContent = `問題 ${index + 1} / ${MAX_QUESTIONS}`;
    inputJump.value = ''; 
    
    if (currentMode === 'play') {
        statusText.textContent = "【解くモード】黒番です。1手目を打ってください。";
        statusText.style.color = "black";
    } else {
        statusText.textContent = "【作るモード】石を配置し、正解地点を設定して保存してください。";
        statusText.style.color = "blue";
    }
    createBoard();
}

// 碁盤の描画
function createBoard() {
    boardElement.innerHTML = '';
    const q = questionsData[currentQuestionIndex];

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const intersection = document.createElement('div');
            intersection.classList.add('intersection');
            intersection.id = `cell-${row}-${col}`;

            if (boardState[row][col]) {
                const stone = document.createElement('div');
                stone.classList.add('stone', boardState[row][col]);
                intersection.appendChild(stone);
            }

            if (currentMode === 'edit' && q.correctRow === row && q.correctCol === col) {
                intersection.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
            }

            intersection.addEventListener('click', () => {
                if (currentMode === 'edit') {
                    handleEditClick(row, col);
                } else {
                    handlePlayClick(row, col);
                }
            });

            boardElement.appendChild(intersection);
        }
    }
}

// 【解くモード】
function handlePlayClick(row, col) {
    if (boardState[row][col] !== null) return;
    const q = questionsData[currentQuestionIndex];

    if (isFirstMove) {
        if (q.correctRow === null || q.correctCol === null) {
            statusText.textContent = "この問題にはまだ正解地点が設定されていません。";
            return;
        }

        if (row === q.correctRow && col === q.correctCol) {
            statusText.textContent = "🎯 正解！(2手目以降は自由に検討できます)";
            statusText.style.color = "blue";
        } else {
            statusText.textContent = "❌ 残念！そこではないようです。(このまま検討は続けられます)";
            statusText.style.color = "red";
        }
        isFirstMove = false; 
    } else {
        statusText.style.color = "black";
        statusText.textContent = `${currentTurn === 'black' ? '黒' : '白'}を打ちました。自由に検討してください。`;
    }

    boardState[row][col] = currentTurn;
    applyCaptureRules(currentTurn);
    currentTurn = currentTurn === 'black' ? 'white' : 'black';
    createBoard();
}

// 【作るモード】
function handleEditClick(row, col) {
    const selectedTool = document.querySelector('input[name="stone-select"]:checked').value;
    const q = questionsData[currentQuestionIndex];

    if (selectedTool === 'black') {
        boardState[row][col] = 'black';
        if (q.correctRow === row && q.correctCol === col) { q.correctRow = null; q.correctCol = null; }
    } else if (selectedTool === 'white') {
        boardState[row][col] = 'white';
        if (q.correctRow === row && q.correctCol === col) { q.correctRow = null; q.correctCol = null; }
    } else if (selectedTool === 'clear') {
        boardState[row][col] = null;
        if (q.correctRow === row && q.correctCol === col) { q.correctRow = null; q.correctCol = null; }
    } else if (selectedTool === 'correct') {
        if (boardState[row][col] !== null) {
            alert("すでに石がある場所は正解に指定できません。");
            return;
        }
        q.correctRow = row;
        q.correctCol = col;
    }
    createBoard();
}

// 石取りルール
function applyCaptureRules(turnColor) {
    const opponent = turnColor === 'black' ? 'white' : 'black';
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (boardState[r][c] === opponent) {
                const group = [];
                if (!hasLiberty(r, c, opponent, group, {})) {
                    group.forEach(pos => boardState[pos.row][pos.col] = null);
                }
            }
        }
    }
}

function hasLiberty(row, col, color, group, visited) {
    const key = `${row},${col}`;
    if (visited[key]) return false;
    visited[key] = true;
    group.push({ row, col });

    const directions = [{r:-1,c:0}, {r:1,c:0}, {r:0,c:-1}, {r:0,c:1}];
    let hasLib = false;

    for (const dir of directions) {
        const nextR = row + dir.r;
        const nextC = col + dir.c;
        if (nextR < 0 || nextR >= BOARD_SIZE || nextC < 0 || nextC >= BOARD_SIZE) continue;

        if (boardState[nextR][nextC] === null) {
            hasLib = true;
        } else if (boardState[nextR][nextC] === color) {
            if (hasLiberty(nextR, nextC, color, group, visited)) hasLib = true;
        }
    }
    return hasLib;
}

// 保存ボタン
btnSave.addEventListener('click', () => {
    const q = questionsData[currentQuestionIndex];
    q.initialStones = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (boardState[r][c]) {
                q.initialStones.push({ row: r, col: c, color: boardState[r][c] });
            }
        }
    }

    localStorage.setItem('tsumego_14board_questions', JSON.stringify(questionsData));
    alert(`問題 ${currentQuestionIndex + 1} を保存しました！`);
});

// ジャンプ機能
btnJump.addEventListener('click', () => {
    const targetNo = parseInt(inputJump.value, 10);
    if (!isNaN(targetNo) && targetNo >= 1 && targetNo <= MAX_QUESTIONS) {
        currentQuestionIndex = targetNo - 1; 
        loadQuestion(currentQuestionIndex);
    } else {
        alert(`1 から ${MAX_QUESTIONS} の間の数字を入力してください。`);
    }
});

// イベント登録
btnPlayMode.addEventListener('click', () => { currentMode = 'play'; editToolbar.style.display = 'none'; loadQuestion(currentQuestionIndex); });
btnEditMode.addEventListener('click', () => { currentMode = 'edit'; editToolbar.style.display = 'block'; loadQuestion(currentQuestionIndex); });
btnPrev.addEventListener('click', () => { if (currentQuestionIndex > 0) { currentQuestionIndex--; loadQuestion(currentQuestionIndex); } });
btnNext.addEventListener('click', () => { if (currentQuestionIndex < MAX_QUESTIONS - 1) { currentQuestionIndex++; loadQuestion(currentQuestionIndex); } });
btnReset.addEventListener('click', () => loadQuestion(currentQuestionIndex));

loadQuestion(0);