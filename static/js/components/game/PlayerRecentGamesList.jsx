import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';

const PlayerRecentGamesList = ({ games, playerId, players }) => {
  if (games.length === 0) {
    return (
      React.createElement('p', { className: "text-neutral text-sm" },
        'このプレイヤーの最近のゲームが見つかりません。'
      )
    );
  }

  const getPlayerName = (pId) => players.find(p => p.id === pId)?.name || 'Unknown';

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    React.createElement('div', { className: "space-y-3" },
      games.map(game => {
        const playerResult = game.results.find(r => r.playerId === playerId);
        if (!playerResult) return null;

        const rankColors = {
          1: "border-yellow-400", 
          2: "border-gray-400", 
          3: "border-orange-500", 
          4: "border-red-500"
        };
        const rankText = {
          1: "1位", 
          2: "2位", 
          3: "3位", 
          4: "4位"
        };

        return React.createElement('div', { 
          key: game.id, 
          className: `p-3 rounded-md shadow-sm bg-base-100 border-l-4 ${rankColors[playerResult.rank] || 'border-neutral'}`
        },
          React.createElement('div', { className: "flex justify-between items-center mb-1" },
            React.createElement('h4', { className: "font-semibold text-base-content" },
              game.roundName || `ゲーム ${formatDate(game.gameDate)}`
            ),
            React.createElement('span', { 
              className: `text-sm font-bold px-2 py-0.5 rounded-full ${
                playerResult.calculatedPoints > 0 ? 'bg-green-100 text-green-700' : 
                playerResult.calculatedPoints < 0 ? 'bg-red-100 text-red-700' : 
                'bg-gray-100 text-gray-700'
              }`
            }, `${playerResult.calculatedPoints.toFixed(1)} pt`)
          ),
          React.createElement('div', { className: "text-xs text-neutral grid grid-cols-3 gap-2" },
            React.createElement('span', null, '日付: ', formatDate(game.gameDate)),
            React.createElement('span', null,
              '順位: ', React.createElement('span', { className: "font-medium" }, rankText[playerResult.rank])
            ),
            React.createElement('span', null, '素点: ', playerResult.rawScore.toLocaleString())
          ),
          React.createElement('div', { className: "mt-2 text-xs text-neutral/80" },
            '対戦相手: ',
            game.results
              .filter(r => r.playerId !== playerId)
              .map(r => `${getPlayerName(r.playerId)} (${rankText[r.rank]}: ${Math.floor(r.rawScore/1000)}k)`)
              .join(', ')
          )
        );
      }),
      games.length > 0 && games.length >= 5 &&
      React.createElement('div', { className: "mt-4" },
        React.createElement(Button, { variant: "ghost", size: "sm", as: Link, to: "/game-history" },
          'ゲーム履歴で全てを見る →'
        )
      )
    )
  );
};

export default PlayerRecentGamesList;