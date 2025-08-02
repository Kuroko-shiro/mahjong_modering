import React from 'react';
import GameForm from '../components/game/GameForm.jsx';
import { PlusCircleIcon } from '../components/icons/Icons.jsx';
import Card from '../components/ui/Card.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';

const RecordGamePage = ({ players, addGame, leagueSettings, isLoading, activeSeason }) => {
  if (isLoading) {
    return (
      React.createElement('div', { className: "flex justify-center items-center h-64" },
        React.createElement(LoadingSpinner, { size: "lg", message: "Loading game data prerequisites..." })
      )
    );
  }
  
  return (
    React.createElement('div', { className: "space-y-6" },
      React.createElement(Card, { className: "p-4 sm:p-6" },
        React.createElement('div', { className: "flex items-center mb-6" },
          React.createElement(PlusCircleIcon, { className: "w-8 h-8 mr-3 text-primary" }),
          React.createElement('h1', { className: "text-3xl font-bold" }, '新規ゲーム記録'),
          activeSeason && 
          React.createElement('span', { className: "ml-3 text-lg text-neutral" }, `- ${activeSeason.name}`)
        ),
        React.createElement(GameForm, { 
          players: players, 
          addGame: addGame, 
          leagueSettings: leagueSettings 
        })
      )
    )
  );
};

export default RecordGamePage;