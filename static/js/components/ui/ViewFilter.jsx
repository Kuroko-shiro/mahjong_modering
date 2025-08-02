// static/js/components/ui/ViewFilter.jsx
import React from 'react';
import { CalendarDaysIcon, TrophyIcon, ChartBarIcon } from '../icons/Icons.jsx';
import Select from './Select.jsx';
import Input from './Input.jsx';
import Button from './Button.jsx';

const ViewFilter = ({ 
  viewMode, 
  onViewModeChange, 
  selectedDate, 
  onDateChange, 
  startDate, 
  onStartDateChange, 
  endDate, 
  onEndDateChange, 
  activeSeason 
}) => {
  const viewModes = [
    { value: 'season', label: 'アクティブシーズン', icon: '🏆', color: 'from-yellow-50 to-orange-50 border-yellow-200 text-yellow-700' },
    { value: 'all', label: '全シーズン累計', icon: '📊', color: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-700' },
    { value: 'daily', label: '日別累計', icon: '📅', color: 'from-green-50 to-emerald-50 border-green-200 text-green-700' },
    { value: 'range', label: '期間指定', icon: '📆', color: 'from-purple-50 to-pink-50 border-purple-200 text-purple-700' }
  ];

  const resetFilters = () => {
    onViewModeChange('season');
    onDateChange(new Date().toISOString().split('T')[0]);
    onStartDateChange('');
    onEndDateChange('');
  };

  return (
    React.createElement('div', { className: "grid grid-cols-1 lg:grid-cols-4 gap-6 items-end" },
      // 表示モード選択 - カード形式
      React.createElement('div', { className: "lg:col-span-2" },
        React.createElement('label', { className: "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3" },
          React.createElement('span', { className: "text-lg mr-2" }, '🎯'),
          '表示モード'
        ),
        React.createElement('div', { className: "grid grid-cols-2 gap-3" },
          viewModes.map(mode => 
            React.createElement('button', {
              key: mode.value,
              onClick: () => onViewModeChange(mode.value),
              disabled: mode.value === 'season' && !activeSeason,
              className: `p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                viewMode === mode.value 
                  ? `bg-gradient-to-r ${mode.color} border-opacity-100 shadow-lg transform scale-105`
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-primary/30'
              } ${mode.value === 'season' && !activeSeason ? 'opacity-50 cursor-not-allowed' : ''}`
            },
              React.createElement('div', { className: "flex flex-col items-center" },
                React.createElement('span', { className: "text-2xl mb-2" }, mode.icon),
                React.createElement('span', { 
                  className: `text-sm font-medium ${
                    viewMode === mode.value 
                      ? mode.color.split(' ')[2] 
                      : 'text-gray-600 dark:text-gray-400'
                  }`
                }, mode.label),
                mode.value === 'season' && activeSeason &&
                React.createElement('span', { className: "text-xs text-gray-500 mt-1" }, activeSeason.name)
              )
            )
          )
        )
      ),

      // 日別表示用の日付選択
      viewMode === 'daily' && 
      React.createElement('div', null,
        React.createElement('label', { className: "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" },
          React.createElement('span', { className: "text-lg mr-2" }, '📅'),
          '指定日'
        ),
        React.createElement(Input, {
          type: "date",
          value: selectedDate,
          onChange: (e) => onDateChange(e.target.value),
          className: "w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary rounded-lg"
        })
      ),

      // 期間指定用の日付選択
      viewMode === 'range' && 
      React.createElement('div', { className: "grid grid-cols-2 gap-3" },
        React.createElement('div', null,
          React.createElement('label', { className: "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" },
            React.createElement('span', { className: "text-lg mr-2" }, '📅'),
            '開始日'
          ),
          React.createElement(Input, {
            type: "date",
            value: startDate,
            onChange: (e) => onStartDateChange(e.target.value),
            className: "w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary rounded-lg"
          })
        ),
        React.createElement('div', null,
          React.createElement('label', { className: "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" },
            React.createElement('span', { className: "text-lg mr-2" }, '📅'),
            '終了日'
          ),
          React.createElement(Input, {
            type: "date",
            value: endDate,
            onChange: (e) => onEndDateChange(e.target.value),
            className: "w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary rounded-lg"
          })
        )
      ),

      // リセットボタン
      React.createElement('div', null,
        React.createElement(Button, {
          variant: "secondary",
          onClick: resetFilters,
          className: "w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors rounded-lg font-medium"
        }, 
          React.createElement('span', { className: "text-lg mr-2" }, '🔄'),
          'リセット'
        )
      )
    )
  );
};

export default ViewFilter;
