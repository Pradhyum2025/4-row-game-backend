const { PLAYER1, PLAYER2, isValidColumn, isColumnFull, getNextAvailableRow } = require('./board');

// ValidateMove checks if a move is valid
function validateMove(board, col, player) {
  // Check if column is valid
  if (!isValidColumn(col)) {
    return false;
  }
  
  // Check if column has space
  if (isColumnFull(board, col)) {
    return false;
  }
  
  // Check if player is valid
  if (player !== PLAYER1 && player !== PLAYER2) {
    return false;
  }
  
  return true;
}

// MakeMove places a disc in the specified column
// Returns the row where the disc was placed, or -1 if move is invalid
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
  validateMove,
  makeMove
};
