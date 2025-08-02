import React from 'react';
import Card from '../ui/Card.jsx';

const GameList = ({ games, players }) => {
  if (games.length === 0) {
    return (
      React.createElement('p', { className: "text-center text-neutral py-4" },
        'ゲームがまだ記録されていません。'
      )
    );
  }

  const getPlayerName = (playerId) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown Player';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    React.createElement('div', { className: "space-y-6" },
      games.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()).map((game) =>
        React.createElement(Card, { key: game.id, className: "p-4 sm:p-6" },
          React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start mb-3" },
            React.createElement('div', null,
              React.createElement('h3', { className: "text-xl font-semibold text-primary" },
                game.roundName || `ゲーム ID: ${game.id.substring(0, 8)}`
              ),
              React.createElement('p', { className: "text-sm text-neutral" },
                '実施日: ', formatDate(game.gameDate),
                game.totalHandsInGame && 
                React.createElement('span', { className: "ml-2" }, `(${game.totalHandsInGame}局)`)
              ),
              React.createElement('p', { className: "text-xs text-neutral/70" },
                '記録日時: ', formatDateTime(game.recordedDate)
              )
            )
          ),
          
          React.createElement('div', { className: "overflow-x-auto" },
            React.createElement('table', { className: "min-w-full divide-y divide-neutral/20" },
              React.createElement('thead', { className: "bg-base-100/50" },
                React.createElement('tr', null,
                  React.createElement('th', { className: "px-4 py-2 text-left text-xs font-medium text-base-content uppercase tracking-wider" }, '順位'),
                  React.createElement('th', { className: "px-4 py-2 text-left text-xs font-medium text-base-content uppercase tracking-wider" }, 'プレイヤー'),
                  React.createElement('th', { className: "px-4 py-2 text-left text-xs font-medium text-base-content uppercase tracking-wider" }, '素点'),
                  React.createElement('th', { className: "px-4 py-2 text-left text-xs font-medium text-base-content uppercase tracking-wider hidden sm:table-cell" }, '和了'),
                  React.createElement('th', { className: "px-4 py-2 text-left text-xs font-medium text-base-content uppercase tracking-wider hidden sm:table-cell" }, 'リーチ'),
                  React.createElement('th', { className: "px-4 py-2 text-left text-xs font-medium text-base-content uppercase tracking-wider hidden sm:table-cell" }, '放銃'),
                  React.createElement('th', { className: "px-4 py-2 text-left text-xs font-medium text-base-content uppercase tracking-wider hidden sm:table-cell" }, '副露'),
                  React.createElement('th', { className: "px-4 py-2 text-left text-xs font-medium text-base-content uppercase tracking-wider" }, '得点')
                )
              ),
              React.createElement('tbody', { className: "bg-base-100 divide-y divide-neutral/10" },
                game.results.sort((a, b) => a.rank - b.rank).map((result) =>
                  React.createElement('tr', { key: result.playerId },
                    React.createElement('td', { className: "px-4 py-2 whitespace-nowrap text-sm font-medium" }, 
                      `${result.rank}位`
                    ),
                    React.createElement('td', { className: "px-4 py-2 whitespace-nowrap text-sm" }, 
                      getPlayerName(result.playerId)
                    ),
                    React.createElement('td', { className: "px-4 py-2 whitespace-nowrap text-sm" }, 
                      result.rawScore.toLocaleString()
                    ),
                    React.createElement('td', { className: "px-4 py-2 whitespace-nowrap text-sm hidden sm:table-cell" }, 
                      result.agariCount ?? '-'
                    ),
                    React.createElement('td', { className: "px-4 py-2 whitespace-nowrap text-sm hidden sm:table-cell" }, 
                      result.riichiCount ?? '-'
                    ),
                    React.createElement('td', { className: "px-4 py-2 whitespace-nowrap text-sm hidden sm:table-cell" }, 
                      result.houjuuCount ?? '-'
                    ),
                    React.createElement('td', { className: "px-4 py-2 whitespace-nowrap text-sm hidden sm:table-cell" }, 
                      result.furoCount ?? '-'
                    ),
                    React.createElement('td', { 
                      className: `px-4 py-2 whitespace-nowrap text-sm font-semibold ${result.calculatedPoints >= 0 ? 'text-green-500' : 'text-red-500'}`
                    }, result.calculatedPoints.toFixed(1))
                  )
                )
              )
            )
          )
        )
      )
    )
  );
};

export default GameList;