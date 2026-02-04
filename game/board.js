// Board dimensions
const COLS = 7;
const ROWS = 6;

// Cell states
const EMPTY = 0;
const PLAYER1 = 1;
const PLAYER2 = 2;

// NewBoard creates a new empty board
function newBoard() {
  const board = [];
  for (let i = 0; i < COLS; i++) {
    board[i] = new Array(ROWS).fill(EMPTY);
  }
  return board;
}

// CopyBoard creates a deep copy of the board
function copyBoard(board) {
  const newBoard = [];
  for (let i = 0; i < board.length; i++) {
    newBoard[i] = [...board[i]];
  }
  return newBoard;
}

// IsValidColumn checks if column index is valid
function isValidColumn(col) {
  return col >= 0 && col < COLS;
}

// GetNextAvailableRow returns the next available row in a column, or -1 if column is full
function getNextAvailableRow(board, col) {
  if (!isValidColumn(col)) {
    return -1;
  }
  
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[col][row] === EMPTY) {
      return row;
    }
  }
  return -1; // Column is full
}

// IsColumnFull checks if a column is completely filled
function isColumnFull(board, col) {
  return getNextAvailableRow(board, col) === -1;
}

// IsBoardFull checks if the entire board is filled
function isBoardFull(board) {
  for (let col = 0; col < COLS; col++) {
    if (!isColumnFull(board, col)) {
      return false;
    }
  }
  return true;
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
  isBoardFull
};
