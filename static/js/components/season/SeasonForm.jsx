import React, { useState, useEffect } from 'react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { CalendarDaysIcon } from '../icons/Icons.jsx';

const SeasonForm = ({ onSave, initialData, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    description: '',
    is_active: false
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        description: initialData.description || '',
        is_active: initialData.is_active || false
      });
    } else {
      // 新規作成時のデフォルト値
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
    
    // エラーをクリア
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

  const getDateInputProps = (minDate) => {
    const today = new Date().toISOString().split('T')[0];
    return {
      min: minDate || today,
      max: '2030-12-31'
    };
  };

  return (
    React.createElement('form', { onSubmit: handleSubmit, className: "space-y-6" },
      React.createElement('div', null,
        React.createElement('label', { 
          htmlFor: "seasonName", 
          className: "block text-sm font-medium text-base-content mb-1" 
        },
          React.createElement(CalendarDaysIcon, { className: "w-4 h-4 inline mr-1" }),
          'シーズン名 *'
        ),
        React.createElement(Input, {
          type: "text",
          id: "seasonName",
          name: "name",
          value: formData.name,
          onChange: handleInputChange,
          placeholder: "例: Season 1, 2025年春季リーグ",
          required: true,
          'aria-describedby': errors.name ? "name-error" : undefined
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
            ...getDateInputProps(),
            'aria-describedby': errors.start_date ? "start-date-error" : undefined
          }),
          errors.start_date && React.createElement('p', { 
            id: "start-date-error", 
            className: "mt-1 text-sm text-red-500" 
          }, errors.start_date)
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
            ...getDateInputProps(formData.start_date),
            'aria-describedby': errors.end_date ? "end-date-error" : undefined
          }),
          errors.end_date && React.createElement('p', { 
            id: "end-date-error", 
            className: "mt-1 text-sm text-red-500" 
          }, errors.end_date)
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

      React.createElement('div', { className: "flex items-center" },
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
          className: "ml-2 block text-sm text-base-content" 
        }, 'このシーズンをアクティブにする'),
        React.createElement('p', { className: "ml-2 text-xs text-neutral" },
          '（他のアクティブシーズンは自動的に非アクティブになります）'
        )
      ),

      React.createElement('div', { className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4" },
        React.createElement('h4', { className: "text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2" }, 
          '💡 シーズンについて'
        ),
        React.createElement('ul', { className: "text-xs text-blue-700 dark:text-blue-300 space-y-1" },
          React.createElement('li', null, '• シーズンごとに独立したランキングと統計が管理されます'),
          React.createElement('li', null, '• アクティブなシーズンは常に1つのみです'),
          React.createElement('li', null, '• 終了日は設定しなくても構いません（無期限シーズン）'),
          React.createElement('li', null, '• シーズン作成後に各種設定（UMA等）を調整可能です')
        )
      ),

      React.createElement('div', { className: "flex justify-end space-x-3 pt-4 border-t border-neutral/10" },
        React.createElement(Button, { 
          type: "button", 
          onClick: onClose, 
          variant: "secondary" 
        }, 'キャンセル'),
        React.createElement(Button, { 
          type: "submit", 
          variant: "primary" 
        }, initialData ? 'シーズンを更新' : 'シーズンを作成')
      )
    )
  );
};

export default SeasonForm;