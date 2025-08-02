import React from 'react';
import { XMarkIcon } from '../icons/Icons.jsx';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return React.createElement('div', {
    className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4",
    onClick: onClose,
    'aria-modal': "true",
    role: "dialog"
  },
    React.createElement('div', {
      className: `bg-base-100 rounded-lg shadow-xl p-6 w-full ${sizeClasses[size]} scale-95 opacity-0 animate-modal-appear`,
      onClick: (e) => e.stopPropagation()
    },
      React.createElement('div', { className: "flex justify-between items-center mb-4" },
        React.createElement('h2', { className: "text-xl font-semibold text-primary" }, title),
        React.createElement('button', {
          onClick: onClose,
          className: "p-1 rounded-full text-neutral hover:bg-neutral/10 focus:outline-none focus:ring-2 focus:ring-primary",
          'aria-label': "Close modal"
        },
          React.createElement(XMarkIcon, { className: "h-6 w-6" })
        )
      ),
      React.createElement('div', null, children)
    )
  );
};

export default Modal;