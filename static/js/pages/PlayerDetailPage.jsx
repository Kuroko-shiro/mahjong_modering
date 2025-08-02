import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import { UsersIcon, TrophyIcon, ChartBarIcon, AcademicCapIcon, ListBulletIcon } from '../components/icons/Icons.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Button from '../components/ui/Button.jsx';
import PlayerRecentGamesList from '../components/game/PlayerRecentGamesList.jsx';

const PlayerDetailPage = ({ allPlayerStats, players, allGames, isLoading }) => {
  const { playerId } = useParams();

  const player = players.find(p => p.id === playerId);
  const stat = allPlayerStats.find(s => s.player.id === playerId);

  if (isLoading) {
    return (
      React.createElement('div', { className: "flex justify-center items-center h-64" },
        React.createElement(LoadingSpinner, { size: "lg", message: "Loading player details..." })
      )
    );
  }

  if (!player) { 
    return (
      React.createElement('div', { className: "text-center py-10" },
        React.createElement(UsersIcon, { className: "w-16 h-16 mx-auto text-neutral mb-4" }),
        React.createElement('h2', { className: "text-2xl font-semibold mb-2" }, 'プレイヤーが見つかりません'),
        React.createElement('p', { className: "text-neutral mb-6" },
          'ID ', React.createElement('span', { className: "font-mono bg-neutral/10 p-1 rounded" }, playerId),
          ' のプレイヤーは見つかりませんでした。'
        ),
        React.createElement(Button, { variant: "primary" },
          React.createElement(Link, { to: "/players" }, 'プレイヤー一覧を見る')
        )
      )
    );
  }

  if (!stat) {
    return (
      React.createElement(Card, { className: "p-6 text-center" },
        React.createElement('img', { 
          src: player.avatarUrl || `https://picsum.photos/seed/${player.name.replace(/\s+/g, '')}/128/128`,
          alt: player.name,
          className: "w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary"
        }),
        React.createElement('h1', { className: "text-3xl font-bold text-primary mb-2" }, player.name),
        React.createElement('p', { className: "text-neutral" }, 
          'このプレイヤーはまだゲームをプレイしていないか、統計データが利用できません。'
        ),
        React.createElement(Button, { variant: "secondary", className: "mt-4" },
          React.createElement(Link, { to: "/" }, '順位表に戻る')
        )
      )
    );
  }

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
          value: `${stat.rankDistribution[r] || 0} (${formatPercentage(stat[rateKeys[i]])})`,
          valueClass: rankColors[i]
        })
      )
    );
  };

  const playerGames = allGames
    .filter(game => game.results.some(r => r.playerId === playerId))
    .sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());
  
  const recentGames = playerGames.slice(0, 5);

  return (
    React.createElement('div', { className: "space-y-6" },
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
          React.createElement(StatItem, { label: "総ゲーム数", value: stat.gamesPlayed }),
          React.createElement(StatItem, { 
            label: "総得点", 
            value: formatDecimal(stat.totalPoints),
            valueClass: stat.totalPoints >= 0 ? 'text-green-500' : 'text-red-500'
          }),
          React.createElement(StatItem, { 
            label: "平均得点", 
            value: formatDecimal(stat.averagePoints),
            valueClass: stat.averagePoints >= 0 ? 'text-green-600' : 'text-red-600'
          }),
          React.createElement(StatItem, { label: "平均順位", value: formatDecimal(stat.averageRank, 2) }),
          React.createElement(StatItem, { label: "平均素点", value: stat.averageRawScore.toLocaleString() }),
          React.createElement(StatItem, { 
            label: "最高素点", 
            value: stat.bestRawScore > 0 ? stat.bestRawScore.toLocaleString() : "N/A",
            subtext: stat.bestRawScoreGameId && stat.bestRawScore > 0 ? 
              `ゲーム ${stat.bestRawScoreGameId.substring(0, 6)}...` : ""
          })
        ),
        
        React.createElement('h3', { className: "text-xl font-semibold mb-3 mt-4" }, '順位分布・順位率'),
        renderRankDistribution(),
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-3 mt-4" },
          React.createElement(StatItem, { label: "連対率 (1・2位率)", value: formatPercentage(stat.rentaiRate) }),
          React.createElement(StatItem, { label: "ラス回避率 (4位以外率)", value: formatPercentage(stat.rasuKaihiRate) })
        )
      ),

      stat.totalHandsPlayedIn > 0 &&
      React.createElement(Card, { className: "p-4 sm:p-6" },
        React.createElement('h2', { className: "text-2xl font-semibold mb-4 flex items-center" },
          React.createElement(AcademicCapIcon, { className: "w-6 h-6 mr-2 text-primary" }),
          'プレイスタイル指標 (手数あたり)'
        ),
        React.createElement('p', { className: "text-sm text-neutral mb-4" },
          `詳細データが記録された${stat.totalHandsPlayedIn}手のゲームに基づく統計です。`
        ),
        React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
          React.createElement(StatItem, { label: "和了率", value: formatPercentage(stat.agariRatePerHand) }),
          React.createElement(StatItem, { label: "リーチ率", value: formatPercentage(stat.riichiRatePerHand) }),
          React.createElement(StatItem, { 
            label: "放銃率", 
            value: formatPercentage(stat.houjuuRatePerHand),
            valueClass: "text-red-500"
          }),
          React.createElement(StatItem, { label: "副露率", value: formatPercentage(stat.furoRatePerHand) })
        ),
        React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mt-4" },
          React.createElement(StatItem, { label: "総和了数", value: stat.totalAgariCount }),
          React.createElement(StatItem, { label: "総リーチ数", value: stat.totalRiichiCount }),
          React.createElement(StatItem, { 
            label: "総放銃数", 
            value: stat.totalHoujuuCount,
            valueClass: "text-red-500"
          }),
          React.createElement(StatItem, { label: "総副露数", value: stat.totalFuroCount })
        )
      ),

      recentGames.length > 0 &&
      React.createElement(Card, { className: "p-4 sm:p-6" },
        React.createElement('h2', { className: "text-2xl font-semibold mb-4 flex items-center" },
          React.createElement(ListBulletIcon, { className: "w-6 h-6 mr-2 text-primary" }),
          `最近のゲーム (${recentGames.length})`
        ),
        React.createElement(PlayerRecentGamesList, { 
          games: recentGames, 
          playerId: playerId, 
          players: players 
        })
      ),
      
      stat.lastTenGamesPoints.length > 0 &&
      React.createElement(Card, { className: "p-4 sm:p-6" },
        React.createElement('h2', { className: "text-2xl font-semibold mb-4 flex items-center" },
          React.createElement(ChartBarIcon, { className: "w-6 h-6 mr-2 text-primary" }),
          `直近${stat.lastTenGamesPoints.length}ゲームの傾向 (得点)`
        ),
        React.createElement('div', { className: "flex items-end h-40 space-x-1 bg-neutral/10 p-4 rounded-lg" },
          stat.lastTenGamesPoints.map((pts, i) => {
            const allAbsPoints = stat.lastTenGamesPoints.map(p => Math.abs(p));
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
      ),
      
      React.createElement('div', { className: "mt-8 text-center" },
        React.createElement(Button, { variant: "secondary" },
          React.createElement(Link, { to: "/" }, '順位表に戻る')
        )
      )
    )
  );
};

export default PlayerDetailPage;