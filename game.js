const COLS = 7;
const ROWS = 6;
const EMPTY = 0;
const PLAYER1 = 1;
const PLAYER2 = 2;

function newBoard() {
  const board = [];
  for (let i = 0; i < COLS; i++) {
    board[i] = new Array(ROWS).fill(EMPTY);
  }
  return board;
}

function copyBoard(board) {
  const newBoard = [];
  for (let i = 0; i < board.length; i++) {
    newBoard[i] = [...board[i]];
  }
  return newBoard;
}

function isValidColumn(col) {
  return col >= 0 && col < COLS;
}

function getNextAvailableRow(board, col) {
  if (!isValidColumn(col)) {
    return -1;
  }
  
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[col][row] === EMPTY) {
      return row;
    }
  }
  return -1;
}

function isColumnFull(board, col) {
  return getNextAvailableRow(board, col) === -1;
}

function isBoardFull(board) {
  for (let col = 0; col < COLS; col++) {
    if (!isColumnFull(board, col)) {
      return false;
    }
  }
  return true;
}

function checkWin(board, col, row, player) {
  // Check horizontal
  if (checkDirection(board, col, row, player, 1, 0) >= 4) {
    return true;
  }
  
  // Check vertical
  if (checkDirection(board, col, row, player, 0, 1) >= 4) {
    return true;
  }
  
  // Check diagonal /
  if (checkDirection(board, col, row, player, 1, 1) >= 4) {
    return true;
  }
  
  // Check diagonal \
  if (checkDirection(board, col, row, player, 1, -1) >= 4) {
    return true;
  }
  
  return false;
}

function checkDirection(board, col, row, player, deltaCol, deltaRow) {
  let count = 1;
  
  count += countConsecutive(board, col, row, player, deltaCol, deltaRow);
  count += countConsecutive(board, col, row, player, -deltaCol, -deltaRow);
  
  return count;
}

function countConsecutive(board, col, row, player, deltaCol, deltaRow) {
  let count = 0;
  let currentCol = col + deltaCol;
  let currentRow = row + deltaRow;
  
  while (currentCol >= 0 && currentCol < COLS &&
         currentRow >= 0 && currentRow < ROWS &&
         board[currentCol][currentRow] === player) {
    count++;
    currentCol += deltaCol;
    currentRow += deltaRow;
  }
  
  return count;
}

function checkDraw(board) {
  return isBoardFull(board);
}

function getValidMoves(board) {
  const validMoves = [];
  for (let col = 0; col < COLS; col++) {
    if (isValidColumn(col) && !isColumnFull(board, col)) {
      validMoves.push(col);
    }
  }
  return validMoves;
}

function getOpponent(player) {
  if (player === PLAYER1) {
    return PLAYER2;
  }
  return PLAYER1;
}

function validateMove(board, col, player) {
  if (!isValidColumn(col)) {
    return false;
  }
  
  if (isColumnFull(board, col)) {
    return false;
  }
  
  if (player !== PLAYER1 && player !== PLAYER2) {
    return false;
  }
  
  return true;
}

function makeMove(board, col, player) {
  if (!validateMove(board, col, player)) {
    return -1;
  }
  
  const row = getNextAvailableRow(board, col);
  if (row === -1) {
    return -1;
  }
  
  board[col][row] = player;
  return row;
}

module.exports = {
  COLS,
  ROWS,
  EMPTY,
  PLAYER1,
  PLAYER2,
  newBoard,
  copyBoard,
  isValidColumn,
  getNextAvailableRow,
  isColumnFull,
  isBoardFull,
  checkWin,
  checkDraw,
  getValidMoves,
  getOpponent,
  validateMove,
  makeMove
};
