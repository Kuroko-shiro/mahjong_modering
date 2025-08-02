import React from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import { PencilIcon, TrophyIcon } from '../icons/Icons.jsx';

const SeasonList = ({ seasons, activeSeason, onEditSeason, onActivateSeason }) => {
  if (seasons.length === 0) {
    return (
      React.createElement('p', { className: "text-center text-neutral py-4" },
        'シーズンがまだありません。'
      )
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusBadge = (season) => {
    if (season.is_active) {
      return React.createElement('span', { 
        className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
      },
        React.createElement(TrophyIcon, { className: "w-3 h-3 mr-1" }),
        'アクティブ'
      );
    }
    
    const today = new Date();
    const startDate = new Date(season.start_date);
    const endDate = season.end_date ? new Date(season.end_date) : null;
    
    if (endDate && today > endDate) {
      return React.createElement('span', { 
        className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" 
      }, '終了');
    }
    
    if (today < startDate) {
      return React.createElement('span', { 
        className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100" 
      }, '開始前');
    }
    
    return React.createElement('span', { 
      className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100" 
    }, '非アクティブ');
  };

  return (
    React.createElement('div', { className: "space-y-4" },
      seasons.map(season => 
        React.createElement(Card, { key: season.id, className: "p-4" },
          React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start" },
            React.createElement('div', { className: "flex-1 mb-3 sm:mb-0" },
              React.createElement('div', { className: "flex items-center mb-2" },
                React.createElement('h3', { className: "text-lg font-semibold text-base-content mr-3" }, 
                  season.name
                ),
                getStatusBadge(season)
              ),
              React.createElement('div', { className: "text-sm text-neutral space-y-1" },
                React.createElement('p', null, 
                  '期間: ', formatDate(season.start_date), 
                  season.end_date ? ` - ${formatDate(season.end_date)}` : ' - 未定'
                ),
                React.createElement('p', null, 
                  'ゲーム数: ', season.game_count || 0, ' | プレイヤー数: ', season.player_count || 0
                ),
                season.description && 
                React.createElement('p', { className: "text-xs" }, season.description)
              )
            ),
            React.createElement('div', { className: "flex space-x-2" },
              !season.is_active && 
              React.createElement(Button, {
                variant: "primary",
                size: "sm",
                onClick: () => onActivateSeason(season.id)
              }, 'アクティブ化'),
              React.createElement(Button, {
                variant: "ghost",
                size: "sm",
                onClick: () => onEditSeason(season),
                leftIcon: React.createElement(PencilIcon, { className: "w-4 h-4" })
              }, '編集')
            )
          )
        )
      )
    )
  );
};

export default SeasonList;