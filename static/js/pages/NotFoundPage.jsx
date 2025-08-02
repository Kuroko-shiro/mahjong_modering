import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';

const NotFoundPage = () => {
  return (
    React.createElement('div', { className: "flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4" },
      React.createElement('img', { 
        src: "https://picsum.photos/seed/404page/300/200", 
        alt: "Lost Mahjong Tile", 
        className: "w-64 h-auto mb-8 rounded-lg shadow-lg" 
      }),
      React.createElement('h1', { className: "text-6xl font-bold text-primary mb-4" }, '404'),
      React.createElement('h2', { className: "text-2xl font-semibold text-base-content mb-2" }, 'ページが見つかりません'),
      React.createElement('p', { className: "text-neutral mb-8 max-w-md" },
        'お探しのページは見つかりませんでした。まるで予期せぬドラのように、どこかに行ってしまったようです。'
      ),
      React.createElement(Button, { variant: "primary", size: "lg" },
        React.createElement(Link, { to: "/" }, 'ホームに戻る（順位表）')
      )
    )
  );
};

export default NotFoundPage;