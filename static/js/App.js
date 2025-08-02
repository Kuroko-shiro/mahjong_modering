import React from 'react';

// Constants and utilities
import { API_BASE_URL } from './constants.js';

const DEFAULT_LEAGUE_SETTINGS = {
  gameStartChipCount: 25000,
  calculationBaseChipCount: 25000,
  umaPoints: {
    1: 20,
    2: 10,
    3: -10,
    4: -20
  }
};

// Routes configuration
const ROUTES = {
  HOME: 'home',
  PLAYERS: 'players',
  RECORD_GAME: 'record-game',
  GAME_HISTORY: 'game-history',
  SEASONS: 'seasons',
  SETTINGS: 'settings',
  PLAYER_DETAIL: 'player-detail'
};

// Utility functions
const calculatePlayerStats = (games, players) => {
  const playerStats = {};

  players.forEach(player => {
    playerStats[player.id] = {
      player: player,
      gamesPlayed: 0,
      totalPoints: 0,
      averagePoints: 0,
      averageRawScore: 0,
      averageRank: 0,
      maxRawScore: -1,  // 初期値を-1に設定して、実際にデータがあるかどうかを判定
      maxRawScoreGameId: null,
      rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
      winRate: 0,
      secondPlaceRate: 0,
      thirdPlaceRate: 0,
      fourthPlaceRate: 0,
      rentaiRate: 0,
      rasuKaihiRate: 0,
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

  games.forEach(game => {
    game.results.forEach(result => {
      const playerId = result.playerId;
      if (!playerStats[playerId]) return;

      const stats = playerStats[playerId];
      
      stats.gamesPlayed++;
      stats.totalPoints += result.calculatedPoints;
      stats.rankDistribution[result.rank]++;

      if (stats.maxRawScore === -1 || result.rawScore > stats.maxRawScore) {
        stats.maxRawScore = result.rawScore;
        stats.maxRawScoreGameId = game.id;
      }

      if (game.totalHandsInGame && game.totalHandsInGame > 0) {
        stats.totalHandsPlayedIn += game.totalHandsInGame;
        stats.totalAgariCount += result.agariCount || 0;
        stats.totalRiichiCount += result.riichiCount || 0;
        stats.totalHoujuuCount += result.houjuuCount || 0;
        stats.totalFuroCount += result.furoCount || 0;
      }

      stats.lastTenGamesPoints.push(result.calculatedPoints);
      if (stats.lastTenGamesPoints.length > 10) {
        stats.lastTenGamesPoints.shift();
      }
    });
  });

  Object.values(playerStats).forEach(stats => {
    if (stats.gamesPlayed > 0) {
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

      stats.winRate = stats.rankDistribution[1] / stats.gamesPlayed;
      stats.secondPlaceRate = stats.rankDistribution[2] / stats.gamesPlayed;
      stats.thirdPlaceRate = stats.rankDistribution[3] / stats.gamesPlayed;
      stats.fourthPlaceRate = stats.rankDistribution[4] / stats.gamesPlayed;
      stats.rentaiRate = (stats.rankDistribution[1] + stats.rankDistribution[2]) / stats.gamesPlayed;
      stats.rasuKaihiRate = (stats.gamesPlayed - stats.rankDistribution[4]) / stats.gamesPlayed;

      if (stats.totalHandsPlayedIn > 0) {
        stats.agariRatePerHand = stats.totalAgariCount / stats.totalHandsPlayedIn;
        stats.riichiRatePerHand = stats.totalRiichiCount / stats.totalHandsPlayedIn;
        stats.houjuuRatePerHand = stats.totalHoujuuCount / stats.totalHandsPlayedIn;
        stats.furoRatePerHand = stats.totalFuroCount / stats.totalHandsPlayedIn;
      }
    }
  });

  return Object.values(playerStats).filter(stats => stats.gamesPlayed > 0);
};

const calculateMLeaguePoints = (gameResults, leagueSettings) => {
  if (gameResults.length !== 4) {
    throw new Error('4人のプレイヤーが必要です');
  }

  const totalRawScore = gameResults.reduce((sum, result) => sum + result.rawScore, 0);
  const expectedTotal = leagueSettings.gameStartChipCount * 4;
  
  if (totalRawScore !== expectedTotal) {
    throw new Error(`点数の合計が${expectedTotal}になっていません（現在: ${totalRawScore}）`);
  }

  const sortedResults = [...gameResults].sort((a, b) => b.rawScore - a.rawScore);
  const rankedResults = sortedResults.map((result, index) => ({
    ...result,
    rank: index + 1
  }));

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

  return gameResults.map(originalResult => 
    calculatedResults.find(calcResult => calcResult.playerId === originalResult.playerId)
  );
};

// UI Components
const LoadingSpinner = ({ size = 'md', className = '', message }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-[6px]',
  };

  return React.createElement('div', { className: `flex flex-col items-center justify-center ${className}` },
    React.createElement('div', {
      className: `${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`,
      role: "status",
      'aria-live': "polite",
      'aria-label': message || "Loading..."
    }),
    message && React.createElement('p', { className: "mt-2 text-sm text-neutral" }, message)
  );
};

const Button = ({ children, variant = 'primary', size = 'md', leftIcon, rightIcon, className = '', disabled = false, onClick, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:transform hover:scale-105";

  const variantStyles = {
    primary: 'bg-primary text-primary-content hover:bg-primary-focus focus:ring-primary border border-primary-focus/60 active:bg-primary-focus/90 shadow-lg',
    secondary: 'bg-neutral/20 text-base-content hover:bg-neutral/30 focus:ring-neutral border border-neutral/30',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-lg',
    ghost: 'bg-transparent text-primary hover:bg-primary/10 focus:ring-primary',
    success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 shadow-lg',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return React.createElement('button', {
    className: `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`,
    disabled: disabled,
    onClick: onClick,
    ...props
  },
    leftIcon && React.createElement('span', { className: `inline-flex items-center ${children ? 'mr-2 -ml-0.5' : ''} h-5 w-5` }, leftIcon),
    children,
    rightIcon && React.createElement('span', { className: `inline-flex items-center ${children ? 'ml-2 -mr-0.5' : ''} h-5 w-5` }, rightIcon)
  );
};

const Card = ({ children, className = '', onClick, hover = false }) => {
  const baseClasses = "bg-base-100 shadow-lg rounded-lg overflow-hidden border border-neutral/10";
  const clickableClasses = onClick ? "cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-102" : "";
  const hoverClasses = hover ? "hover:shadow-xl transition-all duration-200 hover:scale-102" : "";

  return React.createElement('div', { 
    className: `${baseClasses} ${clickableClasses} ${hoverClasses} ${className}`, 
    onClick: onClick 
  }, children);
};

const Input = ({ className = '', error = false, ...props }) => {
  const baseStyles = "block w-full px-3 py-2 border rounded-md shadow-sm placeholder-neutral/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-base-100 disabled:opacity-70 disabled:bg-neutral/10 transition-all duration-150";
  const errorStyles = error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-neutral/30";
  
  return React.createElement('input', {
    className: `${baseStyles} ${errorStyles} ${className}`,
    ...props
  });
};

const Select = ({ className = '', children, error = false, ...props }) => {
  const baseStyles = "block w-full pl-3 pr-10 py-2 text-base border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-base-100 disabled:opacity-70 disabled:bg-neutral/10 transition-all duration-150";
  const errorStyles = error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-neutral/30";

  return React.createElement('select', {
    className: `${baseStyles} ${errorStyles} ${className}`,
    ...props
  }, children);
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return React.createElement('div', {
    className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4",
    onClick: onClose,
    'aria-modal': "true",
    role: "dialog"
  },
    React.createElement('div', {
      className: `bg-base-100 rounded-lg shadow-2xl p-6 w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 animate-modal-appear`,
      onClick: (e) => e.stopPropagation()
    },
      React.createElement('div', { className: "flex justify-between items-center mb-4" },
        React.createElement('h2', { className: "text-xl font-semibold text-primary" }, title),
        React.createElement('button', {
          onClick: onClose,
          className: "p-2 rounded-full text-neutral hover:bg-neutral/10 focus:outline-none focus:ring-2 focus:ring-primary transition-colors",
          'aria-label': "Close modal"
        }, '✕')
      ),
      React.createElement('div', null, children)
    )
  );
};

const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variantStyles = {
    default: 'bg-neutral/20 text-base-content',
    primary: 'bg-primary/20 text-primary',
    success: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    danger: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  return React.createElement('span', {
    className: `inline-flex items-center font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]}`
  }, children);
};

// Icon components
const TrophyIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3.375 3.375 0 0012.375 9.75h-.75A3.375 3.375 0 008.25 13.5v4.5m0 0V4.125c0-1.02.796-1.875 1.8-1.875h1.95c1.004 0 1.8.855 1.8 1.875v10.375M12 3.375V2.25" 
    })
  );

const UsersIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" 
    })
  );

const PlusCircleIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" 
    })
  );

const CalendarDaysIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0021 11.25v7.5m-9-3.75h.008v.008H12v-.008z" 
    })
  );

const CogIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93s.844.229 1.235.093l.821-.273c.528-.174 1.082.076 1.342.544l.82 1.42c.26.467.224 1.036-.09 1.41l-.733.894c-.29.354-.393.82-.272 1.225s.385.743.766.96l.82.547c.502.335.743.924.547 1.456l-.547 1.093c-.199.407-.638.66-1.093.66h-.547c-.455 0-.894-.199-1.196-.547l-.547-.82c-.38-.57-.96-.894-1.546-.894s-1.166.324-1.546.894l-.547.82c-.302.348-.74.547-1.196.547h-.547c-.455 0-.894-.199-1.093-.66l-.547-1.093c-.196-.532.045-1.121.547-1.456l.82-.547c.38-.217.656-.58.766-.96s-.018-.871-.272-1.225l-.732-.894c-.315-.375-.35-.943-.09-1.41l.82-1.42c.26-.468.814-.718 1.342-.544l.821.273c.391.136.852.037 1.235-.092s.71-.506.78-.93l.149-.894zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" 
    })
  );

const ListBulletIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" 
    })
  );

const SunIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591M12 12a2.25 2.25 0 00-2.25 2.25c0 1.242 1.008 2.25 2.25 2.25s2.25-1.008 2.25-2.25c0-1.242-1.008-2.25-2.25-2.25z" 
    })
  );

const MoonIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21c3.09 0 5.897-1.189 7.996-3.148a5.132 5.132 0 001.006-2.85z" 
    })
  );

const SearchIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" 
    })
  );

const FilterIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" 
    })
  );

const ChevronUpIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M4.5 15.75l7.5-7.5 7.5 7.5" 
    })
  );

const ChevronDownIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M19.5 8.25l-7.5 7.5-7.5-7.5" 
    })
  );

const ChartBarIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" 
    })
  );

const EyeIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" 
    }),
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
    })
  );

const PencilIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" 
    })
  );

const TrashIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" 
    })
  );

const ArrowLeftIcon = (props) => 
  React.createElement('svg', { 
    xmlns: "http://www.w3.org/2000/svg", 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  },
    React.createElement('path', { 
      strokeLinecap: "round", 
      strokeLinejoin: "round", 
      d: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" 
    })
  );

// Custom navigation hook
const useNavigation = () => {
  const [currentRoute, setCurrentRoute] = React.useState(ROUTES.HOME);
  const [routeParams, setRouteParams] = React.useState({});

  const navigate = (route, params = {}) => {
    setCurrentRoute(route);
    setRouteParams(params);
  };

  const goBack = () => {
    setCurrentRoute(ROUTES.HOME);
    setRouteParams({});
  };

  return { currentRoute, routeParams, navigate, goBack };
};

// Enhanced Game History Page
const GameHistoryPage = ({ 
  games, 
  players, 
  isLoading, 
  activeSeason, 
  leagueSettings,
  navigate, 
  onLoadAllGames, 
  onLoadDailyGames, 
  onLoadRangeGames,
  onUpdateGame,
  onDeleteGame,
  onRefreshGames
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [playerFilter, setPlayerFilter] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState({ key: 'gameDate', direction: 'desc' });
  const [selectedGame, setSelectedGame] = React.useState(null);
  const [editingGame, setEditingGame] = React.useState(null);
  const [deletingGame, setDeletingGame] = React.useState(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('season'); // 'season', 'total', 'daily', 'range'
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = React.useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filteredGames, setFilteredGames] = React.useState(games);
  const [isLoadingFilter, setIsLoadingFilter] = React.useState(false);

  const filteredAndSortedGames = React.useMemo(() => {
    let filtered = filteredGames.filter(game => {
      const matchesSearch = !searchTerm || 
        game.roundName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPlayer = !playerFilter || 
        game.results.some(result => result.playerId === playerFilter);
      
      const matchesDate = !dateFilter || 
        new Date(game.gameDate).toDateString() === new Date(dateFilter).toDateString();
      
      return matchesSearch && matchesPlayer && matchesDate;
    });

    return filtered.sort((a, b) => {
      const aValue = sortConfig.key === 'gameDate' ? new Date(a.gameDate) : a[sortConfig.key];
      const bValue = sortConfig.key === 'gameDate' ? new Date(b.gameDate) : b[sortConfig.key];
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredGames, searchTerm, playerFilter, dateFilter, sortConfig]);

  // データを読み込む関数
  const loadGamesData = async (mode, options = {}) => {
    setIsLoadingFilter(true);
    try {
      let data;
      switch (mode) {
        case 'total':
          data = await onLoadAllGames();
          break;
        case 'daily':
          data = await onLoadDailyGames(options.date || selectedDate);
          break;
        case 'range':
          data = await onLoadRangeGames(options.startDate || dateRange.start, options.endDate || dateRange.end);
          break;
        default:
          data = games; // アクティブシーズンのデータ
      }
      setFilteredGames(data);
    } catch (error) {
      console.error('Failed to load games data:', error);
      setFilteredGames([]);
    } finally {
      setIsLoadingFilter(false);
    }
  };

  // 表示モードが変更されたときの処理
  React.useEffect(() => {
    if (viewMode === 'season') {
      setFilteredGames(games);
    } else {
      loadGamesData(viewMode);
    }
  }, [viewMode, games]);

  // 日付やレンジが変更されたときの処理
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    if (viewMode === 'daily') {
      loadGamesData('daily', { date: newDate });
    }
  };

  const handleRangeChange = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    if (viewMode === 'range') {
      loadGamesData('range', { startDate: newRange.start, endDate: newRange.end });
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'total': return '全期間のゲーム';
      case 'daily': return `${selectedDate}のゲーム`;
      case 'range': return `${dateRange.start} 〜 ${dateRange.end}のゲーム`;
      default: return activeSeason ? `${activeSeason.name}のゲーム` : 'シーズンのゲーム';
    }
  };

  const getPlayerName = (playerId) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown Player';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const GameDetailModal = ({ game, onClose }) => {
    if (!game) return null;

    return React.createElement(Modal, { 
      isOpen: true, 
      onClose: onClose, 
      title: game.roundName || `ゲーム詳細`,
      size: "xl"
    },
      React.createElement('div', { className: "space-y-6" },
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
          React.createElement('div', null,
            React.createElement('h4', { className: "font-semibold text-sm text-neutral mb-2" }, 'ゲーム情報'),
            React.createElement('div', { className: "space-y-1 text-sm" },
              React.createElement('p', null, 
                React.createElement('span', { className: "font-medium" }, '実施日: '),
                formatDate(game.gameDate)
              ),
              React.createElement('p', null, 
                React.createElement('span', { className: "font-medium" }, '記録日時: '),
                formatDateTime(game.recordedDate)
              ),
              game.totalHandsInGame && 
              React.createElement('p', null, 
                React.createElement('span', { className: "font-medium" }, '総局数: '),
                `${game.totalHandsInGame}局`
              ),
              React.createElement('p', null, 
                React.createElement('span', { className: "font-medium" }, 'ゲームID: '),
                React.createElement('code', { className: "text-xs bg-neutral/20 px-1 rounded" }, game.id)
              )
            )
          ),
          React.createElement('div', null,
            React.createElement('h4', { className: "font-semibold text-sm text-neutral mb-2" }, '統計'),
            React.createElement('div', { className: "space-y-1 text-sm" },
              React.createElement('p', null, 
                React.createElement('span', { className: "font-medium" }, '平均点数: '),
                Math.round(game.results.reduce((sum, r) => sum + r.rawScore, 0) / 4).toLocaleString()
              ),
              React.createElement('p', null, 
                React.createElement('span', { className: "font-medium" }, '点差: '),
                (Math.max(...game.results.map(r => r.rawScore)) - Math.min(...game.results.map(r => r.rawScore))).toLocaleString()
              )
            )
          )
        ),
        
        React.createElement('div', null,
          React.createElement('h4', { className: "font-semibold mb-3" }, '詳細結果'),
          React.createElement('div', { className: "overflow-x-auto" },
            React.createElement('table', { className: "min-w-full divide-y divide-neutral/20" },
              React.createElement('thead', { className: "bg-neutral/5" },
                React.createElement('tr', null,
                  React.createElement('th', { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" }, '順位'),
                  React.createElement('th', { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" }, 'プレイヤー'),
                  React.createElement('th', { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" }, '素点'),
                  React.createElement('th', { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" }, '計算得点'),
                  React.createElement('th', { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" }, '和了'),
                  React.createElement('th', { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" }, 'リーチ'),
                  React.createElement('th', { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" }, '放銃'),
                  React.createElement('th', { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" }, '副露')
                )
              ),
              React.createElement('tbody', { className: "divide-y divide-neutral/10" },
                game.results.sort((a, b) => a.rank - b.rank).map((result) => {
                  const rankColors = {
                    1: "bg-yellow-50 border-l-4 border-yellow-400",
                    2: "bg-gray-50 border-l-4 border-gray-400",
                    3: "bg-orange-50 border-l-4 border-orange-400",
                    4: "bg-red-50 border-l-4 border-red-400"
                  };
                  
                  return React.createElement('tr', { 
                    key: result.playerId,
                    className: `${rankColors[result.rank] || ''}`
                  },
                    React.createElement('td', { className: "px-4 py-3 whitespace-nowrap text-sm font-bold" }, 
                      `${result.rank}位`
                    ),
                    React.createElement('td', { className: "px-4 py-3 whitespace-nowrap text-sm font-medium" }, 
                      getPlayerName(result.playerId)
                    ),
                    React.createElement('td', { className: "px-4 py-3 whitespace-nowrap text-sm" }, 
                      result.rawScore.toLocaleString()
                    ),
                    React.createElement('td', { 
                      className: `px-4 py-3 whitespace-nowrap text-sm font-semibold ${
                        result.calculatedPoints >= 0 ? 'text-green-600' : 'text-red-600'
                      }`
                    }, 
                      `${result.calculatedPoints > 0 ? '+' : ''}${result.calculatedPoints.toFixed(1)}`
                    ),
                    React.createElement('td', { className: "px-4 py-3 whitespace-nowrap text-sm text-center" }, 
                      result.agariCount ?? '-'
                    ),
                    React.createElement('td', { className: "px-4 py-3 whitespace-nowrap text-sm text-center" }, 
                      result.riichiCount ?? '-'
                    ),
                    React.createElement('td', { className: "px-4 py-3 whitespace-nowrap text-sm text-center" }, 
                      result.houjuuCount ?? '-'
                    ),
                    React.createElement('td', { className: "px-4 py-3 whitespace-nowrap text-sm text-center" }, 
                      result.furoCount ?? '-'
                    )
                  );
                })
              )
            )
          )
        )
      )
    );
  };

  const GameEditModal = ({ game, players, leagueSettings, onClose, onSave, isUpdating }) => {
    const [editedGame, setEditedGame] = React.useState({
      id: game.id,
      gameDate: game.gameDate,
      roundName: game.roundName || '',
      totalHandsInGame: game.totalHandsInGame || '',
      results: game.results.map(result => ({
        playerId: result.playerId,
        rank: result.rank,
        rawScore: result.rawScore,
        agariCount: result.agariCount || 0,
        riichiCount: result.riichiCount || 0,
        houjuuCount: result.houjuuCount || 0,
        furoCount: result.furoCount || 0
      }))
    });

    const handleResultChange = (index, field, value) => {
      const newResults = [...editedGame.results];
      newResults[index] = { ...newResults[index], [field]: field === 'rawScore' ? Number(value) : value };
      setEditedGame({ ...editedGame, results: newResults });
    };

    const handleSave = () => {
      // 基本的なバリデーション
      if (!editedGame.gameDate) {
        alert('ゲーム日付を入力してください。');
        return;
      }

      // 順位の重複チェック
      const ranks = editedGame.results.map(r => r.rank);
      if (new Set(ranks).size !== 4 || !ranks.every(rank => [1, 2, 3, 4].includes(rank))) {
        alert('順位は1位から4位まで重複なく設定してください。');
        return;
      }

      // ポイント計算
      try {
        const resultsWithCalculatedPoints = calculateMLeaguePoints(
          editedGame.results.map(r => ({
            playerId: r.playerId,
            rawScore: r.rawScore
          })),
          leagueSettings
        ).map((result, index) => ({
          ...editedGame.results[index],
          calculatedPoints: result.calculatedPoints,
          rank: result.rank
        }));

        const gameToSave = {
          ...editedGame,
          results: resultsWithCalculatedPoints
        };

        onSave(gameToSave);
      } catch (error) {
        alert('ポイント計算でエラーが発生しました: ' + error.message);
      }
    };

    return React.createElement(Modal, { 
      isOpen: true, 
      onClose: onClose, 
      title: "ゲーム編集",
      size: "xl"
    },
      React.createElement('div', { className: "space-y-6" },
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
          React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium mb-1" }, 'ゲーム日付'),
            React.createElement(Input, {
              type: "date",
              value: editedGame.gameDate,
              onChange: (e) => setEditedGame({ ...editedGame, gameDate: e.target.value })
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium mb-1" }, 'ラウンド名（任意）'),
            React.createElement(Input, {
              type: "text",
              value: editedGame.roundName,
              placeholder: "例：第1回戦",
              onChange: (e) => setEditedGame({ ...editedGame, roundName: e.target.value })
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium mb-1" }, '総局数（任意）'),
            React.createElement(Input, {
              type: "number",
              value: editedGame.totalHandsInGame,
              placeholder: "例：12",
              onChange: (e) => setEditedGame({ ...editedGame, totalHandsInGame: e.target.value })
            })
          )
        ),
        
        React.createElement('div', null,
          React.createElement('h4', { className: "font-semibold mb-3" }, '結果'),
          React.createElement('div', { className: "space-y-3" },
            editedGame.results.map((result, index) => {
              const currentPlayer = players.find(p => p.id === result.playerId);
              return React.createElement('div', { 
                key: result.playerId, 
                className: "p-4 border border-neutral/20 rounded-lg bg-base-100"
              },
                React.createElement('div', { className: "flex items-center justify-between mb-3" },
                  React.createElement('h5', { className: "font-medium text-base-content" },
                    `プレイヤー ${index + 1}${currentPlayer ? `: ${currentPlayer.name}` : ''}`
                  ),
                  React.createElement('span', { className: "text-sm text-neutral" },
                    `${result.rank}位`
                  )
                ),
                React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" },
                  React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium mb-1" }, 'プレイヤー'),
                    React.createElement('select', {
                      value: result.playerId,
                      onChange: (e) => handleResultChange(index, 'playerId', e.target.value),
                      className: "w-full px-3 py-2 border border-neutral/30 rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
                    },
                      React.createElement('option', { value: "", disabled: true }, '選択してください'),
                      players.map(player => {
                        const isAlreadySelected = editedGame.results.some((r, i) => 
                          i !== index && r.playerId === player.id
                        );
                        return React.createElement('option', { 
                          key: player.id, 
                          value: player.id,
                          disabled: isAlreadySelected
                        }, `${player.name}${isAlreadySelected ? ' (選択済み)' : ''}`);
                      })
                    )
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium mb-1" }, '順位'),
                    React.createElement('select', {
                      value: result.rank,
                      onChange: (e) => handleResultChange(index, 'rank', Number(e.target.value)),
                      className: "w-full px-3 py-2 border border-neutral/30 rounded-md"
                    },
                      [1, 2, 3, 4].map(rank => 
                        React.createElement('option', { key: rank, value: rank }, `${rank}位`)
                      )
                    )
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium mb-1" }, '素点'),
                    React.createElement(Input, {
                      type: "number",
                      value: result.rawScore,
                      onChange: (e) => handleResultChange(index, 'rawScore', e.target.value)
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium mb-1" }, '和了'),
                    React.createElement(Input, {
                      type: "number",
                      value: result.agariCount || 0,
                      onChange: (e) => handleResultChange(index, 'agariCount', Number(e.target.value))
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium mb-1" }, 'リーチ'),
                    React.createElement(Input, {
                      type: "number",
                      value: result.riichiCount || 0,
                      onChange: (e) => handleResultChange(index, 'riichiCount', Number(e.target.value))
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium mb-1" }, '放銃'),
                    React.createElement(Input, {
                      type: "number",
                      value: result.houjuuCount || 0,
                      onChange: (e) => handleResultChange(index, 'houjuuCount', Number(e.target.value))
                    })
                  )
                )
              );
            })
          )
        ),
        
        React.createElement('div', { className: "flex justify-end space-x-3 pt-4 border-t" },
          React.createElement(Button, { 
            variant: "secondary", 
            onClick: onClose,
            disabled: isUpdating
          }, 'キャンセル'),
          React.createElement(Button, { 
            onClick: handleSave,
            disabled: isUpdating,
            leftIcon: isUpdating ? React.createElement(LoadingSpinner, { size: "sm" }) : null
          }, isUpdating ? '更新中...' : '保存')
        )
      )
    );
  };

  const GameDeleteModal = ({ game, onClose, onConfirm, isDeleting }) => {
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const getPlayerName = (playerId) => {
      return players.find(p => p.id === playerId)?.name || 'Unknown Player';
    };

    return React.createElement(Modal, { 
      isOpen: true, 
      onClose: onClose, 
      title: "ゲーム削除確認",
      size: "md"
    },
      React.createElement('div', { className: "space-y-4" },
        React.createElement('div', { className: "text-center" },
          React.createElement('div', { className: "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4" },
            React.createElement(TrashIcon, { className: "h-6 w-6 text-red-600" })
          ),
          React.createElement('h3', { className: "text-lg font-medium text-gray-900 mb-2" }, '本当に削除しますか？'),
          React.createElement('p', { className: "text-sm text-gray-500 mb-4" }, 
            `以下のゲームを削除します：`
          ),
          React.createElement('div', { className: "bg-gray-50 p-3 rounded-lg text-left" },
            React.createElement('p', { className: "font-medium" }, 
              game.roundName || `ゲーム ${formatDate(game.gameDate)}`
            ),
            React.createElement('p', { className: "text-sm text-gray-600" }, 
              `実施日: ${formatDate(game.gameDate)}`
            ),
            React.createElement('p', { className: "text-sm text-gray-600" }, 
              `プレイヤー: ${game.results.map(r => getPlayerName(r.playerId)).join(', ')}`
            )
          ),
          React.createElement('p', { className: "text-sm text-red-600 font-medium" }, 
            'この操作は取り消せません。'
          )
        ),
        
        React.createElement('div', { className: "flex justify-end space-x-3 pt-4" },
          React.createElement(Button, { 
            variant: "secondary", 
            onClick: onClose,
            disabled: isDeleting
          }, 'キャンセル'),
          React.createElement(Button, { 
            variant: "secondary",
            onClick: onConfirm,
            disabled: isDeleting,
            leftIcon: isDeleting ? React.createElement(LoadingSpinner, { size: "sm" }) : React.createElement(TrashIcon, { className: "w-4 h-4" }),
            className: "bg-red-600 text-white hover:bg-red-700 border-red-600"
          }, isDeleting ? '削除中...' : '削除')
        )
      )
    );
  };

  if (isLoading || isLoadingFilter) {
    return React.createElement('div', { className: "flex justify-center items-center h-64" },
      React.createElement(LoadingSpinner, { size: "lg", message: isLoadingFilter ? "Loading filtered data..." : "Loading game history..." })
    );
  }

  return React.createElement('div', { className: "space-y-6" },
    // フィルターセクション
    React.createElement('div', { className: "bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 backdrop-blur-sm rounded-xl border border-primary/20 p-6" },
      React.createElement('div', { className: "flex items-center justify-between mb-6" },
        React.createElement('div', { className: "flex items-center space-x-3" },
          React.createElement('div', { className: "p-2 bg-primary/10 rounded-lg" },
            React.createElement('svg', { className: "w-5 h-5 text-primary", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
              React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" })
            )
          ),
          React.createElement('h3', { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, 'ゲーム表示範囲フィルター')
        ),
        React.createElement('div', { className: "px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-primary/30 backdrop-blur-sm" },
          React.createElement('span', { className: "text-sm font-medium text-gray-700 dark:text-gray-300" }, getViewModeLabel())
        )
      ),
      
      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" },
        React.createElement('div', { className: "space-y-3" },
          React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
            React.createElement('span', { className: "w-2 h-2 bg-primary rounded-full mr-2" }),
            '表示モード'
          ),
          React.createElement('div', { className: "relative" },
            React.createElement(Select, {
              value: viewMode,
              onChange: (e) => setViewMode(e.target.value),
              className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-primary/30 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            },
              React.createElement('option', { value: 'season' }, '🏆 アクティブシーズン'),
              React.createElement('option', { value: 'total' }, '📊 全期間'),
              React.createElement('option', { value: 'daily' }, '📅 日別'),
              React.createElement('option', { value: 'range' }, '📆 期間指定')
            )
          )
        ),
        viewMode === 'daily' && 
        React.createElement('div', { className: "space-y-3" },
          React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
            React.createElement('span', { className: "w-2 h-2 bg-blue-500 rounded-full mr-2" }),
            '対象日'
          ),
          React.createElement(Input, {
            type: "date",
            value: selectedDate,
            onChange: (e) => handleDateChange(e.target.value),
            className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          })
        ),
        viewMode === 'range' && 
        React.createElement(React.Fragment, null,
          React.createElement('div', { className: "space-y-3" },
            React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
              React.createElement('span', { className: "w-2 h-2 bg-green-500 rounded-full mr-2" }),
              '開始日'
            ),
            React.createElement(Input, {
              type: "date",
              value: dateRange.start,
              onChange: (e) => handleRangeChange('start', e.target.value),
              className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
            })
          ),
          React.createElement('div', { className: "space-y-3" },
            React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
              React.createElement('span', { className: "w-2 h-2 bg-red-500 rounded-full mr-2" }),
              '終了日'
            ),
            React.createElement(Input, {
              type: "date",
              value: dateRange.end,
              onChange: (e) => handleRangeChange('end', e.target.value),
              className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-red-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
            })
          )
        )
      )
    ),

    isLoading && games.length > 0 && 
    React.createElement(LoadingSpinner, { message: "Refreshing game list...", className: "my-4" }),
    
    filteredAndSortedGames.length === 0 ? 
    React.createElement('div', { className: "text-center py-12" },
      React.createElement('svg', { className: "w-16 h-16 mx-auto text-neutral mb-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" })
      ),
      React.createElement('p', { className: "text-neutral" },
        games.length === 0 
          ? (activeSeason ? `${activeSeason.name}にはまだゲームが記録されていません。` : 'ゲームがまだ記録されていません。')
          : '検索条件に一致するゲームがありません。'
      )
    ) :
    React.createElement('div', { className: "space-y-4" },
      filteredAndSortedGames.map(game =>
        React.createElement(Card, { 
          key: game.id, 
          className: "p-4 hover:shadow-lg transition-all duration-200 cursor-pointer",
          hover: true,
          onClick: () => setSelectedGame(game)
        },
          React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start mb-3" },
            React.createElement('div', null,
              React.createElement('h3', { className: "text-xl font-semibold text-primary mb-1" },
                game.roundName || `ゲーム ${formatDate(game.gameDate)}`
              ),
              React.createElement('div', { className: "flex flex-wrap gap-3 text-sm text-neutral" },
                React.createElement('span', null, 
                  React.createElement('svg', { className: "w-4 h-4 inline mr-1", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" })
                  ),
                  formatDate(game.gameDate)
                ),
                game.totalHandsInGame && 
                React.createElement('span', null, `${game.totalHandsInGame}局`),
                React.createElement('span', { className: "text-xs" },
                  '記録: ', formatDateTime(game.recordedDate)
                )
              )
            ),
            React.createElement('div', { className: "flex gap-2" },
              React.createElement(Button, { 
                size: "sm", 
                variant: "ghost",
                leftIcon: React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                  React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" })
                ),
                onClick: (e) => {
                  e.stopPropagation();
                  setSelectedGame(game);
                }
              }, '詳細'),
              React.createElement(Button, { 
                size: "sm", 
                variant: "ghost",
                leftIcon: React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                  React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" })
                ),
                onClick: (e) => {
                  e.stopPropagation();
                  setEditingGame(game);
                }
              }, '編集'),
              React.createElement(Button, { 
                size: "sm", 
                variant: "ghost",
                leftIcon: React.createElement(TrashIcon, { className: "w-4 h-4" }),
                onClick: (e) => {
                  e.stopPropagation();
                  setDeletingGame(game);
                },
                className: "text-red-600 hover:text-red-700"
              }, '削除')
            )
          ),
          
          React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-2" },
            game.results.sort((a, b) => a.rank - b.rank).map(result => {
              const rankColors = {
                1: "border-l-yellow-400 bg-yellow-50",
                2: "border-l-gray-400 bg-gray-50", 
                3: "border-l-orange-400 bg-orange-50",
                4: "border-l-red-400 bg-red-50"
              };
              
              return React.createElement('div', { 
                key: result.playerId,
                className: `p-2 rounded border-l-4 ${rankColors[result.rank] || 'border-l-neutral bg-neutral/5'}`
              },
                React.createElement('div', { className: "flex justify-between items-center" },
                  React.createElement('span', { className: "text-sm font-medium" }, 
                    getPlayerName(result.playerId)
                  ),
                  React.createElement('span', { className: "text-xs font-bold" }, 
                    `${result.rank}位`
                  )
                ),
                React.createElement('div', { className: "flex justify-between mt-1" },
                  React.createElement('span', { className: "text-xs text-neutral" }, 
                    result.rawScore.toLocaleString()
                  ),
                  React.createElement('span', { 
                    className: `text-xs font-semibold ${
                      result.calculatedPoints >= 0 ? 'text-green-600' : 'text-red-600'
                    }`
                  }, 
                    `${result.calculatedPoints > 0 ? '+' : ''}${result.calculatedPoints.toFixed(1)}`
                  )
                )
              );
            })
          )
        )
      )
    ),
    
    selectedGame && React.createElement(GameDetailModal, { 
      game: selectedGame, 
      onClose: () => setSelectedGame(null) 
    }),

    editingGame && React.createElement(GameEditModal, { 
      game: editingGame, 
      players: players,
      leagueSettings: leagueSettings,
      onClose: () => setEditingGame(null),
      onSave: async (updatedGame) => {
        setIsUpdating(true);
        try {
          console.log('GameEditModal onSave called with:', updatedGame);
          await onUpdateGame(editingGame.id, updatedGame);
          setEditingGame(null);
          onRefreshGames();
        } catch (error) {
          console.error('Failed to update game:', error);
          alert(`ゲームの更新に失敗しました: ${error.message || error}`);
        } finally {
          setIsUpdating(false);
        }
      },
      isUpdating: isUpdating
    }),

    deletingGame && React.createElement(GameDeleteModal, { 
      game: deletingGame, 
      onClose: () => setDeletingGame(null),
      onConfirm: async () => {
        setIsUpdating(true);
        try {
          await onDeleteGame(deletingGame.id);
          setDeletingGame(null);
          onRefreshGames();
        } catch (error) {
          console.error('Failed to delete game:', error);
          alert('ゲームの削除に失敗しました。');
        } finally {
          setIsUpdating(false);
        }
      },
      isDeleting: isUpdating
    })
  );
};



// Enhanced Seasons Page
const SeasonsPage = ({ 
  seasons, 
  activeSeason, 
  createSeason, 
  updateSeason, 
  activateSeason, 
  isLoading 
}) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingSeason, setEditingSeason] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredSeasons = React.useMemo(() => {
    return seasons.filter(season => 
      season.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      season.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [seasons, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingSeason(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (season) => {
    setEditingSeason(season);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingSeason(null);
  };

  const handleSaveSeason = async (seasonData) => {
    setIsSubmitting(true);
    try {
      if (editingSeason) {
        await updateSeason(editingSeason.id, seasonData);
      } else {
        await createSeason(seasonData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save season:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateSeason = async (seasonId) => {
    try {
      await activateSeason(seasonId);
    } catch (error) {
      console.error('Failed to activate season:', error);
    }
   };


  const SeasonForm = ({ onSave, initialData, onClose }) => {
    const [formData, setFormData] = React.useState({
      name: '',
      start_date: '',
      end_date: '',
      description: '',
      is_active: false
    });
    const [errors, setErrors] = React.useState({});

    React.useEffect(() => {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          start_date: initialData.start_date || '',
          end_date: initialData.end_date || '',
          description: initialData.description || '',
          is_active: initialData.is_active || false
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          start_date: today
        }));
      }
      setErrors({});
    }, [initialData]);

    const validateForm = () => {
      const newErrors = {};

      if (!formData.name.trim()) {
        newErrors.name = 'シーズン名を入力してください。';
      } else if (formData.name.trim().length < 2) {
        newErrors.name = 'シーズン名は2文字以上で入力してください。';
      }

      if (!formData.start_date) {
        newErrors.start_date = '開始日を選択してください。';
      }

      if (formData.end_date && formData.start_date) {
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        if (endDate <= startDate) {
          newErrors.end_date = '終了日は開始日より後の日付を選択してください。';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
      
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (validateForm()) {
        onSave({
          ...formData,
          name: formData.name.trim(),
          description: formData.description.trim()
        });
      }
    };

    return React.createElement('form', { onSubmit: handleSubmit, className: "space-y-6" },
      React.createElement('div', null,
        React.createElement('label', { 
          htmlFor: "seasonName", 
          className: "block text-sm font-medium text-base-content mb-1" 
        }, 'シーズン名 *'),
        React.createElement(Input, {
          type: "text",
          id: "seasonName",
          name: "name",
          value: formData.name,
          onChange: handleInputChange,
          placeholder: "例: Season 1, 2025年春季リーグ",
          required: true,
          error: !!errors.name
        }),
        errors.name && React.createElement('p', { 
          id: "name-error", 
          className: "mt-1 text-sm text-red-500" 
        }, errors.name)
      ),

      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
        React.createElement('div', null,
          React.createElement('label', { 
            htmlFor: "startDate", 
            className: "block text-sm font-medium text-base-content mb-1" 
          }, '開始日 *'),
          React.createElement(Input, {
            type: "date",
            id: "startDate",
            name: "start_date",
            value: formData.start_date,
            onChange: handleInputChange,
            required: true,
            error: !!errors.start_date
          }),
          errors.start_date && React.createElement('p', { className: "mt-1 text-sm text-red-500" }, errors.start_date)
        ),
        React.createElement('div', null,
          React.createElement('label', { 
            htmlFor: "endDate", 
            className: "block text-sm font-medium text-base-content mb-1" 
          }, '終了日（任意）'),
          React.createElement(Input, {
            type: "date",
            id: "endDate",
            name: "end_date",
            value: formData.end_date,
            onChange: handleInputChange,
            min: formData.start_date,
            error: !!errors.end_date
          }),
          errors.end_date && React.createElement('p', { className: "mt-1 text-sm text-red-500" }, errors.end_date)
        )
      ),

      React.createElement('div', null,
        React.createElement('label', { 
          htmlFor: "description", 
          className: "block text-sm font-medium text-base-content mb-1" 
        }, '説明（任意）'),
        React.createElement('textarea', {
          id: "description",
          name: "description",
          value: formData.description,
          onChange: handleInputChange,
          placeholder: "シーズンの説明や特記事項を入力",
          rows: 3,
          className: "block w-full px-3 py-2 border border-neutral/30 rounded-md shadow-sm placeholder-neutral/50 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-base-100"
        })
      ),

      React.createElement('div', { className: "flex items-center space-x-3" },
        React.createElement('input', {
          type: "checkbox",
          id: "isActive",
          name: "is_active",
          checked: formData.is_active,
          onChange: handleInputChange,
          className: "h-4 w-4 text-primary focus:ring-primary border-neutral/30 rounded"
        }),
        React.createElement('label', { 
          htmlFor: "isActive", 
          className: "text-sm text-base-content" 
        }, 'このシーズンをアクティブにする'),
        React.createElement('p', { className: "text-xs text-neutral" },
          '（他のアクティブシーズンは自動的に非アクティブになります）'
        )
      ),

      React.createElement('div', { className: "flex justify-end space-x-3 pt-4 border-t border-neutral/10" },
        React.createElement(Button, { 
          type: "button", 
          onClick: onClose, 
          variant: "secondary",
          disabled: isSubmitting
        }, 'キャンセル'),
        React.createElement(Button, { 
          type: "submit", 
          variant: "primary",
          disabled: isSubmitting 
        }, initialData ? 'シーズンを更新' : 'シーズンを作成')
      )
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusBadge = (season) => {
    if (season.is_active) {
      return React.createElement(Badge, { variant: "success" }, 
        React.createElement(TrophyIcon, { className: "w-3 h-3 mr-1" }),
        'アクティブ'
      );
    }
    
    const today = new Date();
    const startDate = new Date(season.start_date);
    const endDate = season.end_date ? new Date(season.end_date) : null;
    
    if (endDate && today > endDate) {
      return React.createElement(Badge, { variant: "default" }, '終了');
    }
    
    if (today < startDate) {
      return React.createElement(Badge, { variant: "info" }, '開始前');
    }
    
    return React.createElement(Badge, { variant: "warning" }, '非アクティブ');
  };

  if (isLoading && seasons.length === 0) {
    return React.createElement('div', { className: "flex justify-center items-center h-64" },
      React.createElement(LoadingSpinner, { size: "lg", message: "Loading seasons..." })
    );
  }

  return React.createElement('div', { className: "space-y-6" },
    React.createElement(Card, { className: "p-4 sm:p-6" },
      React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6" },
        React.createElement('div', { className: "flex items-center mb-4 sm:mb-0" },
          React.createElement(CalendarDaysIcon, { className: "w-8 h-8 mr-3 text-primary" }),
          React.createElement('h1', { className: "text-3xl font-bold" }, 'シーズン管理'),
          React.createElement(Badge, { variant: "info", className: "ml-3" }, 
            `${filteredSeasons.length} シーズン`
          )
        ),
        React.createElement(Button, { 
          onClick: handleOpenAddModal, 
          variant: "primary", 
          leftIcon: React.createElement(PlusCircleIcon, { className: "w-5 h-5" })
        }, '新規シーズン作成')
      ),
      
      seasons.length > 3 && React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "relative" },
          React.createElement(Input, {
            type: "text",
            placeholder: "シーズン名で検索...",
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            className: "pl-10"
          }),
          React.createElement(SearchIcon, { className: "absolute left-3 top-2.5 h-4 w-4 text-neutral" })
        )
      ),
      
      isLoading && seasons.length > 0 && 
      React.createElement(LoadingSpinner, { message: "Refreshing seasons...", className: "my-4" }),
      
      filteredSeasons.length === 0 ? 
      React.createElement('div', { className: "text-center py-12" },
        React.createElement(CalendarDaysIcon, { className: "w-16 h-16 mx-auto text-neutral mb-4" }),
        React.createElement('p', { className: "text-neutral" },
          seasons.length === 0 
            ? 'まだシーズンが作成されていません。新規シーズンを作成して麻雀リーグを開始しましょう。'
            : '検索条件に一致するシーズンがありません。'
        )
      ) :
      React.createElement('div', { className: "space-y-4" },
        filteredSeasons.map(season => 
          React.createElement(Card, { 
            key: season.id, 
            className: `p-4 hover:shadow-lg transition-all duration-200 ${
              season.is_active ? 'border-2 border-primary shadow-lg' : ''
            }`,
            hover: true
          },
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
                    React.createElement('span', { className: "font-medium" }, '期間: '),
                    formatDate(season.start_date), 
                    season.end_date ? ` - ${formatDate(season.end_date)}` : ' - 未定'
                  ),
                  React.createElement('p', null, 
                    React.createElement('span', { className: "font-medium" }, 'ゲーム数: '),
                    season.game_count || 0,
                    React.createElement('span', { className: "mx-2" }, '|'),
                    React.createElement('span', { className: "font-medium" }, 'プレイヤー数: '),
                    season.player_count || 0
                  ),
                  season.description && 
                  React.createElement('p', { className: "text-xs italic" }, season.description)
                )
              ),
              React.createElement('div', { className: "flex space-x-2" },
                !season.is_active && 
                React.createElement(Button, {
                  variant: "success",
                  size: "sm",
                  onClick: () => handleActivateSeason(season.id),
                  leftIcon: React.createElement(TrophyIcon, { className: "w-4 h-4" })
                }, 'アクティブ化'),
                React.createElement(Button, {
                  variant: "ghost",
                  size: "sm",
                  onClick: () => handleOpenEditModal(season),
                  leftIcon: React.createElement(PencilIcon, { className: "w-4 h-4" })
                }, '編集')
              )
            )
          )
        )
      )
    ),

    React.createElement(Modal, { 
      isOpen: isModalOpen, 
      onClose: handleCloseModal, 
      title: editingSeason ? 'シーズン編集' : '新規シーズン作成',
      size: "lg"
    },
      React.createElement(SeasonForm, { 
        onSave: handleSaveSeason, 
        initialData: editingSeason, 
        onClose: handleCloseModal
      }),
      isSubmitting && React.createElement(LoadingSpinner, { message: "Saving...", className: "mt-2" })
    )
  );
};

const PlayerDetailPage = ({ allPlayerStats, players, allGames, isLoading, navigate, playerId, onLoadAllStandings, onLoadDailyStandings, onLoadRangeStandings, onLoadAllGames, onLoadDailyGames, onLoadRangeGames }) => {
  const [viewMode, setViewMode] = React.useState('season'); // 'season', 'total', 'daily', 'range'
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = React.useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filteredStats, setFilteredStats] = React.useState(allPlayerStats);
  const [filteredGames, setFilteredGames] = React.useState(allGames);
  const [isLoadingFilter, setIsLoadingFilter] = React.useState(false);

  const player = players.find(p => p.id === playerId);
  const stat = filteredStats.find(s => s.player.id === playerId);

  // データを読み込む関数
  const loadFilteredData = async (mode, options = {}) => {
    setIsLoadingFilter(true);
    try {
      let statsData, gamesData;
      switch (mode) {
        case 'total':
          [statsData, gamesData] = await Promise.all([
            onLoadAllStandings(),
            onLoadAllGames()
          ]);
          break;
        case 'daily':
          [statsData, gamesData] = await Promise.all([
            onLoadDailyStandings(options.date || selectedDate),
            onLoadDailyGames(options.date || selectedDate)
          ]);
          break;
        case 'range':
          [statsData, gamesData] = await Promise.all([
            onLoadRangeStandings(options.startDate || dateRange.start, options.endDate || dateRange.end),
            onLoadRangeGames(options.startDate || dateRange.start, options.endDate || dateRange.end)
          ]);
          break;
        default:
          statsData = allPlayerStats; // アクティブシーズンのデータ
          gamesData = allGames;
      }
      setFilteredStats(statsData);
      setFilteredGames(gamesData);
    } catch (error) {
      console.error('Failed to load filtered data:', error);
      setFilteredStats([]);
      setFilteredGames([]);
    } finally {
      setIsLoadingFilter(false);
    }
  };

  // 表示モードが変更されたときの処理
  React.useEffect(() => {
    if (viewMode === 'season') {
      setFilteredStats(allPlayerStats);
      setFilteredGames(allGames);
    } else {
      loadFilteredData(viewMode);
    }
  }, [viewMode, allPlayerStats, allGames]);

  // 日付やレンジが変更されたときの処理
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    if (viewMode === 'daily') {
      loadFilteredData('daily', { date: newDate });
    }
  };

  const handleRangeChange = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    if (viewMode === 'range') {
      loadFilteredData('range', { startDate: newRange.start, endDate: newRange.end });
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'total': return '累計成績';
      case 'daily': return `${selectedDate}の成績`;
      case 'range': return `${dateRange.start} 〜 ${dateRange.end}の成績`;
      default: return 'シーズン成績';
    }
  };

  if (isLoading || isLoadingFilter) {
    return React.createElement('div', { className: "flex justify-center items-center h-64" },
      React.createElement(LoadingSpinner, { size: "lg", message: isLoadingFilter ? "Loading filtered data..." : "Loading player details..." })
    );
  }

  if (!player) { 
    return React.createElement('div', { className: "text-center py-10" },
      React.createElement(UsersIcon, { className: "w-16 h-16 mx-auto text-neutral mb-4" }),
      React.createElement('h2', { className: "text-2xl font-semibold mb-2" }, 'プレイヤーが見つかりません'),
      React.createElement('p', { className: "text-neutral mb-6" },
        'ID ', React.createElement('span', { className: "font-mono bg-neutral/10 p-1 rounded" }, playerId),
        ' のプレイヤーは見つかりませんでした。'
      ),
      React.createElement(Button, { 
        variant: "primary",
        onClick: () => navigate(ROUTES.PLAYERS)
      }, 'プレイヤー一覧を見る')
    );
  }

  // statオブジェクトが不完全な場合に備えて、デフォルト値で補完
  const normalizedStat = {
    gamesPlayed: 0,
    totalPoints: 0,
    averagePoints: 0,
    averageRawScore: 0,
    averageRank: 0,
    maxRawScore: -1,
    maxRawScoreGameId: null,
    rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
    winRate: 0,
    secondPlaceRate: 0,
    thirdPlaceRate: 0,
    fourthPlaceRate: 0,
    rentaiRate: 0,
    rasuKaihiRate: 0,
    totalAgariCount: 0,
    totalRiichiCount: 0,
    totalHoujuuCount: 0,
    totalFuroCount: 0,
    totalHandsPlayedIn: 0,
    agariRatePerHand: 0,
    riichiRatePerHand: 0,
    houjuuRatePerHand: 0,
    furoRatePerHand: 0,
    lastTenGamesPoints: [],
    ...stat  // 実際のstatデータで上書き
  };

  if (!stat) {
    return React.createElement(Card, { className: "p-6 text-center" },
      React.createElement('img', { 
        src: player.avatarUrl || `https://picsum.photos/seed/${player.name.replace(/\s+/g, '')}/128/128`,
        alt: player.name,
        className: "w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary"
      }),
      React.createElement('h1', { className: "text-3xl font-bold text-primary mb-2" }, player.name),
      React.createElement('p', { className: "text-neutral mb-4" }, 
        'このプレイヤーはまだゲームをプレイしていないか、統計データが利用できません。'
      ),
      React.createElement(Button, { 
        variant: "secondary",
        onClick: () => navigate(ROUTES.HOME)
      }, '順位表に戻る')
    );
  }

  // 以降の処理では normalizedStat を使用
  const statData = normalizedStat;

  const formatPercentage = (rate) => `${(rate * 100).toFixed(1)}%`;
  const formatDecimal = (num, places = 1) => num.toFixed(places);

  const StatItem = ({ label, value, icon, valueClass, subtext }) => (
    React.createElement('div', { className: "p-3 bg-base-100/50 rounded-md shadow-sm flex flex-col justify-between" },
      React.createElement('div', null,
        React.createElement('div', { className: "flex items-center text-sm text-neutral mb-1" },
          icon && React.createElement('span', { className: "mr-2 h-4 w-4" }, icon),
          label
        ),
        React.createElement('p', { className: `text-xl font-semibold ${valueClass || 'text-base-content'}` }, value)
      ),
      subtext && React.createElement('p', { className: "text-xs text-neutral/70 mt-1" }, subtext)
    )
  );
  
  const renderRankDistribution = () => {
    const ranks = [1, 2, 3, 4];
    const rankColors = ["text-yellow-400", "text-gray-500", "text-orange-500", "text-red-500"];
    const rankLabels = ["1位", "2位", "3位", "4位"];
    const rateKeys = ['winRate', 'secondPlaceRate', 'thirdPlaceRate', 'fourthPlaceRate'];
    
    return React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
      ranks.map((r, i) => 
        React.createElement(StatItem, { 
          key: r,
          label: rankLabels[i],
          value: `${statData.rankDistribution[r] || 0} (${formatPercentage(statData[rateKeys[i]])})`,
          valueClass: rankColors[i]
        })
      )
    );
  };

  const playerGames = filteredGames
    .filter(game => game.results.some(r => r.playerId === playerId))
    .sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());
  
  const recentGames = playerGames.slice(0, 5);

  // プレイヤーの最高素点を動的に計算
  const calculateMaxRawScore = () => {
    if (playerGames.length === 0) return { maxScore: null, gameId: null };
    
    let maxScore = -1;
    let gameId = null;
    
    playerGames.forEach(game => {
      const playerResult = game.results.find(r => r.playerId === playerId);
      if (playerResult && playerResult.rawScore > maxScore) {
        maxScore = playerResult.rawScore;
        gameId = game.id;
      }
    });
    
    return { maxScore: maxScore > -1 ? maxScore : null, gameId };
  };

  const { maxScore: dynamicMaxRawScore, gameId: dynamicMaxGameId } = calculateMaxRawScore();

  // デバッグ用ログ（本番環境では削除可能）
  console.log('PlayerDetailPage Debug:', {
    playerId,
    playerGamesCount: playerGames.length,
    statDataMaxRawScore: statData.maxRawScore,
    dynamicMaxRawScore,
    dynamicMaxGameId,
    sampleGameResults: playerGames.slice(0, 3).map(g => ({
      gameId: g.id.substring(0, 8),
      playerResult: g.results.find(r => r.playerId === playerId)
    }))
  });

  return React.createElement('div', { className: "space-y-6" },
    React.createElement('div', { className: "flex items-center mb-4" },
      React.createElement(Button, { 
        variant: "ghost",
        onClick: () => navigate(ROUTES.HOME),
        leftIcon: React.createElement(ArrowLeftIcon, { className: "w-4 h-4" })
      }, '順位表に戻る')
    ),
    
    // 改善されたフィルター UI
    React.createElement('div', { className: "bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 backdrop-blur-sm rounded-xl border border-primary/20 p-6 mb-6" },
      React.createElement('div', { className: "flex items-center justify-between mb-6" },
        React.createElement('div', { className: "flex items-center space-x-3" },
          React.createElement('div', { className: "p-2 bg-primary/10 rounded-lg" },
            React.createElement('span', { className: "text-2xl" }, '👤')
          ),
          React.createElement('h3', { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, 'プレイヤー成績表示設定')
        ),
        React.createElement('div', { className: "px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-primary/30 backdrop-blur-sm" },
          React.createElement('span', { className: "text-sm font-medium text-gray-700 dark:text-gray-300" }, 
            viewMode === 'total' ? '📊 全期間累計' :
            viewMode === 'daily' ? '📅 日別' :
            viewMode === 'range' ? '📆 期間指定' : '🏆 シーズン'
          )
        )
      ),
      
      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" },
        React.createElement('div', { className: "space-y-3" },
          React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
            React.createElement('span', { className: "w-2 h-2 bg-primary rounded-full mr-2" }),
            '表示範囲'
          ),
          React.createElement('div', { className: "relative" },
            React.createElement(Select, {
              value: viewMode,
              onChange: (e) => setViewMode(e.target.value),
              className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-primary/30 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            },
              React.createElement('option', { value: 'total' }, '📊 全期間累計'),
              React.createElement('option', { value: 'daily' }, '📅 日別'),
              React.createElement('option', { value: 'range' }, '📆 期間指定')
            )
          )
        ),
        viewMode === 'daily' && 
        React.createElement('div', { className: "space-y-3" },
          React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
            React.createElement('span', { className: "w-2 h-2 bg-blue-500 rounded-full mr-2" }),
            '対象日'
          ),
          React.createElement(Input, {
            type: "date",
            value: selectedDate,
            onChange: (e) => handleDateChange(e.target.value),
            className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          })
        ),
        viewMode === 'range' && 
        React.createElement(React.Fragment, null,
          React.createElement('div', { className: "space-y-3" },
            React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
              React.createElement('span', { className: "w-2 h-2 bg-green-500 rounded-full mr-2" }),
              '開始日'
            ),
            React.createElement(Input, {
              type: "date",
              value: dateRange.start,
              onChange: (e) => handleRangeChange('start', e.target.value),
              className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
            })
          ),
          React.createElement('div', { className: "space-y-3" },
            React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
              React.createElement('span', { className: "w-2 h-2 bg-red-500 rounded-full mr-2" }),
              '終了日'
            ),
            React.createElement(Input, {
              type: "date",
              value: dateRange.end,
              onChange: (e) => handleRangeChange('end', e.target.value),
              className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-red-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
            })
          )
        )
      )
    ),
    
    React.createElement(Card, { className: "p-4 sm:p-6" },
      React.createElement('div', { className: "flex flex-col sm:flex-row items-center mb-6" },
        React.createElement('img', { 
          src: player.avatarUrl || `https://picsum.photos/seed/${player.name.replace(/\s+/g, '')}/128/128`,
          alt: player.name,
          className: "w-24 h-24 sm:w-32 sm:h-32 rounded-full mb-4 sm:mb-0 sm:mr-6 border-4 border-primary shadow-md object-cover"
        }),
        React.createElement('div', null,
          React.createElement('h1', { className: "text-3xl sm:text-4xl font-bold text-primary mb-1 text-center sm:text-left" }, 
            player.name
          ),
          React.createElement('p', { className: "text-neutral text-center sm:text-left" }, 
            `プレイヤーID: ${player.id.substring(0, 8)}`
          )
        )
      )
    ),

    React.createElement(Card, { className: "p-4 sm:p-6" },
      React.createElement('h2', { className: "text-2xl font-semibold mb-4 flex items-center" },
        React.createElement(TrophyIcon, { className: "w-6 h-6 mr-2 text-primary" }),
        '総合成績'
      ),
      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" },
        React.createElement(StatItem, { label: "総ゲーム数", value: statData.gamesPlayed }),
        React.createElement(StatItem, { 
          label: "総得点", 
          value: formatDecimal(statData.totalPoints),
          valueClass: statData.totalPoints >= 0 ? 'text-green-500' : 'text-red-500'
        }),
        React.createElement(StatItem, { 
          label: "平均得点", 
          value: formatDecimal(statData.averagePoints),
          valueClass: statData.averagePoints >= 0 ? 'text-green-600' : 'text-red-600'
        }),
        React.createElement(StatItem, { label: "平均順位", value: formatDecimal(statData.averageRank, 2) }),
        React.createElement(StatItem, { label: "平均素点", value: statData.averageRawScore?.toLocaleString() || "N/A" }),
        React.createElement(StatItem, { 
          label: "最高素点", 
          value: (() => {
            if (dynamicMaxRawScore !== null) {
              return dynamicMaxRawScore.toLocaleString();
            }
            if (statData.maxRawScore !== undefined && statData.maxRawScore !== -1 && statData.maxRawScore !== null) {
              return statData.maxRawScore.toLocaleString();
            }
            return `データなし (ゲーム数: ${playerGames.length})`;
          })(),
          subtext: (() => {
            if (dynamicMaxRawScore !== null && dynamicMaxGameId) {
              return `ゲームID: ${dynamicMaxGameId.substring(0, 8)}`;
            }
            if (statData.maxRawScoreGameId && statData.maxRawScore !== undefined && statData.maxRawScore !== -1 && statData.maxRawScore !== null) {
              return `ゲームID: ${statData.maxRawScoreGameId.substring(0, 8)}`;
            }
            if (statData.gamesPlayed > 0 || playerGames.length > 0) {
              return `デバッグ: 統計=${statData.maxRawScore}, 動的=${dynamicMaxRawScore}`;
            }
            return "ゲーム記録がありません";
          })()
        })
      ),
      
      React.createElement('h3', { className: "text-xl font-semibold mb-3 mt-4" }, '順位分布・順位率'),
      renderRankDistribution(),
      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2 mt-4" },
        React.createElement(StatItem, { label: "連対率 (1・2位率)", value: formatPercentage(statData.rentaiRate) }),
        React.createElement(StatItem, { label: "ラス回避率 (4位以外率)", value: formatPercentage(statData.rasuKaihiRate) })
      )
    ),

    statData.totalHandsPlayedIn > 0 &&
    React.createElement(Card, { className: "p-4 sm:p-6" },
      React.createElement('h2', { className: "text-2xl font-semibold mb-4 flex items-center" },
        React.createElement(ChartBarIcon, { className: "w-6 h-6 mr-2 text-primary" }),
        'プレイスタイル指標 (手数あたり)'
      ),
      React.createElement('p', { className: "text-sm text-neutral mb-4" },
        `詳細データが記録された${statData.totalHandsPlayedIn}手のゲームに基づく統計です。`
      ),
      React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
        React.createElement(StatItem, { label: "和了率", value: formatPercentage(statData.agariRatePerHand) }),
        React.createElement(StatItem, { label: "リーチ率", value: formatPercentage(statData.riichiRatePerHand) }),
        React.createElement(StatItem, { 
          label: "放銃率", 
          value: formatPercentage(statData.houjuuRatePerHand),
          valueClass: "text-red-500"
        }),
        React.createElement(StatItem, { label: "副露率", value: formatPercentage(statData.furoRatePerHand) })
      ),
      React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mt-4" },
        React.createElement(StatItem, { label: "総和了数", value: statData.totalAgariCount }),
        React.createElement(StatItem, { label: "総リーチ数", value: statData.totalRiichiCount }),
        React.createElement(StatItem, { 
          label: "総放銃数", 
          value: statData.totalHoujuuCount,
          valueClass: "text-red-500"
        }),
        React.createElement(StatItem, { label: "総副露数", value: statData.totalFuroCount })
      )
    ),

    recentGames.length > 0 &&
    React.createElement(Card, { className: "p-4 sm:p-6" },
      React.createElement('h2', { className: "text-2xl font-semibold mb-4 flex items-center" },
        React.createElement(ListBulletIcon, { className: "w-6 h-6 mr-2 text-primary" }),
        `最近のゲーム (${recentGames.length})`
      ),
      React.createElement('div', { className: "space-y-3" },
        recentGames.map(game => {
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

          const formatDate = (dateString) => {
            return new Date(dateString).toLocaleDateString('ja-JP');
          };

          const getPlayerName = (pId) => players.find(p => p.id === pId)?.name || 'Unknown';

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
        })
      )
    ),
    
    statData.lastTenGamesPoints && statData.lastTenGamesPoints.length > 0 &&
    React.createElement(Card, { className: "p-4 sm:p-6" },
      React.createElement('h2', { className: "text-2xl font-semibold mb-4 flex items-center" },
        React.createElement(ChartBarIcon, { className: "w-6 h-6 mr-2 text-primary" }),
        `直近${statData.lastTenGamesPoints.length}ゲームの傾向 (得点)`
      ),
      React.createElement('div', { className: "flex items-end h-40 space-x-1 bg-neutral/10 p-4 rounded-lg" },
        statData.lastTenGamesPoints.map((pts, i) => {
          const allAbsPoints = statData.lastTenGamesPoints.map(p => Math.abs(p));
          const maxAbsPt = Math.max(...allAbsPoints, 1); 
          let heightPercentage = 0;
          if (maxAbsPt > 0) {
             heightPercentage = (Math.abs(pts) / maxAbsPt) * 95 + (pts !== 0 ? 5 : 0);
          }
          
          return React.createElement('div', { 
              key: i,
              title: `${pts.toFixed(1)} pts`,
              className: `w-full ${pts >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-t-md hover:opacity-75 transition-all duration-150 ease-in-out flex items-end justify-center`,
              style: { height: `${Math.max(2, heightPercentage)}%` }
            },
             React.createElement('span', { className: "text-xs text-white/70 writing-mode-vertical-rl transform rotate-180 p-1 whitespace-nowrap overflow-hidden" },
                 pts.toFixed(0)
             )
          );
        })
      )
    )
  );
};

// Enhanced Standings Page (Home Page)
const StandingsPage = ({ 
  playerStats, 
  isLoading, 
  activeSeason, 
  navigate, 
  onLoadAllStandings, 
  onLoadDailyStandings, 
  onLoadRangeStandings
}) => {
  const [viewMode, setViewMode] = React.useState('season'); // 'season', 'total', 'daily', 'range'
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = React.useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filteredStats, setFilteredStats] = React.useState(playerStats);
  const [isLoadingFilter, setIsLoadingFilter] = React.useState(false);
  const [sortConfig, setSortConfig] = React.useState({ key: 'totalPoints', direction: 'desc' });
  const [expandedPlayerId, setExpandedPlayerId] = React.useState(null);
  const [selectedGame, setSelectedGame] = React.useState(null);

  // データを読み込む関数
  const loadFilteredData = async (mode, options = {}) => {
    setIsLoadingFilter(true);
    try {
      let standingsData;
      
      switch (mode) {
        case 'total':
          standingsData = await onLoadAllStandings();
          break;
        case 'daily':
          standingsData = await onLoadDailyStandings(options.date);
          break;
        case 'range':
          standingsData = await onLoadRangeStandings(options.startDate, options.endDate);
          break;
        default:
          standingsData = playerStats;
      }
      
      setFilteredStats(standingsData);
    } catch (error) {
      console.error('Failed to load filtered standings data:', error);
      setFilteredStats(playerStats);
    } finally {
      setIsLoadingFilter(false);
    }
  };

  // 表示モードが変更されたときの処理
  React.useEffect(() => {
    if (viewMode === 'season') {
      setFilteredStats(playerStats);
    } else {
      loadFilteredData(viewMode, {
        date: selectedDate,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
    }
  }, [viewMode, playerStats]);

  // 日付やレンジが変更されたときの処理
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    if (viewMode === 'daily') {
      loadFilteredData('daily', { date: newDate });
    }
  };

  const handleRangeChange = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    if (viewMode === 'range') {
      loadFilteredData('range', { startDate: newRange.start, endDate: newRange.end });
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'total': return '📊 全期間累計';
      case 'daily': return `📅 ${selectedDate}の順位`;
      case 'range': return `📆 ${dateRange.start} 〜 ${dateRange.end}の順位`;
      default: return activeSeason ? `🏆 ${activeSeason.name}` : '🏆 シーズン順位';
    }
  };

  // ソート機能
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const sortedPlayerStats = React.useMemo(() => {
    const stats = [...filteredStats];
    stats.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'name') {
        aValue = a.player?.name || '';
        bValue = b.player?.name || '';
      }
      
      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
    return stats;
  }, [filteredStats, sortConfig]);

  const togglePlayerDetails = (playerId) => {
    setExpandedPlayerId(expandedPlayerId === playerId ? null : playerId);
  };

  if (isLoading || isLoadingFilter) {
    return React.createElement('div', { className: "flex justify-center items-center h-64" },
      React.createElement(LoadingSpinner, { size: "lg", message: isLoadingFilter ? "Loading filtered data..." : "Loading standings..." })
    );
  }

  return React.createElement('div', { className: "space-y-6" },
    // フィルターセクション
    React.createElement('div', { className: "bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 backdrop-blur-sm rounded-xl border border-primary/20 p-6" },
      React.createElement('div', { className: "flex items-center justify-between mb-6" },
        React.createElement('div', { className: "flex items-center space-x-3" },
          React.createElement('div', { className: "p-2 bg-primary/10 rounded-lg" },
            React.createElement('span', { className: "text-2xl" }, '🏆')
          ),
          React.createElement('h3', { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, '順位表表示設定')
        ),
        React.createElement('div', { className: "px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-primary/30 backdrop-blur-sm" },
          React.createElement('span', { className: "text-sm font-medium text-gray-700 dark:text-gray-300" }, getViewModeLabel())
        )
      ),
      
      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" },
        React.createElement('div', { className: "space-y-3" },
          React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
            React.createElement('span', { className: "w-2 h-2 bg-primary rounded-full mr-2" }),
            '表示範囲'
          ),
          React.createElement('div', { className: "relative" },
            React.createElement(Select, {
              value: viewMode,
              onChange: (e) => setViewMode(e.target.value),
              className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-primary/30 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            },
              React.createElement('option', { value: 'season' }, '🏆 アクティブシーズン'),
              React.createElement('option', { value: 'total' }, '📊 全期間累計'),
              React.createElement('option', { value: 'daily' }, '📅 日別'),
              React.createElement('option', { value: 'range' }, '📆 期間指定')
            )
          )
        ),
        viewMode === 'daily' && 
        React.createElement('div', { className: "space-y-3" },
          React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
            React.createElement('span', { className: "w-2 h-2 bg-blue-500 rounded-full mr-2" }),
            '対象日'
          ),
          React.createElement(Input, {
            type: "date",
            value: selectedDate,
            onChange: (e) => handleDateChange(e.target.value),
            className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          })
        ),
        viewMode === 'range' && 
        React.createElement(React.Fragment, null,
          React.createElement('div', { className: "space-y-3" },
            React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
              React.createElement('span', { className: "w-2 h-2 bg-green-500 rounded-full mr-2" }),
              '開始日'
            ),
            React.createElement(Input, {
              type: "date",
              value: dateRange.start,
              onChange: (e) => handleRangeChange('start', e.target.value),
              className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
            })
          ),
          React.createElement('div', { className: "space-y-3" },
            React.createElement('label', { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center" },
              React.createElement('span', { className: "w-2 h-2 bg-red-500 rounded-full mr-2" }),
              '終了日'
            ),
            React.createElement(Input, {
              type: "date",
              value: dateRange.end,
              onChange: (e) => handleRangeChange('end', e.target.value),
              className: "w-full bg-white/80 dark:bg-gray-800/80 border-2 border-red-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
            })
          )
        )
      )
    ),
    
    // 順位表
    React.createElement(Card, { className: "p-4 sm:p-6" },
      React.createElement('div', { className: "flex items-center justify-between mb-4" },
        React.createElement('div', { className: "flex items-center" },
          React.createElement(TrophyIcon, { className: "w-8 h-8 mr-3 text-primary" }),
          React.createElement('h1', { className: "text-3xl font-bold" }, 'リーグ順位表'),
          activeSeason && 
          React.createElement('span', { className: "ml-3 text-lg text-neutral" }, `- ${activeSeason.name}`)
        )
      ),
      
      filteredStats.length === 0 ? 
      React.createElement('div', { className: "text-center py-12" },
        React.createElement(TrophyIcon, { className: "w-16 h-16 mx-auto text-neutral mb-4" }),
        React.createElement('p', { className: "text-neutral" }, 'まだ順位データがありません。')
      ) :
      React.createElement('div', { className: "overflow-x-auto" },
        React.createElement('table', { className: "min-w-full divide-y divide-neutral/20" },
          React.createElement('thead', { className: "bg-base-100/50" },
            React.createElement('tr', null,
              React.createElement('th', { className: "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider w-12" }, '順位'),
              React.createElement('th', { 
                className: "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                onClick: () => requestSort('name')
              }, 'プレイヤー ', getSortIndicator('name')),
              React.createElement('th', { 
                className: "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                onClick: () => requestSort('totalPoints')
              }, '総得点 ', getSortIndicator('totalPoints')),
              React.createElement('th', { 
                className: "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                onClick: () => requestSort('gamesPlayed')
              }, 'ゲーム数 ', getSortIndicator('gamesPlayed')),
              React.createElement('th', { 
                className: "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                onClick: () => requestSort('averagePoints')
              }, '平均得点 ', getSortIndicator('averagePoints')),
              React.createElement('th', { 
                className: "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                onClick: () => requestSort('winRate')
              }, '1位率 ', getSortIndicator('winRate')),
              React.createElement('th', { className: "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" }, '詳細')
            )
          ),
          React.createElement('tbody', { className: "bg-base-100 divide-y divide-neutral/10" },
            sortedPlayerStats.map((stat, index) => {
              const isTopRank = index < 3;
              const rankColors = {
                0: 'text-yellow-600',
                1: 'text-gray-600', 
                2: 'text-orange-600'
              };
              
              return React.createElement(React.Fragment, { key: stat.player.id },
                React.createElement('tr', { 
                  className: `hover:bg-neutral/5 ${expandedPlayerId === stat.player.id ? 'bg-neutral/5' : ''}`
                },
                  React.createElement('td', { 
                    className: `px-3 py-3 whitespace-nowrap text-sm font-bold ${index < 3 ? rankColors[index] : 'text-base-content'}`
                  }, index + 1),
                  React.createElement('td', { className: "px-3 py-3 whitespace-nowrap" },
                    React.createElement('div', { className: "flex items-center" },
                      React.createElement('img', { 
                        className: "h-8 w-8 rounded-full object-cover mr-2 border-2 border-primary/50",
                        src: stat.player.avatarUrl || `https://picsum.photos/seed/${stat.player.name.replace(/\s+/g, '')}/64/64`,
                        alt: stat.player.name
                      }),
                      React.createElement('button', { 
                        onClick: () => navigate(ROUTES.PLAYER_DETAIL, { playerId: stat.player.id }),
                        className: "text-sm font-medium text-primary hover:underline focus:outline-none focus:underline"
                      }, stat.player.name)
                    )
                  ),
                  React.createElement('td', { 
                    className: `px-3 py-3 whitespace-nowrap text-sm font-semibold ${stat.totalPoints >= 0 ? 'text-green-500' : 'text-red-500'}`
                  }, stat.totalPoints.toFixed(1)),
                  React.createElement('td', { className: "px-3 py-3 whitespace-nowrap text-sm" }, stat.gamesPlayed),
                  React.createElement('td', { 
                    className: `px-3 py-3 whitespace-nowrap text-sm ${stat.averagePoints >= 0 ? 'text-green-600' : 'text-red-600'}`
                  }, stat.averagePoints.toFixed(1)),
                  React.createElement('td', { className: "px-3 py-3 whitespace-nowrap text-sm" }, 
                    React.createElement('div', { className: "flex items-center" },
                      React.createElement('div', { className: "w-16 bg-neutral bg-opacity-20 rounded-full h-2 mr-2" },
                        React.createElement('div', { 
                          className: "bg-primary h-2 rounded-full",
                          style: { width: `${Math.min(stat.winRate * 100, 100)}%` }
                        })
                      ),
                      React.createElement('span', null, `${(stat.winRate * 100).toFixed(1)}%`)
                    )
                  ),
                  React.createElement('td', { className: "px-3 py-3 whitespace-nowrap text-sm" },
                    React.createElement(Button, { 
                      size: "sm", 
                      variant: "ghost",
                      onClick: () => togglePlayerDetails(stat.player.id),
                      className: "text-primary hover:text-primary-focus hover:bg-primary/10 transition-all duration-200",
                      'aria-expanded': expandedPlayerId === stat.player.id,
                      'aria-label': `${stat.player.name}の詳細を${expandedPlayerId === stat.player.id ? '閉じる' : '表示'}`
                    },
                      expandedPlayerId === stat.player.id 
                        ? React.createElement(ChevronUpIcon, { className: "w-5 h-5" })
                        : React.createElement(ChevronDownIcon, { className: "w-5 h-5" })
                    )
                  )
                ),
                expandedPlayerId === stat.player.id &&
                React.createElement('tr', { className: "bg-base-100/90" },
                  React.createElement('td', { colSpan: 7, className: "px-3 py-3" },
                    React.createElement('div', { className: "p-3 bg-neutral/5 rounded-md" },
                      React.createElement('h4', { className: "text-md font-semibold mb-2" }, 
                        `${stat.player.name}のクイック統計`
                      ),
                      React.createElement('div', { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm" },
                        React.createElement('p', null, '平均順位: ', 
                          React.createElement('span', { className: "font-medium" }, stat.averageRank.toFixed(2))
                        ),
                        React.createElement('p', null, '1位: ', 
                          React.createElement('span', { className: "font-medium" }, 
                            `${stat.rankDistribution[1] || 0} (${(stat.winRate * 100).toFixed(1)}%)`
                          )
                        ),
                        React.createElement('p', null, '2位: ', 
                          React.createElement('span', { className: "font-medium" }, 
                            `${stat.rankDistribution[2] || 0} (${(stat.secondPlaceRate * 100).toFixed(1)}%)`
                          )
                        ),
                        React.createElement('p', null, '3位: ', 
                          React.createElement('span', { className: "font-medium" }, 
                            `${stat.rankDistribution[3] || 0} (${(stat.thirdPlaceRate * 100).toFixed(1)}%)`
                          )
                        ),
                        React.createElement('p', null, '4位: ', 
                          React.createElement('span', { className: "font-medium" }, 
                            `${stat.rankDistribution[4] || 0} (${(stat.fourthPlaceRate * 100).toFixed(1)}%)`
                          )
                        ),
                        React.createElement('p', null, '平均点数: ', 
                          React.createElement('span', { className: "font-medium" }, stat.averageRawScore.toLocaleString())
                        )
                      ),
                      stat.lastTenGamesPoints && stat.lastTenGamesPoints.length > 0 &&
                      React.createElement('div', { className: "mt-3" },
                        React.createElement('h5', { className: "text-xs font-semibold mb-1" }, 
                          `直近${stat.lastTenGamesPoints.length}ゲームの傾向 (計算得点):`
                        ),
                        React.createElement('div', { className: "flex items-end h-16 space-x-1 bg-neutral/10 p-2 rounded" },
                          stat.lastTenGamesPoints.map((pts, i) => 
                            React.createElement('div', { 
                              key: i,
                              className: `w-4 ${pts >= 0 ? 'bg-green-400' : 'bg-red-400'} rounded-t`,
                              style: { height: `${Math.max(Math.abs(pts) / 50 * 100, 4)}%` },
                              title: `${pts.toFixed(1)}pt`
                            })
                          )
                        )
                      ),
                      React.createElement('button', { 
                        onClick: () => navigate(ROUTES.PLAYER_DETAIL, { playerId: stat.player.id }),
                        className: "mt-3 inline-block text-sm text-primary hover:underline focus:outline-none focus:underline"
                      }, 'プレイヤー詳細を見る →')
                    )
                  )
                )
              );
            })
          )
        )
      )
    ),
    
    selectedGame && React.createElement(GameDetailModal, { 
      game: selectedGame, 
      onClose: () => setSelectedGame(null) 
    })
  );
};

// Enhanced Settings Page
const SettingsPage = ({ currentSettings, onSaveSettings, isLoading, activeSeason }) => {
  const [settings, setSettings] = React.useState(currentSettings || DEFAULT_LEAGUE_SETTINGS);
  const [errors, setErrors] = React.useState({});
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isSubmitting && currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings, isSubmitting]);

  const umaSum = React.useMemo(() => {
    return Object.values(settings.umaPoints || {}).reduce((acc, val) => acc + Number(val || 0), 0);
  }, [settings.umaPoints]);

  const validateSettings = () => {
    const newErrors = {};

    if (!settings.gameStartChipCount || settings.gameStartChipCount <= 0) {
      newErrors.gameStartChipCount = 'ゲーム開始チップ数は正の数値である必要があります';
    }

    if (!settings.calculationBaseChipCount || settings.calculationBaseChipCount <= 0) {
      newErrors.calculationBaseChipCount = '計算基準チップ数は正の数値である必要があります';
    }

    [1, 2, 3, 4].forEach(rank => {
      if (settings.umaPoints?.[rank] === undefined || settings.umaPoints[rank] === '') {
        newErrors[`uma_${rank}`] = `${rank}位の順位点を入力してください`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: Number(value) }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (showConfirmation) setShowConfirmation(false);
  };

  const handleUmaChange = (e, rank) => {
    const { value } = e.target;
    setSettings(prev => ({
      ...prev,
      umaPoints: {
        ...prev.umaPoints,
        [rank]: Number(value),
      },
    }));
    if (errors[`uma_${rank}`]) {
      setErrors(prev => ({ ...prev, [`uma_${rank}`]: '' }));
    }
    if (showConfirmation) setShowConfirmation(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateSettings()) return;

    setIsSubmitting(true);
    try {
      await onSaveSettings(settings);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 5000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setErrors({ submit: '設定の保存に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_LEAGUE_SETTINGS);
    setErrors({});
    if (showConfirmation) setShowConfirmation(false);
  };

  const presetConfigs = [
    {
      name: 'M-League スタイル',
      config: {
        gameStartChipCount: 25000,
        calculationBaseChipCount: 30000,
        umaPoints: { 1: 30, 2: 10, 3: -10, 4: -30 }
      }
    },
    {
      name: 'フリー雀荘 スタイル',
      config: {
        gameStartChipCount: 25000,
        calculationBaseChipCount: 25000,
        umaPoints: { 1: 20, 2: 10, 3: -10, 4: -20 }
      }
    },
    {
      name: 'オカなし ウマのみ',
      config: {
        gameStartChipCount: 25000,
        calculationBaseChipCount: 25000,
        umaPoints: { 1: 15, 2: 5, 3: -5, 4: -15 }
      }
    }
  ];

  if (isLoading) {
    return React.createElement('div', { className: "flex justify-center items-center h-64" },
      React.createElement(LoadingSpinner, { size: "lg", message: "Loading settings..." })
    );
  }

  return React.createElement('div', { className: "space-y-6" },
    React.createElement(Card, { className: "p-4 sm:p-6" },
      React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6" },
        React.createElement('div', { className: "flex items-center mb-4 sm:mb-0" },
          React.createElement(CogIcon, { className: "w-8 h-8 mr-3 text-primary" }),
          React.createElement('h1', { className: "text-3xl font-bold" }, 'リーグ得点設定'),
          activeSeason && 
          React.createElement('span', { className: "ml-3 text-lg text-neutral" }, `- ${activeSeason.name}`)
        ),
        React.createElement('div', { className: "flex space-x-2" },
          React.createElement(Button, { 
            onClick: handleResetToDefaults, 
            variant: "secondary", 
            size: "sm",
            disabled: isSubmitting
          }, 'デフォルトに戻す')
        )
      ),

      React.createElement('div', { className: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" },
        presetConfigs.map((preset, index) =>
          React.createElement(Card, { 
            key: index,
            className: "p-4 cursor-pointer hover:shadow-md transition-all",
            onClick: () => {
              setSettings(prev => ({ ...prev, ...preset.config }));
              setErrors({});
            }
          },
            React.createElement('h3', { className: "font-semibold text-primary mb-2" }, preset.name),
            React.createElement('div', { className: "text-sm text-neutral space-y-1" },
              React.createElement('p', null, `開始: ${preset.config.gameStartChipCount.toLocaleString()}`),
              React.createElement('p', null, `基準: ${preset.config.calculationBaseChipCount.toLocaleString()}`),
              React.createElement('p', null, 
                `ウマ: ${preset.config.umaPoints[1]}, ${preset.config.umaPoints[2]}, ${preset.config.umaPoints[3]}, ${preset.config.umaPoints[4]}`
              )
            )
          )
        )
      ),
        
      React.createElement('form', { onSubmit: handleSubmit, className: "space-y-8" },
        React.createElement('section', null,
          React.createElement('h2', { className: "text-xl font-semibold text-primary mb-4 flex items-center" },
            React.createElement(ChartBarIcon, { className: "w-5 h-5 mr-2" }),
            '得点計算基準'
          ),
          React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
            React.createElement('div', null,
              React.createElement('label', { 
                htmlFor: "gameStartChipCount", 
                className: "block text-sm font-medium text-base-content mb-1" 
              }, 'ゲーム開始チップ数 (1人あたり)'),
              React.createElement(Input, {
                type: "number",
                name: "gameStartChipCount",
                id: "gameStartChipCount",
                value: settings.gameStartChipCount || '',
                onChange: handleChange,
                placeholder: "例: 25000",
                step: "1000",
                disabled: isSubmitting,
                error: !!errors.gameStartChipCount
              }),
              errors.gameStartChipCount && 
              React.createElement('p', { className: "text-red-500 text-xs mt-1" }, errors.gameStartChipCount),
              React.createElement('p', { className: "text-xs text-neutral mt-1" },
                'ゲーム開始時の総チップ数は この値×4 になります。素点の入力検証に使用されます。'
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { 
                htmlFor: "calculationBaseChipCount", 
                className: "block text-sm font-medium text-base-content mb-1" 
              }, '計算基準チップ数'),
              React.createElement(Input, {
                type: "number",
                name: "calculationBaseChipCount",
                id: "calculationBaseChipCount",
                value: settings.calculationBaseChipCount || '',
                onChange: handleChange,
                placeholder: "例: 25000 または 30000",
                step: "1000",
                disabled: isSubmitting,
                error: !!errors.calculationBaseChipCount
              }),
              errors.calculationBaseChipCount && 
              React.createElement('p', { className: "text-red-500 text-xs mt-1" }, errors.calculationBaseChipCount),
              React.createElement('p', { className: "text-xs text-neutral mt-1" },
                '得点計算式: (素点 - この値) / 1000 + 順位点'
              )
            )
          )
        ),

        React.createElement('section', null,
          React.createElement('h2', { className: "text-xl font-semibold mb-4 flex items-center" },
            React.createElement(TrophyIcon, { className: "w-5 h-5 mr-2" }),
            '順位点（UMA）'
          ),
          React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-4" },
            [1, 2, 3, 4].map(rank => {
              const rankColors = {
                1: "border-yellow-400 bg-yellow-50",
                2: "border-gray-400 bg-gray-50",
                3: "border-orange-400 bg-orange-50",
                4: "border-red-400 bg-red-50"
              };
              
              return React.createElement('div', { 
                key: `uma-${rank}`,
                className: `p-3 rounded border-l-4 ${rankColors[rank]}`
              },
                React.createElement('label', { 
                  htmlFor: `umaPoints-${rank}`, 
                  className: "block text-sm font-medium text-base-content mb-2" 
                }, `${rank}位の順位点`),
                React.createElement(Input, {
                  type: "number",
                  name: `umaPoints-${rank}`,
                  id: `umaPoints-${rank}`,
                  value: settings.umaPoints?.[rank] || '',
                  onChange: (e) => handleUmaChange(e, rank),
                  placeholder: "例: 20",
                  step: "5",
                  disabled: isSubmitting,
                  error: !!errors[`uma_${rank}`]
                }),
                errors[`uma_${rank}`] && React.createElement('p', { className: "text-red-500 text-xs mt-1" }, errors[`uma_${rank}`])
              );
            })
          ),
          React.createElement('div', { 
            className: `p-3 rounded-md border ${
              umaSum === 0 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
            }`
          },
            React.createElement('p', { 
              className: `text-sm font-medium ${
                umaSum === 0 ? 'text-green-700' : 'text-yellow-700'
              }`
            },
              `順位点の合計: ${umaSum} `,
              umaSum === 0 
                ? '✓ バランスが取れています' 
                : '⚠ オカが開始/基準チップの差分で処理される場合、0が推奨されます'
            )
          )
        ),

        React.createElement('div', { className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4" },
          React.createElement('h3', { className: "text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3" }, 
            '💡 計算方法の説明'
          ),
          React.createElement('div', { className: "space-y-2 text-sm text-blue-700 dark:text-blue-300" },
            React.createElement('p', null,
              React.createElement('strong', null, '最終得点 = '),
              React.createElement('code', { className: "bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs" },
                '(素点 - 計算基準チップ数) ÷ 1000 + 順位点'
              )
            ),
            React.createElement('p', null,
              React.createElement('strong', null, '例: '), 
              '35000点で1位の場合（基準25000、1位+20）→ (35000-25000)÷1000+20 = +30.0pt'
            ),
            React.createElement('p', null,
              React.createElement('strong', null, '重要: '), 
              'これらの設定は新しく記録されるゲームにのみ適用されます。既存のゲーム記録は変更されません。'
            )
          )
        ),
        
        React.createElement('div', { className: "flex items-center justify-between pt-6 border-t border-neutral/10" },
          React.createElement('div', null,
            showConfirmation && 
            React.createElement('div', { className: "flex items-center text-green-600" },
              React.createElement('span', { className: "text-2xl mr-2" }, '✓'),
              React.createElement('span', { className: "font-medium" }, '設定が保存されました！')
            ),
            errors.submit && 
            React.createElement('p', { className: "text-red-500 text-sm" }, errors.submit)
          ),
          React.createElement('div', { className: "flex items-center space-x-3" },
            isSubmitting && React.createElement(LoadingSpinner, { size: "sm" }),
            React.createElement(Button, { 
              type: "submit", 
              variant: "primary",
              disabled: isSubmitting,
              leftIcon: isSubmitting ? null : React.createElement(CogIcon, { className: "w-4 h-4" })
            }, isSubmitting ? '保存中...' : '設定を保存')
          )
        )
      )
    )
  );
};

const PlayersPage = ({ players, addPlayer, updatePlayer, deletePlayer, games, isLoading }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPlayer, setEditingPlayer] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingPlayer, setDeletingPlayer] = React.useState(null);
  const [playerGameCounts, setPlayerGameCounts] = React.useState({});
  const [playerDeleteStates, setPlayerDeleteStates] = React.useState({});

  // プレイヤーの試合数をカウントする関数（現在のシーズンのみ）
  const countPlayerGames = React.useCallback((playerId) => {
    if (!games || games.length === 0) return 0;
    return games.filter(game => 
      game.results && game.results.some(result => result.playerId === playerId)
    ).length;
  }, [games]);

  // プレイヤーが削除可能かAPIでチェックする関数
  const checkPlayerCanDelete = async (playerId) => {
    try {
      const response = await apiRequest(`/api/players/${playerId}/can-delete`);
      return response;
    } catch (error) {
      console.error('Failed to check if player can be deleted:', error);
      return { canDelete: false, gameCount: 0, reason: 'チェックに失敗しました' };
    }
  };

  // 全プレイヤーの削除可能性をチェックする関数
  const checkAllPlayersDeleteStates = React.useCallback(async () => {
    const newDeleteStates = {};
    for (const player of players) {
      const deleteCheck = await checkPlayerCanDelete(player.id);
      newDeleteStates[player.id] = deleteCheck;
    }
    setPlayerDeleteStates(newDeleteStates);
  }, [players]);

  // プレイヤーの試合数を更新
  React.useEffect(() => {
    const newGameCounts = {};
    players.forEach(player => {
      newGameCounts[player.id] = countPlayerGames(player.id);
    });
    setPlayerGameCounts(newGameCounts);
  }, [players, countPlayerGames]);

  // プレイヤーの削除可能性を定期的にチェック
  React.useEffect(() => {
    if (players.length > 0) {
      checkAllPlayersDeleteStates();
    }
  }, [players, checkAllPlayersDeleteStates]);

  const handleOpenAddModal = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingPlayer(null);
  };

  const handleSavePlayer = async (data) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updatePlayer(data.id, data.name);
      } else {
        await addPlayer(data.name);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save player:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    // APIで削除可能かチェック
    const deleteCheck = await checkPlayerCanDelete(playerId);
    
    if (!deleteCheck.canDelete) {
      alert(`このプレイヤーは削除できません。\n理由: ${deleteCheck.reason}`);
      return;
    }
    
    if (confirm('このプレイヤーを削除しますか？この操作は取り消せません。')) {
      setIsSubmitting(true);
      try {
        await deletePlayer(playerId);
        setDeletingPlayer(null);
        // 削除後に削除可能性を再チェック
        await checkAllPlayersDeleteStates();
      } catch (error) {
        console.error('Failed to delete player:', error);
        alert('プレイヤーの削除に失敗しました。');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const PlayerForm = ({ onSave, initialData, onClose }) => {
    const [name, setName] = React.useState('');
    const [error, setError] = React.useState('');

    React.useEffect(() => {
      if (initialData?.name) {
        setName(initialData.name);
      } else {
        setName('');
      }
      setError('');
    }, [initialData]);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (name.trim() === '') {
        setError('プレイヤー名を入力してください。');
        return;
      }
      if (name.trim().length < 2) {
        setError('プレイヤー名は2文字以上で入力してください。');
        return;
      }
      onSave({ id: initialData?.id, name: name.trim() });
    };

    return React.createElement('form', { onSubmit: handleSubmit, className: "space-y-4 p-1" },
      React.createElement('div', null,
        React.createElement('label', { 
          htmlFor: "playerName", 
          className: "block text-sm font-medium text-base-content mb-1" 
        }, 'プレイヤー名'),
        React.createElement(Input, {
          type: "text",
          id: "playerName",
          name: "name",
          value: name,
          onChange: (e) => {
            setName(e.target.value);
            if (error) setError('');
          },
          placeholder: "プレイヤー名を入力",
          'aria-describedby': "name-error",
          autoFocus: true,
          error: !!error
        }),
        error && React.createElement('p', { 
          id: "name-error", 
          className: "mt-1 text-sm text-red-500" 
        }, error)
      ),
      React.createElement('div', { className: "flex justify-end space-x-2" },
        React.createElement(Button, { 
          type: "button", 
          onClick: onClose, 
          variant: "secondary",
          disabled: isSubmitting
        }, 'キャンセル'),
        React.createElement(Button, { 
          type: "submit", 
          variant: "primary",
          disabled: isSubmitting
        }, initialData?.id ? 'プレイヤー更新' : 'プレイヤー追加')
      )
    );
  };
  
  if (isLoading && players.length === 0) {
    return React.createElement('div', { className: "flex justify-center items-center h-64" },
      React.createElement(LoadingSpinner, { size: "lg", message: "Loading players..." })
    );
  }

  return React.createElement('div', { className: "space-y-6" },
    React.createElement(Card, { className: "p-4 sm:p-6" },
      React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6" },
        React.createElement('div', { className: "flex items-center mb-4 sm:mb-0" },
          React.createElement(UsersIcon, { className: "w-8 h-8 mr-3 text-primary" }),
          React.createElement('h1', { className: "text-3xl font-bold" }, 'プレイヤー管理')
        ),
        React.createElement(Button, { 
          onClick: handleOpenAddModal, 
          variant: "primary", 
          leftIcon: React.createElement(PlusCircleIcon, { className: "w-5 h-5" })
        }, '新規プレイヤー追加')
      ),
      
      isLoading && players.length > 0 && 
      React.createElement(LoadingSpinner, { message: "Refreshing player list...", className: "my-4" }),
      
      players.length === 0 ? 
      React.createElement('p', { className: "text-center text-neutral py-4" },
        'まだプレイヤーが登録されていません。「新規プレイヤー追加」をクリックして開始しましょう。'
      ) :
      React.createElement('div', { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" },
        players.map((player) => {
          const gameCount = playerGameCounts[player.id] || 0;
          const deleteState = playerDeleteStates[player.id];
          const canDelete = deleteState ? deleteState.canDelete : true; // デフォルトは削除可能とする
          
          return React.createElement(Card, { key: player.id, className: "p-4" },
            React.createElement('div', { className: "flex items-center space-x-3 mb-3" },
              React.createElement('img', { 
                src: player.avatarUrl || `https://picsum.photos/seed/${player.id}/64/64`,
                alt: player.name,
                className: "h-12 w-12 rounded-full object-cover mr-2 border-2 border-primary"
              }),
              React.createElement('div', { className: "flex-1" },
                React.createElement('h3', { className: "text-lg font-semibold text-base-content" }, player.name),
                React.createElement('p', { className: "text-xs text-neutral" }, `ID: ${player.id.substring(0, 8)}`),
                React.createElement('p', { className: "text-sm text-neutral mt-1" }, `現在のシーズン: ${gameCount}試合`)
              )
            ),
            React.createElement('div', { className: "flex justify-end space-x-2" },
              React.createElement(Button, { 
                variant: "ghost",
                size: "sm",
                onClick: () => handleOpenEditModal(player),
                leftIcon: React.createElement(PencilIcon, { className: "w-4 h-4" }),
                'aria-label': `${player.name}を編集`
              }, '編集'),
              React.createElement(Button, { 
                variant: "ghost",
                size: "sm",
                onClick: () => handleDeletePlayer(player.id),
                leftIcon: React.createElement(TrashIcon, { className: "w-4 h-4" }),
                'aria-label': `${player.name}を削除`,
                disabled: !canDelete || isSubmitting,
                className: canDelete ? "text-red-600 hover:text-red-700" : "text-gray-400 cursor-not-allowed",
                title: canDelete ? "削除（全シーズン累計で判定）" : deleteState ? deleteState.reason : "削除可能性を確認中..."
              }, '削除')
            )
          );
        })
      )
    ),

    React.createElement(Modal, { 
      isOpen: isModalOpen, 
      onClose: handleCloseModal, 
      title: editingPlayer ? 'プレイヤー編集' : '新規プレイヤー追加'
    },
      React.createElement(PlayerForm, { 
        onSave: handleSavePlayer, 
        initialData: editingPlayer ? { id: editingPlayer.id, name: editingPlayer.name } : null,
        onClose: handleCloseModal
      }),
      isSubmitting && React.createElement(LoadingSpinner, { message: "Saving...", className: "mt-2" })
    )
  );
};

// Enhanced Record Game Page
const RecordGamePage = ({ players, addGame, leagueSettings, isLoading, activeSeason }) => {
  const GameForm = ({ players, addGame, leagueSettings, onClose }) => {
    const [playerInputs, setPlayerInputs] = React.useState(() => 
      Array(4).fill(null).map(() => ({
        playerId: '',
        rawScore: '',
        agariCount: '0',
        riichiCount: '0',
        houjuuCount: '0',
        furoCount: '0'
      }))
    );
    
    const [roundName, setRoundName] = React.useState('');
    const [gameDate, setGameDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [totalHandsInGame, setTotalHandsInGame] = React.useState('');
    const [error, setError] = React.useState(null);
    const [calculatedResults, setCalculatedResults] = React.useState(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const totalRawScore = playerInputs.reduce((sum, ps) => sum + (parseInt(ps.rawScore, 10) || 0), 0);
    const expectedTotalScore = leagueSettings ? leagueSettings.gameStartChipCount * 4 : 100000;

    const handlePlayerInputChange = (index, field, value) => {
      const newPlayerInputs = [...playerInputs];
      newPlayerInputs[index] = { ...newPlayerInputs[index], [field]: value };
      setPlayerInputs(newPlayerInputs);
      setError(null);
      setCalculatedResults(null);
    };
    
    const validateAndCalculate = React.useCallback(() => {
      setError(null);
      setCalculatedResults(null);

      if (!gameDate) {
        setError('ゲーム日付を選択してください。');
        return false;
      }

      const selectedPlayerIds = playerInputs.map(ps => ps.playerId).filter(id => id !== '');
      if (selectedPlayerIds.length !== 4) {
        setError('4人のプレイヤーを選択してください。');
        return false;
      }
      if (new Set(selectedPlayerIds).size !== 4) {
        setError('各プレイヤーは異なる人を選択してください。');
        return false;
      }

      const scores = playerInputs.map(ps => parseInt(ps.rawScore, 10));
      if (scores.some(isNaN)) {
        setError('すべての素点を正しい数値で入力してください。');
        return false;
      }
      
      if (totalRawScore !== expectedTotalScore) {
        setError(`素点の合計は${expectedTotalScore}になる必要があります。現在の合計: ${totalRawScore}`);
        return false;
      }

      const gameDataForCalc = playerInputs.map(ps => ({
        playerId: ps.playerId,
        rawScore: parseInt(ps.rawScore, 10),
        agariCount: parseInt(ps.agariCount, 10) || 0,
        riichiCount: parseInt(ps.riichiCount, 10) || 0,
        houjuuCount: parseInt(ps.houjuuCount, 10) || 0,
        furoCount: parseInt(ps.furoCount, 10) || 0,
      }));

      try {
        const mLeagueResults = calculateMLeaguePoints(
          gameDataForCalc.map(p => ({ playerId: p.playerId, rawScore: p.rawScore })), 
          leagueSettings
        );
        
        const finalResults = mLeagueResults.map(mRes => {
          const inputData = gameDataForCalc.find(p => p.playerId === mRes.playerId);
          return {
            ...mRes,
            agariCount: inputData?.agariCount,
            riichiCount: inputData?.riichiCount,
            houjuuCount: inputData?.houjuuCount,
            furoCount: inputData?.furoCount,
          };
        });
        setCalculatedResults(finalResults);
        return true;
      } catch (e) {
        setError(e.message || "得点計算エラーが発生しました。");
        return false;
      }
    }, [playerInputs, totalRawScore, expectedTotalScore, gameDate, leagueSettings]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateAndCalculate() || !calculatedResults) {
        return;
      }

      const numTotalHands = totalHandsInGame ? parseInt(totalHandsInGame, 10) : undefined;
      if (totalHandsInGame && (isNaN(numTotalHands) || numTotalHands <= 0)) {
        setError('総局数は正の数値で入力してください。');
        return;
      }
      
      setIsSubmitting(true);
      try {
        await addGame(calculatedResults, gameDate, numTotalHands, roundName);
        
        // フォームリセット
        setPlayerInputs(Array(4).fill(null).map(() => ({
          playerId: '',
          rawScore: '',
          agariCount: '0',
          riichiCount: '0',
          houjuuCount: '0',
          furoCount: '0'
        })));
        setRoundName('');
        setGameDate(new Date().toISOString().split('T')[0]);
        setTotalHandsInGame('');
        setCalculatedResults(null);
        
        if (onClose) onClose();
      } catch (error) {
        setError(error.message || 'ゲーム記録に失敗しました。');
      } finally {
        setIsSubmitting(false);
      }
    };
    
    React.useEffect(() => {
      const allPlayersSelected = playerInputs.every(ps => ps.playerId !== '');
      const allScoresEntered = playerInputs.every(ps => ps.rawScore !== '' && !isNaN(parseInt(ps.rawScore)));
      if (allPlayersSelected && allScoresEntered) {
        validateAndCalculate();
      } else {
        setCalculatedResults(null);
      }
    }, [playerInputs, gameDate, leagueSettings, validateAndCalculate]);

    if (players.length < 4) {
      return React.createElement(Card, { className: "p-6 text-center" }, [
        React.createElement('div', { key: 'icon', className: "text-6xl mb-4" }, '🀄'),
        React.createElement('h3', { key: 'title', className: "text-xl font-semibold text-red-600 mb-2" }, 'プレイヤーが不足しています'),
        React.createElement('p', { key: 'message', className: "text-neutral mb-4" },
          `ゲームを記録するには、最低4人のプレイヤーが登録されている必要があります。現在: ${players.length}人`
        ),
        React.createElement('p', { key: 'instruction', className: "text-sm text-neutral" },
          'プレイヤー管理ページで新しいプレイヤーを追加してください。'
        )
      ]);
    }

    const statInputFields = [
      { key: 'agariCount', label: '和了数', placeholder: '0' },
      { key: 'riichiCount', label: 'リーチ数', placeholder: '0' },
      { key: 'houjuuCount', label: '放銃数', placeholder: '0' },
      { key: 'furoCount', label: '副露数', placeholder: '0' },
    ];

    return React.createElement('div', { className: "space-y-6" }, [
      // ゲーム詳細設定
      React.createElement(Card, { key: 'game-details', className: "p-4 space-y-3" }, [
        React.createElement('h3', { key: 'title', className: "text-lg font-semibold text-primary mb-2 flex items-center" },
          React.createElement(CalendarDaysIcon, { className: "w-5 h-5 mr-2" }),
          'ゲーム詳細'
        ),
        React.createElement('div', { key: 'fields', className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, [
          React.createElement('div', { key: 'date' }, [
            React.createElement('label', { 
              key: 'label',
              htmlFor: "gameDate", 
              className: "block text-sm font-medium text-base-content mb-1" 
            }, 'ゲーム日付 *'),
            React.createElement(Input, {
              key: 'input',
              type: "date",
              id: "gameDate",
              value: gameDate,
              onChange: (e) => setGameDate(e.target.value),
              required: true,
              disabled: isSubmitting
            })
          ]),
          React.createElement('div', { key: 'hands' }, [
            React.createElement('label', { 
              key: 'label',
              htmlFor: "totalHandsInGame", 
              className: "block text-sm font-medium text-base-content mb-1" 
            }, '総局数 (任意)'),
            React.createElement(Input, {
              key: 'input',
              type: "number",
              id: "totalHandsInGame",
              value: totalHandsInGame,
              onChange: (e) => setTotalHandsInGame(e.target.value),
              placeholder: "例: 8",
              min: "1",
              disabled: isSubmitting
            })
          ]),
          React.createElement('div', { key: 'round' }, [
            React.createElement('label', { 
              key: 'label',
              htmlFor: "roundName", 
              className: "block text-sm font-medium text-base-content mb-1" 
            }, 'ラウンド名 (任意)'),
            React.createElement(Input, {
              key: 'input',
              type: "text",
              id: "roundName",
              value: roundName,
              onChange: (e) => setRoundName(e.target.value),
              placeholder: "例: 第1回戦、東風戦",
              disabled: isSubmitting
            })
          ])
        ])
      ]),

      // プレイヤー入力フォーム
      React.createElement('div', { key: 'players', className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
        playerInputs.map((ps, index) =>
          React.createElement(Card, { key: index, className: "p-4 space-y-3" }, [
            React.createElement('h3', { key: 'title', className: "font-semibold text-primary flex items-center" }, 
              React.createElement('span', { className: "bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2" }, index + 1),
              `プレイヤー ${index + 1}`
            ),
            React.createElement('div', { key: 'player-select' }, [
              React.createElement('label', { 
                key: 'label',
                htmlFor: `player-${index}`, 
                className: "block text-xs font-medium text-base-content mb-1" 
              }, 'プレイヤー選択 *'),
              React.createElement(Select, {
                key: 'select',
                id: `player-${index}`,
                value: ps.playerId,
                onChange: (e) => handlePlayerInputChange(index, 'playerId', e.target.value),
                required: true,
                className: "w-full",
                disabled: isSubmitting
              },
                React.createElement('option', { key: 'empty', value: "" }, '-- プレイヤーを選択 --'),
                players.map(p =>
                  React.createElement('option', { 
                    key: p.id, 
                    value: p.id, 
                    disabled: playerInputs.some(psp => psp.playerId === p.id && psp.playerId !== ps.playerId)
                  }, p.name)
                )
              )
            ]),
            React.createElement('div', { key: 'score' }, [
              React.createElement('label', { 
                key: 'label',
                htmlFor: `score-${index}`, 
                className: "block text-xs font-medium text-base-content mb-1" 
              }, `素点 * (基準: ${leagueSettings ? leagueSettings.gameStartChipCount : 25000})`),
              React.createElement(Input, {
                key: 'input',
                type: "number",
                id: `score-${index}`,
                value: ps.rawScore,
                onChange: (e) => handlePlayerInputChange(index, 'rawScore', e.target.value),
                placeholder: `例: ${leagueSettings ? leagueSettings.gameStartChipCount : 25000}`,
                step: "100",
                required: true,
                className: "w-full",
                disabled: isSubmitting
              })
            ]),
            React.createElement('div', { key: 'details', className: "mt-2 pt-2 border-t border-neutral/10 space-y-2" }, [
              React.createElement('h4', { key: 'title', className: "text-xs font-medium text-neutral" }, '詳細統計 (任意):'),
              React.createElement('div', { key: 'stats', className: "grid grid-cols-2 gap-x-3 gap-y-2" },
                statInputFields.map(field =>
                  React.createElement('div', { key: field.key }, [
                    React.createElement('label', { 
                      key: 'label',
                      htmlFor: `${field.key}-${index}`, 
                      className: "block text-xs font-medium text-base-content mb-0.5" 
                    }, field.label),
                    React.createElement(Input, {
                      key: 'input',
                      type: "number",
                      id: `${field.key}-${index}`,
                      value: ps[field.key],
                      onChange: (e) => handlePlayerInputChange(index, field.key, e.target.value),
                      placeholder: field.placeholder,
                      min: "0",
                      className: "w-full text-sm p-1.5",
                      disabled: isSubmitting
                    })
                  ])
                )
              )
            ])
          ])
        )
      ),
      
      // 素点合計表示
      React.createElement('div', { key: 'total', className: "p-3 bg-neutral/5 rounded-md text-sm flex justify-between items-center" }, [
        React.createElement('span', { key: 'label' }, '素点合計:'),
        React.createElement('span', { key: 'value', className: `font-semibold ${totalRawScore === expectedTotalScore ? 'text-green-500' : 'text-red-500'}` }, 
          `${totalRawScore.toLocaleString()} / ${expectedTotalScore.toLocaleString()}`
        )
      ]),

      // エラー表示
      error && React.createElement('div', { key: 'error', className: "p-3 bg-red-50 border border-red-200 rounded-md" },
        React.createElement('p', { className: "text-red-700 text-sm" }, error)
      ),

      // 計算結果プレビュー
      calculatedResults &&
      React.createElement('div', { key: 'preview', className: "mt-4 space-y-2" }, [
        React.createElement('h4', { key: 'title', className: "font-semibold text-lg text-green-600" }, '✅ 計算得点プレビュー:'),
        React.createElement('div', { key: 'results', className: "bg-green-50 p-4 rounded-md" },
          React.createElement('div', { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
            calculatedResults
              .sort((a, b) => a.rank - b.rank)
              .map(res => {
                const player = players.find(p => p.id === res.playerId);
                const rankColors = {
                  1: "text-yellow-600 font-bold",
                  2: "text-gray-600 font-semibold", 
                  3: "text-orange-600 font-medium",
                  4: "text-red-600 font-medium"
                };
                return React.createElement('div', { 
                  key: res.playerId, 
                  className: "flex justify-between items-center text-sm p-2 bg-white rounded border"
                }, [
                  React.createElement('div', { key: 'left' }, [
                    React.createElement('span', { className: `${rankColors[res.rank]} mr-2` }, `${res.rank}位`),
                    React.createElement('span', { className: "font-medium" }, player?.name)
                  ]),
                  React.createElement('div', { key: 'right', className: "text-right" }, [
                    React.createElement('div', { className: "text-xs text-gray-500" }, `${res.rawScore.toLocaleString()}点`),
                    React.createElement('div', { className: `font-bold ${res.calculatedPoints >= 0 ? 'text-green-600' : 'text-red-600'}` }, 
                      `${res.calculatedPoints > 0 ? '+' : ''}${res.calculatedPoints.toFixed(1)}pt`
                    )
                  ])
                ]);
              })
          )
        )
      ]),

      // 送信ボタン
      React.createElement('form', { key: 'form', onSubmit: handleSubmit },
        React.createElement('div', { className: "flex justify-end space-x-3 pt-4" }, [
          onClose && React.createElement(Button, { 
            key: 'cancel',
            type: "button", 
            onClick: onClose, 
            variant: "secondary",
            disabled: isSubmitting
          }, 'キャンセル'),
          React.createElement(Button, { 
            key: 'submit',
            type: "submit", 
            variant: "primary", 
            disabled: !calculatedResults || totalRawScore !== expectedTotalScore || !gameDate || isSubmitting,
            leftIcon: isSubmitting ? React.createElement(LoadingSpinner, { size: "sm" }) : null
          }, isSubmitting ? '記録中...' : 'ゲーム記録')
        ])
      )
    ]);
  };

  if (isLoading) {
    return React.createElement('div', { className: "flex justify-center items-center h-64" },
      React.createElement(LoadingSpinner, { size: "lg", message: "Loading game data..." })
    );
  }
  
  return React.createElement('div', { className: "space-y-6" },
    React.createElement(Card, { className: "p-4 sm:p-6" }, [
      React.createElement('div', { key: 'header', className: "flex items-center mb-6" }, [
        React.createElement(PlusCircleIcon, { key: 'icon', className: "w-8 h-8 mr-3 text-primary" }),
        React.createElement('h1', { key: 'title', className: "text-3xl font-bold" }, '新規ゲーム記録'),
        activeSeason && 
        React.createElement('span', { key: 'season', className: "ml-3 text-lg text-neutral" }, `- ${activeSeason.name}`)
      ]),
      React.createElement(GameForm, { 
        key: 'form',
        players: players, 
        addGame: addGame, 
        leagueSettings: leagueSettings 
      })
    ])
  );
};

// Main App Component
const App = () => {
  // Navigation state
  const { currentRoute, routeParams, navigate, goBack } = useNavigation();
  
  // Theme state
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem('mahjongTheme');
    return saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  // Application state
  const [seasons, setSeasons] = React.useState([]);
  const [activeSeason, setActiveSeason] = React.useState(null);
  const [players, setPlayers] = React.useState([]);
  const [games, setGames] = React.useState([]);
  const [leagueSettings, setLeagueSettings] = React.useState(null);
  const [playerStats, setPlayerStats] = React.useState([]);

  // Loading states
  const [isLoadingSeasons, setIsLoadingSeasons] = React.useState(true);
  const [isLoadingPlayers, setIsLoadingPlayers] = React.useState(true);
  const [isLoadingGames, setIsLoadingGames] = React.useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);

  // Theme management
  React.useEffect(() => {
    localStorage.setItem('mahjongTheme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // API functions
  const apiRequest = async (url, options = {}) => {
    try {
      // BASE_PATHにAPIパスをプレフィックス
      const basePath = window.BASE_PATH || '';
      const endpoint = `${basePath}${url}`;
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }
      
      return data.data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  // Data loading functions
  const loadSeasons = async () => {
    try {
      setIsLoadingSeasons(true);
      const [seasonsData, activeSeasonData] = await Promise.all([
        apiRequest('/api/seasons'),
        apiRequest('/api/seasons/active').catch(() => null)
      ]);
      setSeasons(seasonsData);
      setActiveSeason(activeSeasonData);
    } catch (error) {
      console.error('Failed to load seasons:', error);
    } finally {
      setIsLoadingSeasons(false);
    }
  };

  const loadPlayers = async () => {
    try {
      setIsLoadingPlayers(true);
      const playersData = await apiRequest('/api/players');
      setPlayers(playersData);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const loadGamesAndSettings = async (seasonId) => {
    if (!seasonId) return;
    
    try {
      setIsLoadingGames(true);
      setIsLoadingSettings(true);
      
      const [gamesData, settingsData] = await Promise.all([
        apiRequest(`/api/seasons/${seasonId}/games`),
        apiRequest(`/api/seasons/${seasonId}/settings`)
      ]);
      
      setGames(gamesData);
      setLeagueSettings(settingsData);
    } catch (error) {
      console.error('Failed to load games and settings:', error);
    } finally {
      setIsLoadingGames(false);
      setIsLoadingSettings(false);
    }
  };

  const loadStandings = async (seasonId) => {
    if (!seasonId) return;
    
    try {
      const standingsData = await apiRequest(`/api/seasons/${seasonId}/standings`);
      setPlayerStats(standingsData);
    } catch (error) {
      console.error('Failed to load standings:', error);
      if (games.length > 0 && players.length > 0) {
        const calculatedStats = calculatePlayerStats(games, players);
        setPlayerStats(calculatedStats);
      }
    }
  };

  const loadAllStandings = async () => {
    try {
      const standingsData = await apiRequest('/api/standings/all');
      return standingsData;
    } catch (error) {
      console.error('Failed to load all standings:', error);
      throw error;
    }
  };

  const loadDailyStandings = async (date) => {
    try {
      const standingsData = await apiRequest(`/api/standings/daily?date=${date}`);
      return standingsData;
    } catch (error) {
      console.error('Failed to load daily standings:', error);
      throw error;
    }
  };

  const loadRangeStandings = async (startDate, endDate) => {
    try {
      const standingsData = await apiRequest(`/api/standings/daily?date=${endDate}`);
      return standingsData;
    } catch (error) {
      console.error('Failed to load range standings:', error);
      throw error;
    }
  };

  const loadAllGames = async () => {
    try {
      const gamesData = await apiRequest('/api/games/all');
      return gamesData;
    } catch (error) {
      console.error('Failed to load all games:', error);
      throw error;
    }
  };

  const loadDailyGames = async (date) => {
    try {
      const gamesData = await apiRequest(`/api/games/daily?date=${date}`);
      return gamesData;
    } catch (error) {
      console.error('Failed to load daily games:', error);
      throw error;
    }
  };

  const loadRangeGames = async (startDate, endDate) => {
    try {
      const gamesData = await apiRequest(`/api/games/date-range?start_date=${startDate}&end_date=${endDate}`);
      return gamesData;
    } catch (error) {
      console.error('Failed to load range games:', error);
      throw error;
    }
  };

  // Initialize app
  React.useEffect(() => {
    loadSeasons();
    loadPlayers();
  }, []);

  React.useEffect(() => {
    if (activeSeason) {
      loadGamesAndSettings(activeSeason.id);
    }
  }, [activeSeason]);

  React.useEffect(() => {
    if (activeSeason) {
      loadStandings(activeSeason.id);
    }
  }, [games, activeSeason]);

  // Management functions
  const addPlayer = async (name) => {
    try {
      await apiRequest('/api/players', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      await loadPlayers();
    } catch (error) {
      console.error('Failed to add player:', error);
      throw error;
    }
  };

  const updatePlayer = async (id, name) => {
    try {
      await apiRequest(`/api/players/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      await loadPlayers();
    } catch (error) {
      console.error('Failed to update player:', error);
      throw error;
    }
  };

  const deletePlayer = async (id) => {
    try {
      await apiRequest(`/api/players/${id}`, {
        method: 'DELETE'
      });
      await loadPlayers();
    } catch (error) {
      console.error('Failed to delete player:', error);
      throw error;
    }
  };

  const addGame = async (gameResults, gameDate, totalHandsInGame, roundName) => {
    if (!activeSeason) {
      throw new Error('No active season selected');
    }

    try {
      await apiRequest(`/api/seasons/${activeSeason.id}/games`, {
        method: 'POST',
        body: JSON.stringify({
          gameResults,
          gameDate,
          totalHandsInGame,
          roundName,
        }),
      });
      await loadGamesAndSettings(activeSeason.id);
    } catch (error) {
      console.error('Failed to add game:', error);
      throw error;
    }
  };

  const updateGame = async (gameId, gameData) => {
    try {
      console.log('updateGame called with:', { gameId, gameData });
      
      // gameDataが配列（計算結果）の場合とオブジェクトの場合を処理
      let payload;
      if (Array.isArray(gameData)) {
        // GameFormから来た場合（計算結果の配列）
        payload = {
          gameResults: gameData
        };
      } else {
        // GameEditModalから来た場合
        payload = {
          gameResults: gameData.results || gameData.gameResults || gameData,
          gameDate: gameData.gameDate,
          totalHandsInGame: gameData.totalHandsInGame,
          roundName: gameData.roundName,
        };
      }

      console.log('Sending payload:', payload);

      await apiRequest(`/api/games/${gameId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      
      // ゲームを更新した後、現在のデータをリロード
      if (activeSeason) {
        await loadGamesAndSettings(activeSeason.id);
      }
    } catch (error) {
      console.error('Failed to update game:', error);
      throw error;
    }
  };

  const deleteGame = async (gameId) => {
    try {
      await apiRequest(`/api/games/${gameId}`, {
        method: 'DELETE',
      });
      // ゲームを削除した後、現在のデータをリロード
      if (activeSeason) {
        await loadGamesAndSettings(activeSeason.id);
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      throw error;
    }
  };

  const refreshGames = async () => {
    if (activeSeason) {
      await loadGamesAndSettings(activeSeason.id);
    }
  };

  const createSeason = async (seasonData) => {
    try {
      await apiRequest('/api/seasons', {
        method: 'POST',
        body: JSON.stringify(seasonData),
      });
      await loadSeasons();
    } catch (error) {
      console.error('Failed to create season:', error);
      throw error;
    }
  };

  const updateSeason = async (seasonId, seasonData) => {
    try {
      await apiRequest(`/api/seasons/${seasonId}`, {
        method: 'PUT',
        body: JSON.stringify(seasonData),
      });
      await loadSeasons();
    } catch (error) {
      console.error('Failed to update season:', error);
      throw error;
    }
  };

  const activateSeason = async (seasonId) => {
    try {
      await apiRequest(`/api/seasons/${seasonId}/activate`, {
        method: 'POST',
      });
      await loadSeasons();
    } catch (error) {
      console.error('Failed to activate season:', error);
           throw error;
    }
  };

  const saveSettings = async (newSettings) => {
    if (!activeSeason) {
      throw new Error('No active season selected');
    }

    try {
      await apiRequest(`/api/seasons/${activeSeason.id}/settings`, {
        method: 'PUT',
        body: JSON.stringify(newSettings),
      });
      await loadGamesAndSettings(activeSeason.id);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const isLoading = isLoadingSeasons || isLoadingPlayers || 
    (activeSeason && (isLoadingGames || isLoadingSettings));

  // Navbar Component
  const Navbar = () => {
    const navItems = [
      { route: ROUTES.HOME, label: '順位表', icon: TrophyIcon },
      { route: ROUTES.PLAYERS, label: 'プレイヤー', icon: UsersIcon },
      { route: ROUTES.RECORD_GAME, label: 'ゲーム記録', icon: PlusCircleIcon },
      { route: ROUTES.GAME_HISTORY, label: 'ゲーム履歴', icon: ListBulletIcon },
      { route: ROUTES.SEASONS, label: 'シーズン', icon: CalendarDaysIcon },
      { route: ROUTES.SETTINGS, label: '設定', icon: CogIcon }
    ];

    const NavItem = ({ route, label, icon: Icon, active }) => (
      React.createElement('button', {
        onClick: () => navigate(route),
        className: `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
          active 
            ? 'bg-primary text-white' 
            : 'text-base-content hover:bg-neutral/10'
        }`
      },
        React.createElement(Icon, { className: "h-5 w-5 mr-1" }),
        React.createElement('span', { className: "hidden sm:inline" }, label)
      )
    );

    return React.createElement('header', { 
      className: "bg-base-100/80 backdrop-blur-md shadow-md sticky top-0 z-50" 
    },
      React.createElement('div', { className: "container mx-auto px-4 sm:px-6 lg:px-8" },
        React.createElement('div', { className: "flex items-center justify-between h-16" }, [
          // Logo
          React.createElement('div', { key: 'logo', className: "flex items-center" },
            React.createElement('button', { 
              onClick: () => navigate(ROUTES.HOME),
              className: "flex items-center text-2xl font-bold text-primary focus:outline-none"
            },
              React.createElement(TrophyIcon, { className: "h-8 w-8 mr-2" }),
              '麻雀リーグ'
            ),
            activeSeason && 
            React.createElement('div', { className: "hidden md:flex ml-4 px-2 py-1 bg-primary/10 rounded-md text-sm text-primary" },
              React.createElement(CalendarDaysIcon, { className: "h-4 w-4 mr-1" }),
              activeSeason.name
            )
          ),
          // Desktop Navigation
          React.createElement('nav', { key: 'nav', className: "hidden md:flex items-center space-x-2 lg:space-x-4" },
            navItems.map(item => 
              React.createElement(NavItem, { 
                key: item.route,
                route: item.route,
                label: item.label,
                icon: item.icon,
                active: currentRoute === item.route
              })
            )
          ),
          // Theme toggle
          React.createElement('div', { key: 'theme', className: "flex items-center" },
            React.createElement('button', {
              onClick: toggleTheme,
              className: "p-2 rounded-full hover:bg-neutral/10 dark:hover:bg-neutral/20 focus:outline-none focus:ring-2 focus:ring-primary transition-colors",
              'aria-label': "Toggle theme"
            },
              theme === 'light' 
                ? React.createElement(MoonIcon, { className: "h-6 w-6 text-neutral" })
                : React.createElement(SunIcon, { className: "h-6 w-6 text-yellow-400" })
            )
          )
        ])
      ),
      // Mobile navigation
      React.createElement('div', { className: "md:hidden border-t border-neutral/20" },
        React.createElement('nav', { className: "flex justify-around p-2" },
          navItems.map(item => 
            React.createElement(NavItem, { 
              key: `${item.route}-mobile`,
              route: item.route,
              label: item.label,
              icon: item.icon,
              active: currentRoute === item.route
            })
          )
        ),
        // Mobile season indicator
        activeSeason && 
        React.createElement('div', { className: "md:hidden px-4 py-2 bg-primary/5 text-center text-sm text-primary border-t border-neutral/10" },
          React.createElement(CalendarDaysIcon, { className: "h-4 w-4 inline mr-1" }),
          '現在のシーズン: ', activeSeason.name
        )
      )
    );
  };

  // Route renderer
  const renderCurrentPage = () => {
    switch (currentRoute) {
      case ROUTES.HOME:
        return React.createElement(StandingsPage, { 
          playerStats, 
          isLoading, 
          activeSeason, 
          navigate,
          onLoadAllStandings: loadAllStandings,
          onLoadDailyStandings: loadDailyStandings,
          onLoadRangeStandings: loadRangeStandings, 
        });
      case ROUTES.PLAYERS:
        return React.createElement(PlayersPage, { 
          players, 
          addPlayer, 
          updatePlayer, 
          deletePlayer,
          games,
          isLoading: isLoadingPlayers 
        });
      case ROUTES.RECORD_GAME:
        return React.createElement(RecordGamePage, { 
          players, 
          addGame, 
          leagueSettings, 
          isLoading, 
          activeSeason 
        });
      case ROUTES.GAME_HISTORY:
        return React.createElement(GameHistoryPage, { 
          games, 
          players, 
          isLoading: isLoadingGames, 
          activeSeason,
          leagueSettings,
          navigate,
          onLoadAllGames: loadAllGames,
          onLoadDailyGames: loadDailyGames,
          onLoadRangeGames: loadRangeGames,
          onUpdateGame: updateGame,
          onDeleteGame: deleteGame,
          onRefreshGames: refreshGames
        });
      case ROUTES.SEASONS:
        return React.createElement(SeasonsPage, { 
          seasons, 
          activeSeason, 
          createSeason, 
          updateSeason, 
          activateSeason, 
          isLoading: isLoadingSeasons 
        });
      case ROUTES.SETTINGS:
        return React.createElement(SettingsPage, { 
          currentSettings: leagueSettings, 
          onSaveSettings: saveSettings, 
          isLoading: isLoadingSettings, 
          activeSeason 
        });
      case ROUTES.PLAYER_DETAIL:
        return React.createElement(PlayerDetailPage, { 
          allPlayerStats: playerStats, 
          players, 
          allGames: games, 
          isLoading, 
          navigate, 
          playerId: routeParams.playerId,
          activeSeason,
          onLoadAllStandings: loadAllStandings,
          onLoadDailyStandings: loadDailyStandings,
          onLoadRangeStandings: loadRangeStandings,
          onLoadAllGames: loadAllGames,
          onLoadDailyGames: loadDailyGames,
          onLoadRangeGames: loadRangeGames
        });
      default:
        return React.createElement(StandingsPage, { 
          playerStats, 
          isLoading, 
          activeSeason, 
          navigate,
          onLoadAllStandings: loadAllStandings,
          onLoadDailyStandings: loadDailyStandings,
          onLoadRangeStandings: loadRangeStandings
        });
    }
  };

  return React.createElement('div', { 
    className: "min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300" 
  }, [
    React.createElement(Navbar, { key: 'navbar' }),
    React.createElement('main', { key: 'main', className: "container mx-auto px-4 sm:px-6 lg:px-8 py-8" },
      !activeSeason && !isLoadingSeasons 
        ? React.createElement('div', { className: "text-center py-10" }, [
            React.createElement('h2', { key: 'title', className: "text-2xl font-semibold mb-4" }, 'シーズンが設定されていません'),
            React.createElement('p', { key: 'desc', className: "text-neutral mb-6" }, 'リーグを開始するには、まずシーズンを作成してください。'),
            React.createElement('button', { 
              key: 'link',
              onClick: () => navigate(ROUTES.SEASONS),
              className: "inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-focus transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            }, 'シーズン管理へ')
          ])
        : renderCurrentPage()
    ),
    // Footer
    React.createElement('footer', { key: 'footer', className: "bg-base-100/80 border-t border-neutral/20 py-4 mt-8" },
      React.createElement('div', { className: "container mx-auto px-4 text-center text-sm text-neutral" },
        React.createElement('p', null, 
          '🀄 麻雀リーグトラッカー  - '
        )
      )
    )
  ]);
};

export default App;