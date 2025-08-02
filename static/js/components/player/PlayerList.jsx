import React from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import { PencilIcon } from '../icons/Icons.jsx';

const PlayerList = ({ players, onEditPlayer }) => {
  if (players.length === 0) {
    return (
      React.createElement('p', { className: "text-center text-neutral py-4" },
        'プレイヤーがまだ追加されていません。プレイヤーを追加して始めましょう！'
      )
    );
  }

  return (
    React.createElement('div', { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" },
      players.map((player) =>
        React.createElement(Card, { key: player.id, className: "p-4" },
          React.createElement('div', { className: "flex items-center space-x-3 mb-3" },
            React.createElement('img', { 
              src: player.avatarUrl || `https://picsum.photos/seed/${player.id}/64/64`,
              alt: player.name,
              className: "h-12 w-12 rounded-full object-cover border-2 border-primary"
            }),
            React.createElement('div', null,
              React.createElement('h3', { className: "text-lg font-semibold text-base-content" }, player.name),
              React.createElement('p', { className: "text-xs text-neutral" }, `ID: ${player.id.substring(0, 8)}`)
            )
          ),
          React.createElement('div', { className: "flex justify-end" },
            React.createElement(Button, { 
              variant: "ghost",
              size: "sm",
              onClick: () => onEditPlayer(player),
              leftIcon: React.createElement(PencilIcon, { className: "w-4 h-4" }),
              'aria-label': `${player.name}を編集`
            }, '編集')
          )
        )
      )
    )
  );
};

export default PlayerList;