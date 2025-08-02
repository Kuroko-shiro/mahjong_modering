import React, { useState, useEffect } from 'react';
import { DEFAULT_LEAGUE_SETTINGS } from '../constants.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { CogIcon, ArrowPathIcon } from '../components/icons/Icons.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';

const SettingsPage = ({ currentSettings, onSaveSettings, isLoading, activeSeason }) => {
  const [settings, setSettings] = useState(currentSettings);
  const [umaSum, setUmaSum] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isSubmitting) {
      setSettings(currentSettings);
    }
  }, [currentSettings, isSubmitting]);

  useEffect(() => {
    const sum = Object.values(settings.umaPoints || {}).reduce((acc, val) => acc + Number(val || 0), 0);
    setUmaSum(sum);
  }, [settings.umaPoints]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: Number(value) }));
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
    if (showConfirmation) setShowConfirmation(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaveSettings(settings);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_LEAGUE_SETTINGS);
    if (showConfirmation) setShowConfirmation(false);
  };
  
  const umaRanks = [1, 2, 3, 4];

  if (isLoading) {
    return (
      React.createElement('div', { className: "flex justify-center items-center h-64" },
        React.createElement(LoadingSpinner, { size: "lg", message: "Loading settings..." })
      )
    );
  }

  return (
    React.createElement('div', { className: "space-y-6" },
      React.createElement(Card, { className: "p-4 sm:p-6" },
        React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6" },
          React.createElement('div', { className: "flex items-center mb-4 sm:mb-0" },
            React.createElement(CogIcon, { className: "w-8 h-8 mr-3 text-primary" }),
            React.createElement('h1', { className: "text-3xl font-bold" }, 'リーグ得点設定'),
            activeSeason && 
            React.createElement('span', { className: "ml-3 text-lg text-neutral" }, `- ${activeSeason.name}`)
          ),
          React.createElement(Button, { 
            onClick: handleResetToDefaults, 
            variant: "secondary", 
            size: "sm", 
            leftIcon: React.createElement(ArrowPathIcon, { className: "w-4 h-4" }),
            disabled: isSubmitting
          }, 'デフォルトに戻す')
        ),
        
        React.createElement('form', { onSubmit: handleSubmit, className: "space-y-8" },
          React.createElement('section', null,
            React.createElement('h2', { className: "text-xl font-semibold text-primary mb-3" }, '得点計算基準'),
            React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
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
                  disabled: isSubmitting
                }),
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
                  disabled: isSubmitting
                }),
                React.createElement('p', { className: "text-xs text-neutral mt-1" },
                  '得点計算式: (素点 - この値) / 1000 + 順位点'
                )
              )
            )
          ),

          React.createElement('section', null,
            React.createElement('h2', { className: "text-xl font-semibold text-primary mb-3" }, '順位点（UMA）'),
            React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
              umaRanks.map(rank =>
                React.createElement('div', { key: `uma-${rank}` },
                  React.createElement('label', { 
                    htmlFor: `umaPoints-${rank}`, 
                    className: "block text-sm font-medium text-base-content mb-1" 
                  }, `${rank}位の順位点`),
                  React.createElement(Input, {
                    type: "number",
                    name: `umaPoints-${rank}`,
                    id: `umaPoints-${rank}`,
                    value: settings.umaPoints?.[rank] || '',
                    onChange: (e) => handleUmaChange(e, rank),
                    placeholder: "例: 20",
                    step: "5",
                    disabled: isSubmitting
                  })
                )
              )
            ),
            React.createElement('p', { 
              className: `text-sm mt-2 ${umaSum !== 0 ? 'text-red-500 font-semibold' : 'text-green-500'}`
            },
              `順位点の合計: ${umaSum}（オカが開始/基準チップの差分で処理される場合、0が推奨されます）`
            )
          ),
          
          React.createElement('div', { className: "flex items-center justify-end space-x-3 pt-4 border-t border-neutral/10" },
            showConfirmation && 
            React.createElement('p', { className: "text-sm text-green-600 mr-auto" }, '設定が保存されました！'),
            isSubmitting && React.createElement(LoadingSpinner, { size: "sm", message: "Saving..." }),
            React.createElement(Button, { type: "submit", variant: "primary", disabled: isSubmitting },
              isSubmitting ? '保存中...' : '設定を保存'
            )
          )
        )
      ),
      React.createElement(Card, { className: "p-4 bg-primary/10" },
        React.createElement('h3', { className: "text-lg font-semibold text-primary mb-2" }, 'これらの設定の使用方法:'),
        React.createElement('ul', { className: "list-disc list-inside text-sm space-y-1 text-base-content" },
          React.createElement('li', null,
            React.createElement('strong', null, 'ゲーム開始チップ数:'), 
            ' 「ゲーム記録」フォームで入力される素点の合計が この値×4 と一致することを確認します。'
          ),
          React.createElement('li', null,
            React.createElement('strong', null, '計算基準チップ数:'), 
            ' プレイヤーの素点からこの値を差し引いて1000で割ります。例: 基準が25000の場合、素点35000は (35000-25000)/1000 = +10点になります。'
          ),
          React.createElement('li', null,
            React.createElement('strong', null, '順位点:'), 
            ' 上記で計算した得点に、順位に応じてこの点数が加算されます。'
          ),
          React.createElement('li', null,
            'プレイヤーの最終得点は: ',
            React.createElement('code', { className: "text-xs bg-neutral/20 p-1 rounded" },
              '(素点 - 計算基準チップ数) / 1000 + 順位点'
            )
          ),
          React.createElement('li', null,
            'これらの設定は ',
            React.createElement('strong', null, '新しく記録されるゲームにのみ'),
            ' 適用されます。既存のゲーム記録は変更されません。'
          )
        )
      )
    )
  );
};

export default SettingsPage;