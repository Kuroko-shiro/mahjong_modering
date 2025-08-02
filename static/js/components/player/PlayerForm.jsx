import React, { useState, useEffect } from 'react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

const PlayerForm = ({ onSave, initialData, onClose }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
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

  return (
    React.createElement('form', { onSubmit: handleSubmit, className: "space-y-4 p-1" },
      React.createElement('div', null,
        React.createElement('label', { 
          htmlFor: "playerName", 
          className: "block text-sm font-medium text-base-content mb-1" 
        }, 'プレイヤー名'),
        React.createElement(Input, {
          type: "text",
          id: "playerName",
          value: name,
          onChange: (e) => {
            setName(e.target.value);
            if (error) setError('');
          },
          placeholder: "プレイヤー名を入力",
          'aria-describedby': "name-error",
          autoFocus: true
        }),
        error && React.createElement('p', { 
          id: "name-error", 
          className: "mt-1 text-sm text-red-500" 
        }, error)
      ),
      React.createElement('div', { className: "flex justify-end space-x-2" },
        React.createElement(Button, { type: "button", onClick: onClose, variant: "secondary" }, 'キャンセル'),
        React.createElement(Button, { type: "submit", variant: "primary" },
          initialData?.id ? 'プレイヤー更新' : 'プレイヤー追加'
        )
      )
    )
  );
};

export default PlayerForm;