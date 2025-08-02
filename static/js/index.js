import React from 'react';
import ReactDOM from 'react-dom/client';
// import { HashRouter } from 'react-router-dom'; // Temporarily commented out

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement(ErrorScreen, {
        error: this.state.error,
        onRetry: () => window.location.reload()
      });
    }

    return this.props.children;
  }
}

// Simple Loading Component
const LoadingScreen = () => {
  return React.createElement('div', {
    className: 'flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800'
  }, 
    React.createElement('div', {
      className: 'text-center animate-fade-in'
    }, [
      React.createElement('div', {
        key: 'logo',
        className: 'text-6xl mb-6 animate-pulse'
      }, '🀄'),
      React.createElement('div', {
        key: 'spinner',
        className: 'animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-6'
      }),
      React.createElement('h1', {
        key: 'title',
        className: 'text-3xl font-bold text-emerald-800 dark:text-emerald-200 mb-2'
      }, '麻雀リーグトラッカー'),
      React.createElement('p', {
        key: 'loading',
        className: 'text-emerald-600 dark:text-emerald-400 animate-pulse'
      }, 'アプリケーションを読み込んでいます...')
    ])
  );
};

// Error Component
const ErrorScreen = ({ error, onRetry }) => {
  const errorDetails = error?.message || '不明なエラーが発生しました';
  
  return React.createElement('div', {
    className: 'flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800'
  },
    React.createElement('div', {
      className: 'text-center max-w-md mx-auto p-6 animate-fade-in'
    }, [
      React.createElement('div', {
        key: 'icon',
        className: 'text-6xl mb-4 animate-pulse'
      }, '🀄'),
      React.createElement('h1', {
        key: 'title',
        className: 'text-3xl font-bold text-red-800 dark:text-red-200 mb-4'
      }, 'アプリケーションエラー'),
      React.createElement('p', {
        key: 'message',
        className: 'text-red-600 dark:text-red-300 mb-4'
      }, 'アプリケーションの読み込みに失敗しました。'),
      React.createElement('details', {
        key: 'details',
        className: 'mb-6 text-left'
      }, [
        React.createElement('summary', {
          key: 'summary',
          className: 'text-sm text-red-500 dark:text-red-400 cursor-pointer hover:text-red-700 dark:hover:text-red-200'
        }, 'エラー詳細を表示'),
        React.createElement('pre', {
          key: 'error-text',
          className: 'mt-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/50 p-2 rounded border overflow-auto max-h-32'
        }, errorDetails)
      ]),
      React.createElement('div', {
        key: 'actions',
        className: 'space-y-2'
      }, [
        React.createElement('button', {
          key: 'retry',
          className: 'w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
          onClick: onRetry
        }, 'アプリケーションをリロード'),
        React.createElement('button', {
          key: 'home',
          className: 'w-full px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500',
          onClick: () => window.location.href = '/'
        }, 'ホームページに戻る')
      ])
    ])
  );
};

// Enhanced Simple App Component
const SimpleApp = () => {
  const [currentPage, setCurrentPage] = React.useState('home');
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const navigate = (page) => {
    setCurrentPage(page);
  };

  const NavButton = ({ page, label, icon, active }) => {
    return React.createElement('button', {
      className: `flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active 
          ? 'bg-emerald-600 text-white' 
          : 'text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-800'
      }`,
      onClick: () => navigate(page)
    }, [
      icon && React.createElement('span', { key: 'icon', className: 'mr-2' }, icon),
      label
    ]);
  };

  const HomePage = () => {
    return React.createElement('div', {
      className: 'text-center animate-fade-in'
    }, [
      React.createElement('h1', {
        key: 'title',
        className: 'text-4xl font-bold text-emerald-800 dark:text-emerald-200 mb-4'
      }, '🀄 麻雀リーグトラッカー'),
      React.createElement('p', {
        key: 'description',
        className: 'text-lg text-gray-600 dark:text-gray-300 mb-8'
      }, 'シーズン制対応の麻雀リーグ管理システム'),
      React.createElement('div', {
        key: 'features',
        className: 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'
      }, [
        React.createElement('div', {
          key: 'feature1',
          className: 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md'
        }, [
          React.createElement('h3', {
            key: 'title1',
            className: 'text-xl font-semibold text-emerald-700 dark:text-emerald-300 mb-2'
          }, '⚡ 高速な記録管理'),
          React.createElement('p', {
            key: 'desc1',
            className: 'text-gray-600 dark:text-gray-400'
          }, 'ゲーム結果の入力から統計の自動計算まで、素早く正確に処理します。')
        ]),
        React.createElement('div', {
          key: 'feature2',
          className: 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md'
        }, [
          React.createElement('h3', {
            key: 'title2',
            className: 'text-xl font-semibold text-emerald-700 dark:text-emerald-300 mb-2'
          }, '📊 詳細な統計'),
          React.createElement('p', {
            key: 'desc2',
            className: 'text-gray-600 dark:text-gray-400'
          }, '順位率、平均得点、最近の成績推移など、豊富な統計データを提供します。')
        ]),
        React.createElement('div', {
          key: 'feature3',
          className: 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md'
        }, [
          React.createElement('h3', {
            key: 'title3',
            className: 'text-xl font-semibold text-emerald-700 dark:text-emerald-300 mb-2'
          }, '🏆 シーズン管理'),
          React.createElement('p', {
            key: 'desc3',
            className: 'text-gray-600 dark:text-gray-400'
          }, '複数のシーズンを作成・管理し、各シーズンごとの成績を追跡できます。')
        ]),
        React.createElement('div', {
          key: 'feature4',
          className: 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md'
        }, [
          React.createElement('h3', {
            key: 'title4',
            className: 'text-xl font-semibold text-emerald-700 dark:text-emerald-300 mb-2'
          }, '🌙 ダークモード対応'),
          React.createElement('p', {
            key: 'desc4',
            className: 'text-gray-600 dark:text-gray-400'
          }, 'ライト・ダークモードの切り替えで快適な操作環境を提供します。')
        ])
      ]),
      React.createElement('div', {
        key: 'status',
        className: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-md mx-auto'
      }, [
        React.createElement('h3', {
          key: 'status-title',
          className: 'font-semibold text-yellow-800 dark:text-yellow-200 mb-2'
        }, 'システム状態'),
        React.createElement('p', {
          key: 'status-message',
          className: 'text-yellow-700 dark:text-yellow-300 text-sm'
        }, '簡易モードで動作中です。すべての機能を利用するには、サーバーが正常に動作している必要があります。'),
        !isOnline && React.createElement('p', {
          key: 'offline-notice',
          className: 'text-red-600 dark:text-red-400 text-sm mt-2 font-medium'
        }, '⚠️ オフライン状態です。インターネット接続を確認してください。')
      ])
    ]);
  };

  const createPlaceholderPage = (title, description) => () => {
    return React.createElement('div', {
      className: 'animate-fade-in'
    }, [
      React.createElement('h2', {
        key: 'title',
        className: 'text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4'
      }, title),
      React.createElement('p', {
        key: 'message',
        className: 'text-gray-600 dark:text-gray-400 mb-6'
      }, description),
      React.createElement('div', {
        key: 'notice',
        className: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'
      }, [
        React.createElement('h3', {
          key: 'notice-title',
          className: 'font-semibold text-blue-800 dark:text-blue-200 mb-2'
        }, '💡 フルバージョンで利用可能'),
        React.createElement('p', {
          key: 'notice-text',
          className: 'text-blue-700 dark:text-blue-300 text-sm'
        }, 'この機能を使用するには、Flaskサーバーが動作している完全版のアプリケーションが必要です。')
      ])
    ]);
  };

  const pages = {
    home: HomePage,
    players: createPlaceholderPage('プレイヤー管理', 'プレイヤーの追加、編集、統計表示を行います。'),
    games: createPlaceholderPage('ゲーム記録', '麻雀ゲームの結果を記録し、自動的に得点を計算します。'),
    history: createPlaceholderPage('ゲーム履歴', '過去のゲーム結果を検索・閲覧できます。'),
    seasons: createPlaceholderPage('シーズン管理', '複数のシーズンを作成・管理し、シーズンごとの成績を追跡します。'),
    settings: createPlaceholderPage('設定', 'UMA設定、得点計算方式などを調整できます。')
  };

  const CurrentPage = pages[currentPage] || pages.home;

  return React.createElement('div', {
    className: 'min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 transition-colors'
  }, [
    // Header
    React.createElement('header', {
      key: 'header',
      className: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-md sticky top-0 z-50'
    },
      React.createElement('div', {
        className: 'container mx-auto px-4 py-4'
      }, [
        React.createElement('div', {
          key: 'nav',
          className: 'flex items-center justify-between'
        }, [
          React.createElement('div', {
            key: 'logo',
            className: 'flex items-center space-x-2'
          }, [
            React.createElement('span', {
              key: 'icon',
              className: 'text-2xl'
            }, '🀄'),
            React.createElement('span', {
              key: 'title',
              className: 'text-xl font-bold text-emerald-800 dark:text-emerald-200'
            }, '麻雀リーグ')
          ]),
          React.createElement('nav', {
            key: 'navigation',
            className: 'hidden md:flex space-x-2'
          }, [
            React.createElement(NavButton, { key: 'home', page: 'home', label: 'ホーム', icon: '🏠', active: currentPage === 'home' }),
            React.createElement(NavButton, { key: 'players', page: 'players', label: 'プレイヤー', icon: '👥', active: currentPage === 'players' }),
            React.createElement(NavButton, { key: 'games', page: 'games', label: 'ゲーム記録', icon: '📝', active: currentPage === 'games' }),
            React.createElement(NavButton, { key: 'history', page: 'history', label: '履歴', icon: '📊', active: currentPage === 'history' }),
            React.createElement(NavButton, { key: 'seasons', page: 'seasons', label: 'シーズン', icon: '📅', active: currentPage === 'seasons' }),
            React.createElement(NavButton, { key: 'settings', page: 'settings', label: '設定', icon: '⚙️', active: currentPage === 'settings' })
          ])
        ])
      ])
    ),
    // Mobile navigation
    React.createElement('div', {
      key: 'mobile-nav',
      className: 'md:hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-neutral/20 sticky top-16 z-40'
    },
      React.createElement('nav', {
        className: 'flex justify-around p-2'
      }, [
        React.createElement(NavButton, { key: 'home-mobile', page: 'home', label: 'ホーム', active: currentPage === 'home' }),
        React.createElement(NavButton, { key: 'players-mobile', page: 'players', label: 'プレイヤー', active: currentPage === 'players' }),
        React.createElement(NavButton, { key: 'games-mobile', page: 'games', label: '記録', active: currentPage === 'games' }),
        React.createElement(NavButton, { key: 'history-mobile', page: 'history', label: '履歴', active: currentPage === 'history' }),
        React.createElement(NavButton, { key: 'seasons-mobile', page: 'seasons', label: 'シーズン', active: currentPage === 'seasons' }),
        React.createElement(NavButton, { key: 'settings-mobile', page: 'settings', label: '設定', active: currentPage === 'settings' })
      ])
    ),
    // Main Content
    React.createElement('main', {
      key: 'main',
      className: 'container mx-auto px-4 py-8'
    },
      React.createElement('div', {
        className: 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg shadow-lg p-6'
      },
        React.createElement(CurrentPage)
      )
    )
  ]);
};

// Initialize the application
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Show loading screen initially
root.render(React.createElement(LoadingScreen));

// Try to load the full app, fallback to simple app
setTimeout(async () => {
  try {
    console.log('Attempting to load full application...');
    console.log('Current URL:', window.location.href);
    console.log('Current pathname:', window.location.pathname);
    
    // First, try to import constants.js to see if that's the issue
    try {
      console.log('Testing constants.js import...');
      const constantsModule = await import('./constants.js');
      console.log('constants.js imported successfully:', constantsModule);
    } catch (constantsError) {
      console.error('constants.js import failed:', constantsError);
      throw constantsError;
    }
    
    // Try to import the full App
    try {
      console.log('Testing App.js import...');
      const { default: FullApp } = await import('./App.js');
      console.log('Full application loaded successfully!');
      
      // Test if FullApp is actually a function/component
      if (typeof FullApp === 'function') {
        console.log('FullApp is a valid React component');
      } else {
        console.error('FullApp is not a function:', typeof FullApp);
      }
      
      root.render(
        React.createElement(React.StrictMode, null,
          React.createElement(ErrorBoundary, null,
            React.createElement(FullApp)
          )
        )
      );
    } catch (importError) {
      console.error('Full app import failed:', importError);
      console.error('Error stack:', importError.stack);
      console.error('Error name:', importError.name);
      console.error('Error message:', importError.message);
      
      // Check if the error is due to missing components
      if (importError.message.includes('components/') || 
          importError.message.includes('pages/') || 
          importError.message.includes('utils/')) {
        console.log('Missing component files detected. Checking file structure...');
      }
      
      console.log('Full app not available, using simple app mode');
      
      root.render(
        React.createElement(React.StrictMode, null,
          React.createElement(ErrorBoundary, null,
            React.createElement(SimpleApp)
          )
        )
      );
    }
    
  } catch (error) {
    console.error('Failed to load application:', error);
    root.render(
      React.createElement(ErrorScreen, {
        error,
        onRetry: () => window.location.reload()
      })
    );
  }
}, 1000);