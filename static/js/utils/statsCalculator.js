// プレイヤー統計計算ユーティリティ

export const calculatePlayerStats = (games, players) => {
  const playerStats = {};

  // プレイヤーごとの統計を初期化
  players.forEach(player => {
    playerStats[player.id] = {
      player: player,
      gamesPlayed: 0,
      totalPoints: 0,
      averagePoints: 0,
      averageRawScore: 0,
      averageRank: 0,
      bestRawScore: 0,
      bestRawScoreGameId: null,
      rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
      winRate: 0,
      secondPlaceRate: 0,
      thirdPlaceRate: 0,
      fourthPlaceRate: 0,
      rentaiRate: 0, // 連対率 (1位か2位)
      rasuKaihiRate: 0, // ラス回避率 (4位以外)
      totalAgariCount: 0,
      totalRiichiCount: 0,
      totalHoujuuCount: 0,
      totalFuroCount: 0,
      totalHandsPlayedIn: 0,
      agariRatePerHand: 0,
      riichiRatePerHand: 0,
      houjuuRatePerHand: 0,
      furoRatePerHand: 0,
      lastTenGamesPoints: []
    };
  });

  // 各ゲームの結果を集計
  games.forEach(game => {
    game.results.forEach(result => {
      const playerId = result.playerId;
      if (!playerStats[playerId]) return;

      const stats = playerStats[playerId];
      
      // 基本統計
      stats.gamesPlayed++;
      stats.totalPoints += result.calculatedPoints;
      stats.rankDistribution[result.rank]++;

      // 最高点数の記録
      if (result.rawScore > stats.bestRawScore) {
        stats.bestRawScore = result.rawScore;
        stats.bestRawScoreGameId = game.id;
      }

      // 詳細統計（agariCount等が記録されている場合）
      if (game.totalHandsInGame && game.totalHandsInGame > 0) {
        stats.totalHandsPlayedIn += game.totalHandsInGame;
        stats.totalAgariCount += result.agariCount || 0;
        stats.totalRiichiCount += result.riichiCount || 0;
        stats.totalHoujuuCount += result.houjuuCount || 0;
        stats.totalFuroCount += result.furoCount || 0;
      }

      // 最近10ゲームの得点履歴を記録
      stats.lastTenGamesPoints.push(result.calculatedPoints);
      if (stats.lastTenGamesPoints.length > 10) {
        stats.lastTenGamesPoints.shift(); // 最古のものを削除
      }
    });
  });

  // 平均値と率の計算
  Object.values(playerStats).forEach(stats => {
    if (stats.gamesPlayed > 0) {
      // 平均値計算
      stats.averagePoints = stats.totalPoints / stats.gamesPlayed;
      
      const totalRawScore = games.reduce((sum, game) => {
        const playerResult = game.results.find(r => r.playerId === stats.player.id);
        return sum + (playerResult ? playerResult.rawScore : 0);
      }, 0);
      stats.averageRawScore = totalRawScore / stats.gamesPlayed;

      const totalRank = games.reduce((sum, game) => {
        const playerResult = game.results.find(r => r.playerId === stats.player.id);
        return sum + (playerResult ? playerResult.rank : 0);
      }, 0);
      stats.averageRank = totalRank / stats.gamesPlayed;

      // 順位率計算
      stats.winRate = stats.rankDistribution[1] / stats.gamesPlayed;
      stats.secondPlaceRate = stats.rankDistribution[2] / stats.gamesPlayed;
      stats.thirdPlaceRate = stats.rankDistribution[3] / stats.gamesPlayed;
      stats.fourthPlaceRate = stats.rankDistribution[4] / stats.gamesPlayed;
      stats.rentaiRate = (stats.rankDistribution[1] + stats.rankDistribution[2]) / stats.gamesPlayed;
      stats.rasuKaihiRate = (stats.gamesPlayed - stats.rankDistribution[4]) / stats.gamesPlayed;

      // 手数あたりの率計算
      if (stats.totalHandsPlayedIn > 0) {
        stats.agariRatePerHand = stats.totalAgariCount / stats.totalHandsPlayedIn;
        stats.riichiRatePerHand = stats.totalRiichiCount / stats.totalHandsPlayedIn;
        stats.houjuuRatePerHand = stats.totalHoujuuCount / stats.totalHandsPlayedIn;
        stats.furoRatePerHand = stats.totalFuroCount / stats.totalHandsPlayedIn;
      }
    }
  });

  // プレイヤー統計の配列として返す（ゲームをプレイしたプレイヤーのみ）
  return Object.values(playerStats).filter(stats => stats.gamesPlayed > 0);
};

// 麻雀M-Leagueスタイルの得点計算
export const calculateMLeaguePoints = (gameResults, leagueSettings) => {
  if (gameResults.length !== 4) {
    throw new Error('4人のプレイヤーが必要です');
  }

  // 原点の確認
  const totalRawScore = gameResults.reduce((sum, result) => sum + result.rawScore, 0);
  const expectedTotal = leagueSettings.gameStartChipCount * 4;
  
  if (totalRawScore !== expectedTotal) {
    throw new Error(`点数の合計が${expectedTotal}になっていません（現在: ${totalRawScore}）`);
  }

  // 順位の決定
  const sortedResults = [...gameResults].sort((a, b) => b.rawScore - a.rawScore);
  const rankedResults = sortedResults.map((result, index) => ({
    ...result,
    rank: index + 1
  }));

  // 得点計算
  const calculatedResults = rankedResults.map(result => {
    const scoreDiff = result.rawScore - leagueSettings.calculationBaseChipCount;
    const basePoints = scoreDiff / 1000;
    const umaPoints = leagueSettings.umaPoints[result.rank] || 0;
    const calculatedPoints = basePoints + umaPoints;

    return {
      ...result,
      calculatedPoints: calculatedPoints
    };
  });

  // 元の順序に戻す
  return gameResults.map(originalResult => 
    calculatedResults.find(calcResult => calcResult.playerId === originalResult.playerId)
  );
};