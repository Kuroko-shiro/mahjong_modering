import React, { useState, useEffect } from 'react';
import { ListBulletIcon, CalendarDaysIcon, EyeIcon, SearchIcon, PencilIcon, TrashIcon } from '../components/icons/Icons.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import ViewFilter from '../components/ui/ViewFilter.jsx';
import GameForm from '../components/game/GameForm.jsx';

const GameHistoryPage = ({ 
  games, 
  players, 
  isLoading, 
  activeSeason, 
  leagueSettings,
  onLoadAllGames,
  onLoadDailyGames,
  onLoadRangeGames,
  onUpdateGame,
  onDeleteGame,
  onRefreshGames
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [playerFilter, setPlayerFilter] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [editingGame, setEditingGame] = useState(null);
  const [deletingGame, setDeletingGame] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // フィルター状態
  const [viewMode, setViewMode] = useState('season');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredGames, setFilteredGames] = useState(games);
  const [filterLoading, setFilterLoading] = useState(false);

  // 表示モード変更時の処理
  useEffect(() => {
    const loadFilteredData = async () => {
      if (filterLoading) return;
      
      setFilterLoading(true);
      try {
        switch (viewMode) {
          case 'season':
            setFilteredGames(games);
            break;
          case 'all':
            if (onLoadAllGames) {
              const allGames = await onLoadAllGames();
              setFilteredGames(allGames);
            }
            break;
          case 'daily':
            if (onLoadDailyGames && selectedDate) {
              const dailyGames = await onLoadDailyGames(selectedDate);
              setFilteredGames(dailyGames);
            }
            break;
          case 'range':
            if (onLoadRangeGames && startDate && endDate) {
              const rangeGames = await onLoadRangeGames(startDate, endDate);
              setFilteredGames(rangeGames);
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
  }, [viewMode, selectedDate, startDate, endDate, games, onLoadAllGames, onLoadDailyGames, onLoadRangeGames]);

  // 検索フィルター適用
  const filteredAndSearchedGames = React.useMemo(() => {
    if (!filteredGames) return [];
    
    return filteredGames.filter(game => {
      const matchesSearch = !searchTerm || 
        game.roundName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.seasonName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPlayer = !playerFilter || 
        game.results.some(result => result.playerId === playerFilter);
      
      return matchesSearch && matchesPlayer;
    });
  }, [filteredGames, searchTerm, playerFilter]);

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

  // ゲーム編集ハンドラ
  const handleEditGame = async (gameResults) => {
    setIsUpdating(true);
    try {
      if (onUpdateGame && editingGame) {
        // GameFormからはgameResults（計算結果の配列）が来るので、
        // 元のゲームデータのその他フィールドとマージして送信
        const gameData = {
          gameResults: gameResults,
          gameDate: editingGame.gameDate,
          totalHandsInGame: editingGame.totalHandsInGame,
          roundName: editingGame.roundName,
        };
        await onUpdateGame(editingGame.id, gameData);
        if (onRefreshGames) {
          await onRefreshGames();
        }
        setEditingGame(null);
      }
    } catch (error) {
      console.error('Failed to update game:', error);
      // エラーハンドリング
    } finally {
      setIsUpdating(false);
    }
  };

  // ゲーム削除ハンドラ
  const handleDeleteGame = async () => {
    setIsUpdating(true);
    try {
      if (onDeleteGame && deletingGame) {
        await onDeleteGame(deletingGame.id);
        if (onRefreshGames) {
          await onRefreshGames();
        }
        setDeletingGame(null);
        setSelectedGame(null);
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      // エラーハンドリング
    } finally {
      setIsUpdating(false);
    }
  };

  const DeleteConfirmModal = ({ game, onClose, onConfirm, isLoading }) => {
    if (!game) return null;

    return React.createElement(Modal, {
      isOpen: true,
      onClose: onClose,
      title: "ゲーム削除の確認",
      size: "md"
    },
      React.createElement('div', { className: "space-y-4" },
        React.createElement('p', { className: "text-sm text-gray-600" },
          '以下のゲームを削除してもよろしいですか？この操作は取り消すことができません。'
        ),
        React.createElement('div', { className: "bg-gray-50 p-3 rounded-lg" },
          React.createElement('p', { className: "font-semibold" }, game.roundName || 'ゲーム'),
          React.createElement('p', { className: "text-sm text-gray-600" }, 
            `実施日: ${formatDate(game.gameDate)}`
          ),
          game.seasonName && React.createElement('p', { className: "text-sm text-gray-600" }, 
            `シーズン: ${game.seasonName}`
          )
        ),
        React.createElement('div', { className: "flex justify-end gap-2 pt-4" },
          React.createElement(Button, {
            variant: "secondary",
            onClick: onClose,
            disabled: isLoading
          }, 'キャンセル'),
          React.createElement(Button, {
            variant: "danger",
            onClick: onConfirm,
            disabled: isLoading,
            loading: isLoading
          }, '削除する')
        )
      )
    );
  };

  const getViewModeTitle = () => {
    switch (viewMode) {
      case 'season':
        return activeSeason ? `ゲーム履歴 - ${activeSeason.name}` : 'ゲーム履歴';
      case 'all':
        return 'ゲーム履歴 - 全シーズン';
      case 'daily':
        return `ゲーム履歴 - ${selectedDate}`;
      case 'range':
        return startDate && endDate 
          ? `ゲーム履歴 - ${startDate}〜${endDate}`
          : 'ゲーム履歴 - 期間指定';
      default:
        return 'ゲーム履歴';
    }
  };

  const GameDetailModal = ({ game, onClose, onEdit, onDelete }) => {
    if (!game) return null;

    return React.createElement(Modal, { 
      isOpen: true, 
      onClose: onClose, 
      title: game.roundName || `ゲーム詳細`,
      size: "xl"
    },
      React.createElement('div', { className: "space-y-6" },
        // 操作ボタン
        React.createElement('div', { className: "flex justify-end gap-2 pb-4 border-b" },
          React.createElement(Button, {
            variant: "secondary",
            size: "sm",
            leftIcon: React.createElement(PencilIcon, { className: "w-4 h-4" }),
            onClick: onEdit
          }, '編集'),
          React.createElement(Button, {
            variant: "danger",
            size: "sm",
            leftIcon: React.createElement(TrashIcon, { className: "w-4 h-4" }),
            onClick: onDelete
          }, '削除')
        ),
        
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
              viewMode !== 'season' && game.seasonName &&
              React.createElement('p', null, 
                React.createElement('span', { className: "font-medium" }, 'シーズン: '),
                game.seasonName
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

  if (isLoading && !filteredGames) {
    return (
      React.createElement('div', { className: "flex justify-center items-center h-64" },
        React.createElement(LoadingSpinner, { size: "lg", message: "Loading game history..." })
      )
    );
  }

  return (
    React.createElement('div', { className: "space-y-6" },
      React.createElement(Card, { className: "p-4 sm:p-6" },
        React.createElement('div', { className: "flex items-center justify-between mb-6" },
          React.createElement('div', { className: "flex items-center" },
            React.createElement(ListBulletIcon, { className: "w-8 h-8 mr-3 text-primary" }),
            React.createElement('h1', { className: "text-3xl font-bold" }, getViewModeTitle())
          )
        ),

        // 改善されたフィルター UI - これはそのまま維持
        React.createElement('div', { className: "bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 backdrop-blur-sm rounded-xl border border-primary/20 p-6 mb-6" },
          React.createElement('div', { className: "flex items-center mb-4" },
            React.createElement('span', { className: "text-2xl mr-3" }, '🔍'),
            React.createElement('h3', { className: "text-lg font-semibold text-gray-800 dark:text-gray-200" }, 'ゲーム表示設定')
          ),
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
          })
        ),

        // 検索・フィルター - 元のシンプルなデザインに戻す
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" },
          React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium mb-1" }, '検索'),
            React.createElement('div', { className: "relative" },
              React.createElement(Input, {
                type: "text",
                placeholder: "ゲーム名、IDで検索...",
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: "pl-10"
              }),
              React.createElement(SearchIcon, { className: "absolute left-3 top-2.5 h-4 w-4 text-neutral" })
            )
          ),
          React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium mb-1" }, 'プレイヤー'),
            React.createElement(Select, {
              value: playerFilter,
              onChange: (e) => setPlayerFilter(e.target.value)
            },
              React.createElement('option', { value: "" }, '全プレイヤー'),
              players.map(player => 
                React.createElement('option', { key: player.id, value: player.id }, player.name)
              )
            )
          ),
          React.createElement('div', { className: "flex items-end" },
            React.createElement(Button, {
              variant: "secondary",
              onClick: () => {
                setSearchTerm('');
                setPlayerFilter('');
              }
            }, 'クリア')
          )
        ),

        // ローディング状態
        filterLoading && 
        React.createElement(LoadingSpinner, { 
          message: "データを読み込み中...", 
          className: "my-4" 
        }),

        // データが無い場合
        !filterLoading && filteredAndSearchedGames.length === 0 && 
        React.createElement('div', { className: "text-center py-12" },
          React.createElement(ListBulletIcon, { className: "w-16 h-16 mx-auto text-neutral mb-4" }),
          React.createElement('p', { className: "text-neutral" },
            !filteredGames || filteredGames.length === 0
              ? (viewMode === 'season' && activeSeason 
                  ? `${activeSeason.name}にはまだゲームが記録されていません。`
                  : 'ゲームがまだ記録されていません。')
              : '検索条件に一致するゲームがありません。'
          )
        ),

        // ゲーム一覧 - 元のシンプルなデザイン
        !filterLoading && filteredAndSearchedGames.length > 0 &&
        React.createElement('div', { className: "space-y-4" },
            filteredAndSearchedGames.map(game =>
              React.createElement(Card, { 
                key: game.id, 
                className: "p-4 hover:shadow-lg transition-all duration-200 cursor-pointer",
                onClick: () => setSelectedGame(game)
              },
                React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start mb-3" },
                  React.createElement('div', null,
                    React.createElement('h3', { className: "text-xl font-semibold text-primary mb-1" },
                      game.roundName || `ゲーム ${formatDate(game.gameDate)}`
                    ),
                    React.createElement('div', { className: "flex flex-wrap gap-3 text-sm text-neutral" },
                      React.createElement('span', null, 
                        React.createElement(CalendarDaysIcon, { className: "w-4 h-4 inline mr-1" }),
                        formatDate(game.gameDate)
                      ),
                      viewMode !== 'season' && game.seasonName &&
                      React.createElement('span', null, `シーズン: ${game.seasonName}`),
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
                      leftIcon: React.createElement(EyeIcon, { className: "w-4 h-4" }),
                      onClick: (e) => {
                        e.stopPropagation();
                        setSelectedGame(game);
                      }
                    }, '詳細'),
                    React.createElement(Button, { 
                      size: "sm", 
                      variant: "ghost",
                      leftIcon: React.createElement(PencilIcon, { className: "w-4 h-4" }),
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
                      className: "text-red-600 hover:text-red-700 hover:bg-red-50"
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
        )
      ),
      
      selectedGame && React.createElement(GameDetailModal, { 
        game: selectedGame, 
        onClose: () => setSelectedGame(null),
        onEdit: () => {
          setEditingGame(selectedGame);
          setSelectedGame(null);
        },
        onDelete: () => {
          setDeletingGame(selectedGame);
          setSelectedGame(null);
        }
      }),

      editingGame && React.createElement(Modal, {
        isOpen: true,
        onClose: () => setEditingGame(null),
        title: "ゲーム編集",
        size: "xl"
      },
        React.createElement(GameForm, {
          players: players,
          addGame: handleEditGame,
          leagueSettings: leagueSettings,
          onClose: () => setEditingGame(null),
          initialData: editingGame,
          isEditing: true,
          isLoading: isUpdating
        })
      ),

      deletingGame && React.createElement(DeleteConfirmModal, {
        game: deletingGame,
        onClose: () => setDeletingGame(null),
        onConfirm: handleDeleteGame,
        isLoading: isUpdating
      })
    )
  );
};

export default GameHistoryPage;