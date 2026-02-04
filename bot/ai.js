const { copyBoard, isValidColumn, isColumnFull, COLS, ROWS } = require('../game/board');
const { getValidMoves, getOpponent, checkWin } = require('../game/engine');
const { makeMove } = require('../game/validator');

// BotAI represents the competitive bot
class BotAI {
  constructor(botPlayer) {
    this.botPlayer = botPlayer;
    this.humanPlayer = getOpponent(botPlayer);
  }

  // GetBestMove returns the best move for the bot
  // Returns column index, or -1 if no valid moves
  getBestMove(board) {
    const validMoves = getValidMoves(board);
    if (validMoves.length === 0) {
      return -1;
    }
    
    // 1. Check if bot can win in 1 move
    const winningMove = this.findWinningMove(board);
    if (winningMove !== -1) {
      return winningMove;
    }
    
    // 2. Check if opponent can win next move → block it
    const blockingMove = this.findBlockingMove(board);
    if (blockingMove !== -1) {
      return blockingMove;
    }
    
    // 3. Prefer center columns (3, 2, 4, 1, 5, 0, 6)
    const centerColumns = [3, 2, 4, 1, 5, 0, 6];
    for (const col of centerColumns) {
      if (isValidColumn(col) && !isColumnFull(board, col)) {
        // Check if this move creates a good opportunity (2-3 in a row)
        if (this.createsGoodOpportunity(board, col)) {
          return col;
        }
      }
    }
    
    // 4. Prefer moves that create 2-3 in a row
    const bestOpportunity = this.findBestOpportunity(board, validMoves);
    if (bestOpportunity !== -1) {
      return bestOpportunity;
    }
    
    // 5. Fallback: prefer center columns even without opportunities
    for (const col of centerColumns) {
      if (isValidColumn(col) && !isColumnFull(board, col)) {
        return col;
      }
    }
    
    // 6. Last resort: any valid move
    if (validMoves.length > 0) {
      return validMoves[0];
    }
    
    return -1;
  }

  // findWinningMove checks if bot can win in one move
  findWinningMove(board) {
    const validMoves = getValidMoves(board);
    
    for (const col of validMoves) {
      // Create a test board
      const testBoard = copyBoard(board);
      const row = makeMove(testBoard, col, this.botPlayer);
      
      if (row !== -1 && checkWin(testBoard, col, row, this.botPlayer)) {
        return col;
      }
    }
    
    return -1;
  }

  // findBlockingMove checks if opponent can win next move and blocks it
  findBlockingMove(board) {
    const validMoves = getValidMoves(board);
    
    for (const col of validMoves) {
      // Create a test board to simulate opponent's move
      const testBoard = copyBoard(board);
      const row = makeMove(testBoard, col, this.humanPlayer);
      
      if (row !== -1 && checkWin(testBoard, col, row, this.humanPlayer)) {
        // Opponent would win here, block it
        return col;
      }
    }
    
    return -1;
  }

  // createsGoodOpportunity checks if a move creates a good opportunity (2-3 in a row)
  createsGoodOpportunity(board, col) {
    const testBoard = copyBoard(board);
    const row = makeMove(testBoard, col, this.botPlayer);
    
    if (row === -1) {
      return false;
    }
    
    // Check if this creates at least 2 in a row (but not 4, which would be a win)
    // We check if there are 2-3 consecutive discs
    const count = this.countMaxConsecutive(testBoard, col, row, this.botPlayer);
    return count >= 2 && count < 4;
  }

  // findBestOpportunity finds the move that creates the best opportunity
  findBestOpportunity(board, validMoves) {
    let bestCol = -1;
    let bestScore = 0.0;
    
    for (const col of validMoves) {
      const testBoard = copyBoard(board);
      const row = makeMove(testBoard, col, this.botPlayer);
      
      if (row === -1) {
        continue;
      }
      
      // Score based on consecutive discs created
      let score = this.countMaxConsecutive(testBoard, col, row, this.botPlayer);
      
      // Bonus for center columns
      if (col === 3) {
        score += 1;
      } else if (col === 2 || col === 4) {
        score += 0.5;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }
    
    return bestCol;
  }

  // countMaxConsecutive counts the maximum consecutive discs in any direction
  countMaxConsecutive(board, col, row, player) {
    let maxCount = 0.0;
    
    // Check all four directions
    const directions = [
      [1, 0],   // horizontal
      [0, 1],   // vertical
      [1, 1],   // diagonal /
      [1, -1],  // diagonal \
    ];
    
    for (const dir of directions) {
      const count = this.countDirection(board, col, row, player, dir[0], dir[1]);
      if (count > maxCount) {
        maxCount = count;
      }
    }
    
    return maxCount;
  }

  // countDirection counts consecutive discs in a direction
  countDirection(board, col, row, player, deltaCol, deltaRow) {
    let count = 1.0; // Count the current disc
    
    // Check positive direction
    count += this.countConsecutive(board, col, row, player, deltaCol, deltaRow);
    
    // Check negative direction
    count += this.countConsecutive(board, col, row, player, -deltaCol, -deltaRow);
    
    return count;
  }

  // countConsecutive counts consecutive discs in a single direction
  countConsecutive(board, col, row, player, deltaCol, deltaRow) {
    let count = 0.0;
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
}

// NewBotAI creates a new bot AI instance
function newBotAI(botPlayer) {
  return new BotAI(botPlayer);
}

module.exports = {
  BotAI,
  newBotAI
};
