const { COLS, ROWS } = require('./board');

// CheckWin checks if a player has won after placing a disc at (col, row)
// Returns true if the player has 4 in a row
function checkWin(board, col, row, player) {
  // Check horizontal
  if (checkDirection(board, col, row, player, 1, 0) >= 4) {
    return true;
  }
  
  // Check vertical
  if (checkDirection(board, col, row, player, 0, 1) >= 4) {
    return true;
  }
  
  // Check diagonal (top-left to bottom-right)
  if (checkDirection(board, col, row, player, 1, 1) >= 4) {
    return true;
  }
  
  // Check diagonal (top-right to bottom-left)
  if (checkDirection(board, col, row, player, 1, -1) >= 4) {
    return true;
  }
  
  return false;
}

// checkDirection checks for consecutive discs in a given direction
// Returns the count of consecutive discs including the current position
function checkDirection(board, col, row, player, deltaCol, deltaRow) {
  let count = 1; // Count the current disc
  
  // Check in positive direction
  count += countConsecutive(board, col, row, player, deltaCol, deltaRow);
  
  // Check in negative direction
  count += countConsecutive(board, col, row, player, -deltaCol, -deltaRow);
  
  return count;
}

// countConsecutive counts consecutive discs in a direction
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

// CheckDraw checks if the game is a draw (board full, no winner)
function checkDraw(board) {
  const { isBoardFull } = require('./board');
  return isBoardFull(board);
}

// GetValidMoves returns a list of valid column indices where a move can be made
function getValidMoves(board) {
  const { isValidColumn, isColumnFull } = require('./board');
  const validMoves = [];
  for (let col = 0; col < COLS; col++) {
    if (isValidColumn(col) && !isColumnFull(board, col)) {
      validMoves.push(col);
    }
  }
  return validMoves;
}

// GetOpponent returns the opponent player number
function getOpponent(player) {
  const { PLAYER1, PLAYER2 } = require('./board');
  if (player === PLAYER1) {
    return PLAYER2;
  }
  return PLAYER1;
}

module.exports = {
  checkWin,
  checkDraw,
  getValidMoves,
  getOpponent
};
