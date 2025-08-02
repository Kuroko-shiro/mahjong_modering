import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { TrophyIcon, ChartBarIcon, ChevronUpIcon, ChevronDownIcon } from '../components/icons/Icons.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import ViewFilter from '../components/ui/ViewFilter.jsx';

const StandingsPage = ({ 
  playerStats, 
  isLoading, 
  activeSeason, 
  onLoadAllStandings,
  onLoadDailyStandings,
  onLoadRangeStandings
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'totalPoints', direction: 'descending' });
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);
  
  // フィルター状態
  const [viewMode, setViewMode] = useState('season');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredPlayerStats, setFilteredPlayerStats] = useState(playerStats);
  const [filterLoading, setFilterLoading] = useState(false);

  // 表示モード変更時の処理
  useEffect(() => {
    const loadFilteredData = async () => {
      if (filterLoading) return;
      
      setFilterLoading(true);
      try {
        switch (viewMode) {
          case 'season':
            setFilteredPlayerStats(playerStats);
            break;
          case 'all':
            if (onLoadAllStandings) {
              const allStats = await onLoadAllStandings();
              setFilteredPlayerStats(allStats);
            }
            break;
          case 'daily':
            if (onLoadDailyStandings && selectedDate) {
              const dailyStats = await onLoadDailyStandings(selectedDate);
              setFilteredPlayerStats(dailyStats);
            }
            break;
          case 'range':
            if (onLoadRangeStandings && startDate && endDate) {
              const rangeStats = await onLoadRangeStandings(startDate, endDate);
              setFilteredPlayerStats(rangeStats);
            }
            break;
        }
      } catch (error) {
        console.error('Failed to load filtered data:', error);
      } finally {
        setFilterLoading(false);
      }
    };

    loadFilteredData();
  }, [viewMode, selectedDate, startDate, endDate, playerStats, onLoadAllStandings, onLoadDailyStandings, onLoadRangeStandings]);

  const sortedPlayerStats = React.useMemo(() => {
    if (!filteredPlayerStats || filteredPlayerStats.length === 0) return [];
    
    return [...filteredPlayerStats].sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === 'name') {
        valA = a.player.name.toLowerCase();
        valB = b.player.name.toLowerCase();
      } else {
        valA = a[sortConfig.key];
        valB = b[sortConfig.key];
      }
      
      if (valA < valB) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (valA > valB) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      if (sortConfig.key !== 'name' && a.player.name.toLowerCase() < b.player.name.toLowerCase()) return -1;
      if (sortConfig.key !== 'name' && a.player.name.toLowerCase() > b.player.name.toLowerCase()) return 1;
      return 0;
    });
  }, [filteredPlayerStats, sortConfig]);

  const requestSort = (key) => {
    let direction = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' 
      ? React.createElement(ChevronUpIcon, { className: "w-4 h-4 inline ml-1" })
      : React.createElement(ChevronDownIcon, { className: "w-4 h-4 inline ml-1" });
  };
  
  const togglePlayerDetails = (playerId) => {
    setExpandedPlayerId(expandedPlayerId === playerId ? null : playerId);
  };

  const getViewModeTitle = () => {
    switch (viewMode) {
      case 'season':
        return activeSeason ? `リーグ順位表 - ${activeSeason.name}` : 'リーグ順位表';
      case 'all':
        return 'リーグ順位表 - 全シーズン累計';
      case 'daily':
        return `リーグ順位表 - ${selectedDate}時点`;
      case 'range':
        return startDate && endDate 
          ? `リーグ順位表 - ${startDate}〜${endDate}`
          : 'リーグ順位表 - 期間指定';
      default:
        return 'リーグ順位表';
    }
  };

  if (isLoading && !filteredPlayerStats) {
    return (
      React.createElement('div', { className: "flex justify-center items-center h-64" },
        React.createElement(LoadingSpinner, { size: "lg", message: "Loading standings..." })
      )
    );
  }

  return (
    React.createElement('div', { className: "space-y-6" },
      React.createElement(Card, { className: "p-4 sm:p-6" },
        React.createElement('div', { className: "flex items-center justify-between mb-4" },
          React.createElement('div', { className: "flex items-center" },
            React.createElement(TrophyIcon, { className: "w-8 h-8 mr-3 text-primary" }),
            React.createElement('h1', { className: "text-3xl font-bold" }, getViewModeTitle())
          )
        ),

        // フィルター UI
        React.createElement(ViewFilter, {
          viewMode: viewMode,
          onViewModeChange: setViewMode,
          selectedDate: selectedDate,
          onDateChange: setSelectedDate,
          startDate: startDate,
          onStartDateChange: setStartDate,
          endDate: endDate,
          onEndDateChange: setEndDate,
          activeSeason: activeSeason
        }),

        // ローディング状態
        filterLoading && 
        React.createElement(LoadingSpinner, { 
          message: "データを読み込み中...", 
          className: "my-4" 
        }),

        // データが無い場合
        !filterLoading && sortedPlayerStats.length === 0 && 
        React.createElement('div', { className: "text-center py-10" },
          React.createElement(TrophyIcon, { className: "w-16 h-16 mx-auto text-neutral mb-4" }),
          React.createElement('h2', { className: "text-2xl font-semibold mb-2" }, 'データがありません'),
          React.createElement('p', { className: "text-neutral" }, 
            viewMode === 'season' && activeSeason 
              ? `${activeSeason.name}にはまだゲームが記録されていません。`
              : viewMode === 'all' 
                ? 'まだゲームが記録されていません。'
                : viewMode === 'daily' 
                  ? `${selectedDate}までにゲームが記録されていません。`
                  : 'この期間にゲームが記録されていません。'
          )
        ),

        // 順位表テーブル
        !filterLoading && sortedPlayerStats.length > 0 &&
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
                const rankColors = ["text-yellow-400", "text-gray-400", "text-yellow-600"];
                
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
                        React.createElement(NavLink, { 
                          to: `/player/${stat.player.id}`,
                          className: "text-sm font-medium text-primary hover:underline"
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
                      `${(stat.winRate * 100).toFixed(1)}%`
                    ),
                    React.createElement('td', { className: "px-3 py-3 whitespace-nowrap text-sm" },
                      React.createElement(Button, { 
                        size: "sm", 
                        variant: "ghost", 
                        onClick: () => togglePlayerDetails(stat.player.id),
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
                            `直近${stat.lastTenGamesPoints.length}ゲームの傾向:`
                          ),
                          React.createElement('div', { className: "flex items-end h-16 space-x-1 bg-neutral/10 p-2 rounded" },
                            stat.lastTenGamesPoints.map((pts, i) => {
                              const allAbsPoints = stat.lastTenGamesPoints.map(p => Math.abs(p));
                              const maxAbsPt = Math.max(...allAbsPoints, 1);
                              let heightPercentage = 0;
                              if (maxAbsPt > 0) {
                                heightPercentage = (Math.abs(pts) / maxAbsPt) * 90 + 10;
                              }
                              
                              return React.createElement('div', { 
                                key: i, 
                                title: `${pts.toFixed(1)} pts`,
                                className: `w-full ${pts >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-t-sm hover:opacity-80 transition-opacity`,
                                style: { height: `${Math.max(5, heightPercentage)}%` }
                              });
                            })
                          )
                        ),
                        React.createElement(NavLink, { 
                          to: `/player/${stat.player.id}`,
                          className: "mt-3 inline-block text-sm text-primary hover:underline"
                        }, 'プレイヤー詳細を見る →')
                      )
                    )
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

export default StandingsPage;