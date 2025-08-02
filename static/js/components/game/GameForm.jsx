import React, { useState, useCallback, useEffect } from 'react';
import { calculateMLeaguePoints } from '../../utils/statsCalculator.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Card from '../ui/Card.jsx';
import { CalendarDaysIcon } from '../icons/Icons.jsx';

const GameForm = ({ players, addGame, leagueSettings, onClose, initialData, isEditing, isLoading }) => {
  const [playerInputs, setPlayerInputs] = useState(() => {
    if (initialData && isEditing) {
      // 編集モードの場合、initialDataから値を設定
      return initialData.results.sort((a, b) => a.rank - b.rank).map(result => ({
        playerId: result.playerId,
        rawScore: result.rawScore.toString(),
        agariCount: (result.agariCount || 0).toString(),
        riichiCount: (result.riichiCount || 0).toString(),
        houjuuCount: (result.houjuuCount || 0).toString(),
        furoCount: (result.furoCount || 0).toString()
      }));
    }
    
    return Array(4).fill(null).map(() => ({
      playerId: '',
      rawScore: '',
      agariCount: '0',
      riichiCount: '0',
      houjuuCount: '0',
      furoCount: '0'
    }));
  });
  
  const [roundName, setRoundName] = useState(
    initialData && isEditing ? (initialData.roundName || '') : ''
  );
  const [gameDate, setGameDate] = useState(
    initialData && isEditing 
      ? initialData.gameDate 
      : new Date().toISOString().split('T')[0]
  );
  const [totalHandsInGame, setTotalHandsInGame] = useState(
    initialData && isEditing ? (initialData.totalHandsInGame || '').toString() : ''
  );
  const [error, setError] = useState(null);
  const [calculatedResults, setCalculatedResults] = useState(null);

  const totalRawScore = playerInputs.reduce((sum, ps) => sum + (parseInt(ps.rawScore, 10) || 0), 0);
  const expectedTotalScore = leagueSettings.gameStartChipCount * 4;

  const handlePlayerInputChange = (index, field, value) => {
    const newPlayerInputs = [...playerInputs];
    newPlayerInputs[index] = { ...newPlayerInputs[index], [field]: value };
    setPlayerInputs(newPlayerInputs);
    setError(null);
    setCalculatedResults(null);
  };
  
  const validateAndCalculate = useCallback(() => {
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
    if (validateAndCalculate() && calculatedResults) {
      const numTotalHands = totalHandsInGame ? parseInt(totalHandsInGame, 10) : undefined;
      if (totalHandsInGame && (isNaN(numTotalHands) || numTotalHands <= 0)) {
        setError('総局数は正の数値で入力してください。');
        return;
      }
      
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
      }
    }
  };
  
  useEffect(() => {
    const allPlayersSelected = playerInputs.every(ps => ps.playerId !== '');
    const allScoresEntered = playerInputs.every(ps => ps.rawScore !== '' && !isNaN(parseInt(ps.rawScore)));
    if (allPlayersSelected && allScoresEntered) {
      validateAndCalculate();
    } else {
      setCalculatedResults(null);
    }
  }, [playerInputs, gameDate, leagueSettings, validateAndCalculate]);

  if (players.length < 4) {
    return (
      React.createElement('p', { className: "text-center text-red-500 p-4" },
        'ゲームを記録するには、最低4人のプレイヤーが登録されている必要があります。'
      )
    );
  }

  const statInputFields = [
    { key: 'agariCount', label: '和了数', placeholder: '0' },
    { key: 'riichiCount', label: 'リーチ数', placeholder: '0' },
    { key: 'houjuuCount', label: '放銃数', placeholder: '0' },
    { key: 'furoCount', label: '副露数', placeholder: '0' },
  ];

  return (
    React.createElement('form', { onSubmit: handleSubmit, className: "space-y-6" },
      React.createElement(Card, { className: "p-4 space-y-3" },
        React.createElement('h3', { className: "text-lg font-semibold text-primary mb-2" }, 'ゲーム詳細'),
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
          React.createElement('div', null,
            React.createElement('label', { 
              htmlFor: "gameDate", 
              className: "block text-sm font-medium text-base-content mb-1" 
            },
              React.createElement(CalendarDaysIcon, { className: "w-4 h-4 inline mr-1" }),
              'ゲーム日付'
            ),
            React.createElement(Input, {
              type: "date",
              id: "gameDate",
              value: gameDate,
              onChange: (e) => setGameDate(e.target.value),
              required: true
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { 
              htmlFor: "totalHandsInGame", 
              className: "block text-sm font-medium text-base-content mb-1" 
            }, '総局数 (任意)'),
            React.createElement(Input, {
              type: "number",
              id: "totalHandsInGame",
              value: totalHandsInGame,
              onChange: (e) => setTotalHandsInGame(e.target.value),
              placeholder: "例: 8",
              min: "1"
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { 
              htmlFor: "roundName", 
              className: "block text-sm font-medium text-base-content mb-1" 
            }, 'ラウンド名 (任意)'),
            React.createElement(Input, {
              type: "text",
              id: "roundName",
              value: roundName,
              onChange: (e) => setRoundName(e.target.value),
              placeholder: "例: 第1回戦、ゲーム3"
            })
          )
        )
      ),

      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
        playerInputs.map((ps, index) =>
          React.createElement(Card, { key: index, className: "p-4 space-y-3" },
            React.createElement('h3', { className: "font-semibold text-primary" }, `プレイヤー ${index + 1}`),
            React.createElement('div', null,
              React.createElement('label', { 
                htmlFor: `player-${index}`, 
                className: "block text-xs font-medium text-base-content mb-1" 
              }, 'プレイヤー選択'),
              React.createElement(Select, {
                id: `player-${index}`,
                value: ps.playerId,
                onChange: (e) => handlePlayerInputChange(index, 'playerId', e.target.value),
                required: true,
                className: "w-full"
              },
                React.createElement('option', { value: "" }, '-- プレイヤーを選択 --'),
                players.map(p => {
                  const isAlreadySelected = playerInputs.some((psp, pIndex) => 
                    pIndex !== index && psp.playerId === p.id
                  );
                  return React.createElement('option', { 
                    key: p.id, 
                    value: p.id, 
                    disabled: isAlreadySelected
                  }, `${p.name}${isAlreadySelected ? ' (選択済み)' : ''}`);
                })
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { 
                htmlFor: `score-${index}`, 
                className: "block text-xs font-medium text-base-content mb-1" 
              }, `素点 (例: ${leagueSettings.gameStartChipCount})`),
              React.createElement(Input, {
                type: "number",
                id: `score-${index}`,
                value: ps.rawScore,
                onChange: (e) => handlePlayerInputChange(index, 'rawScore', e.target.value),
                placeholder: `例: ${leagueSettings.gameStartChipCount}`,
                step: "100",
                required: true,
                className: "w-full"
              })
            ),
            React.createElement('div', { className: "mt-2 pt-2 border-t border-neutral/10 space-y-2" },
              React.createElement('h4', { className: "text-xs font-medium text-neutral" }, '詳細統計 (任意):'),
              React.createElement('div', { className: "grid grid-cols-2 gap-x-3 gap-y-2" },
                statInputFields.map(field =>
                  React.createElement('div', { key: field.key },
                    React.createElement('label', { 
                      htmlFor: `${field.key}-${index}`, 
                      className: "block text-xs font-medium text-base-content mb-0.5" 
                    }, field.label),
                    React.createElement(Input, {
                      type: "number",
                      id: `${field.key}-${index}`,
                      value: ps[field.key],
                      onChange: (e) => handlePlayerInputChange(index, field.key, e.target.value),
                      placeholder: field.placeholder,
                      min: "0",
                      className: "w-full text-sm p-1.5"
                    })
                  )
                )
              )
            )
          )
        )
      ),
      
      React.createElement('div', { className: "p-3 bg-neutral/5 rounded-md text-sm" },
        '素点合計: ',
        React.createElement('span', { 
          className: `font-semibold ${totalRawScore === expectedTotalScore ? 'text-green-500' : 'text-red-500'}`
        }, totalRawScore),
        ` / ${expectedTotalScore}`
      ),

      error && React.createElement('p', { className: "text-red-500 text-sm" }, error),

      calculatedResults &&
      React.createElement('div', { className: "mt-4 space-y-2" },
        React.createElement('h4', { className: "font-semibold text-lg" }, '計算得点プレビュー:'),
        React.createElement('ul', { className: "list-disc list-inside bg-base-100 p-3 rounded-md shadow" },
          calculatedResults.map(res => {
            const player = players.find(p => p.id === res.playerId);
            return React.createElement('li', { key: res.playerId, className: "text-sm" },
              `${player?.name}: ${res.rawScore} (${res.rank}位) → `,
              React.createElement('span', { className: "font-bold" }, `${res.calculatedPoints.toFixed(1)} pt`),
              React.createElement('span', { className: "text-xs text-neutral ml-2" },
                `(和:${res.agariCount || 0}, リ:${res.riichiCount || 0}, 放:${res.houjuuCount || 0}, 副:${res.furoCount || 0})`
              )
            );
          })
        )
      ),

      React.createElement('div', { className: "flex justify-end space-x-3 pt-4" },
        onClose && React.createElement(Button, { type: "button", onClick: onClose, variant: "secondary" }, 'キャンセル'),
        React.createElement(Button, { 
          type: "submit", 
          variant: "primary", 
          disabled: !calculatedResults || totalRawScore !== expectedTotalScore || !gameDate || isLoading,
          loading: isLoading
        }, isEditing ? 'ゲーム更新' : 'ゲーム記録')
      )
    )
  );
};

export default GameForm;