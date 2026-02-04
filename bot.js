const { copyBoard, isValidColumn, isColumnFull, getValidMoves, getOpponent, checkWin, makeMove, COLS, ROWS } = require('./game');

class Bot {
  constructor(botPlayer) {
    this.botPlayer = botPlayer;
    this.humanPlayer = getOpponent(botPlayer);
  }

  getBestMove(board) {
    const validMoves = getValidMoves(board);
    if (validMoves.length === 0) {
      return -1;
    }
    
    const winningMove = this.findWinningMove(board);
    if (winningMove !== -1) {
      return winningMove;
    }
    
    const blockingMove = this.findBlockingMove(board);
    if (blockingMove !== -1) {
      return blockingMove;
    }
    
    const centerColumns = [3, 2, 4, 1, 5, 0, 6];
    for (const col of centerColumns) {
      if (isValidColumn(col) && !isColumnFull(board, col)) {
        if (this.createsGoodOpportunity(board, col)) {
          return col;
        }
      }
    }
    
    const bestOpportunity = this.findBestOpportunity(board, validMoves);
    if (bestOpportunity !== -1) {
      return bestOpportunity;
    }
    
    for (const col of centerColumns) {
      if (isValidColumn(col) && !isColumnFull(board, col)) {
        return col;
      }
    }
    
    if (validMoves.length > 0) {
      return validMoves[0];
    }
    
    return -1;
  }

  findWinningMove(board) {
    const validMoves = getValidMoves(board);
    
    for (const col of validMoves) {
      const testBoard = copyBoard(board);
      const row = makeMove(testBoard, col, this.botPlayer);
      
      if (row !== -1 && checkWin(testBoard, col, row, this.botPlayer)) {
        return col;
      }
    }
    
    return -1;
  }

  findBlockingMove(board) {
    const validMoves = getValidMoves(board);
    
    for (const col of validMoves) {
      const testBoard = copyBoard(board);
      const row = makeMove(testBoard, col, this.humanPlayer);
      
      if (row !== -1 && checkWin(testBoard, col, row, this.humanPlayer)) {
        return col;
      }
    }
    
    return -1;
  }

  createsGoodOpportunity(board, col) {
    const testBoard = copyBoard(board);
    const row = makeMove(testBoard, col, this.botPlayer);
    
    if (row === -1) {
      return false;
    }
    
    const count = this.countMaxConsecutive(testBoard, col, row, this.botPlayer);
    return count >= 2 && count < 4;
  }

  findBestOpportunity(board, validMoves) {
    let bestCol = -1;
    let bestScore = 0;
    
    for (const col of validMoves) {
      const testBoard = copyBoard(board);
      const row = makeMove(testBoard, col, this.botPlayer);
      
      if (row === -1) {
        continue;
      }
      
      let score = this.countMaxConsecutive(testBoard, col, row, this.botPlayer);
      
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

  countMaxConsecutive(board, col, row, player) {
    let maxCount = 0;
    
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1]
    ];
    
    for (const dir of directions) {
      const count = this.countDirection(board, col, row, player, dir[0], dir[1]);
      if (count > maxCount) {
        maxCount = count;
      }
    }
    
    return maxCount;
  }

  countDirection(board, col, row, player, deltaCol, deltaRow) {
    let count = 1;
    
    count += this.countConsecutive(board, col, row, player, deltaCol, deltaRow);
    count += this.countConsecutive(board, col, row, player, -deltaCol, -deltaRow);
    
    return count;
  }

  countConsecutive(board, col, row, player, deltaCol, deltaRow) {
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
}

module.exports = Bot;
