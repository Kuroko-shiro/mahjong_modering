import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  SunIcon, 
  MoonIcon, 
  TrophyIcon, 
  UsersIcon, 
  PlusCircleIcon, 
  ListBulletIcon, 
  CogIcon, 
  CalendarDaysIcon 
} from '../icons/Icons.jsx';

const Navbar = ({ theme, toggleTheme, activeSeason }) => {
  const commonLinkClasses = "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105";
  const activeLinkClasses = "bg-gradient-to-r from-primary to-primary-focus text-white shadow-lg transform scale-105";
  const inactiveLinkClasses = "text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20";

  const getLinkClass = ({ isActive }) => 
    `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`;

  return (
    React.createElement('header', { className: "bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50" },
      React.createElement('div', { className: "container mx-auto px-4 sm:px-6 lg:px-8" },
        React.createElement('div', { className: "flex items-center justify-between h-20" },
          React.createElement('div', { className: "flex items-center space-x-6" },
            React.createElement(NavLink, { to: "/", className: "flex-shrink-0 flex items-center text-2xl font-bold text-primary hover:scale-105 transition-transform" },
              React.createElement('div', { className: "p-2 bg-gradient-to-br from-primary to-primary-focus rounded-xl text-white mr-3 shadow-lg" },
                React.createElement(TrophyIcon, { className: "h-8 w-8" })
              ),
              React.createElement('span', { className: "bg-gradient-to-r from-primary to-primary-focus bg-clip-text text-transparent" },
                '麻雀リーグ'
              )
            ),
            // Active season indicator - 改善版
            activeSeason && 
            React.createElement('div', { className: "hidden md:flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200 dark:border-blue-700 shadow-sm" },
              React.createElement('div', { className: "p-1 bg-blue-500 rounded-full mr-2" },
                React.createElement(CalendarDaysIcon, { className: "h-3 w-3 text-white" })
              ),
              React.createElement('span', { className: "text-sm font-medium text-blue-700 dark:text-blue-300" }, activeSeason.name)
            )
          ),
          React.createElement('nav', { className: "hidden md:flex items-center space-x-3 lg:space-x-4" },
            React.createElement(NavLink, { to: "/", className: getLinkClass },
              React.createElement('div', { className: "flex items-center" },
                React.createElement('span', { className: "text-lg mr-2" }, '🏆'),
                React.createElement(TrophyIcon, { className: "h-5 w-5 mr-2" }),
                '順位表'
              )
            ),
            React.createElement(NavLink, { to: "/players", className: getLinkClass },
              React.createElement('div', { className: "flex items-center" },
                React.createElement('span', { className: "text-lg mr-2" }, '👥'),
                React.createElement(UsersIcon, { className: "h-5 w-5 mr-2" }),
                'プレイヤー'
              )
            ),
            React.createElement(NavLink, { to: "/record-game", className: getLinkClass },
              React.createElement('div', { className: "flex items-center" },
                React.createElement('span', { className: "text-lg mr-2" }, '➕'),
                React.createElement(PlusCircleIcon, { className: "h-5 w-5 mr-2" }),
                'ゲーム記録'
              )
            ),
            React.createElement(NavLink, { to: "/game-history", className: getLinkClass },
              React.createElement('div', { className: "flex items-center" },
                React.createElement('span', { className: "text-lg mr-2" }, '📜'),
                React.createElement(ListBulletIcon, { className: "h-5 w-5 mr-2" }),
                'ゲーム履歴'
              )
            ),
            React.createElement(NavLink, { to: "/seasons", className: getLinkClass },
              React.createElement('div', { className: "flex items-center" },
                React.createElement('span', { className: "text-lg mr-2" }, '📅'),
                React.createElement(CalendarDaysIcon, { className: "h-5 w-5 mr-2" }),
                'シーズン'
              )
            ),
            React.createElement(NavLink, { to: "/settings", className: getLinkClass },
              React.createElement('div', { className: "flex items-center" },
                React.createElement('span', { className: "text-lg mr-2" }, '⚙️'),
                React.createElement(CogIcon, { className: "h-5 w-5 mr-2" }),
                '設定'
              )
            )
          ),
          React.createElement('div', { className: "flex items-center space-x-3" },
            React.createElement('button', {
              onClick: toggleTheme,
              className: "p-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-primary/10 hover:to-primary/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 hover:scale-105 shadow-md",
              'aria-label': "Toggle theme"
            },
              React.createElement('div', { className: "flex items-center space-x-2" },
                theme === 'light' 
                  ? React.createElement('div', { className: "flex items-center space-x-1" },
                      React.createElement('span', { className: "text-lg" }, '🌙'),
                      React.createElement(MoonIcon, { className: "h-5 w-5 text-gray-600" })
                    )
                  : React.createElement('div', { className: "flex items-center space-x-1" },
                      React.createElement('span', { className: "text-lg" }, '☀️'),
                      React.createElement(SunIcon, { className: "h-5 w-5 text-yellow-400" })
                    )
              )
            )
          )
        )
      ),
      // Mobile navigation - 改善版
      React.createElement('div', { className: "md:hidden border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95" },
        React.createElement('nav', { className: "flex justify-around p-3" },
          React.createElement(NavLink, { 
            to: "/", 
            className: ({ isActive }) => `${commonLinkClasses} ${isActive ? 'bg-gradient-to-r from-primary to-primary-focus text-white' : 'text-gray-600 dark:text-gray-400'} flex-col items-center py-2 px-3 min-w-0`
          },
            React.createElement('span', { className: "text-xl mb-1" }, '🏆'),
            React.createElement(TrophyIcon, { className: "h-4 w-4 mb-1" }),
            React.createElement('span', { className: "text-xs font-medium" }, '順位表')
          ),
          React.createElement(NavLink, { 
            to: "/players", 
            className: ({ isActive }) => `${commonLinkClasses} ${isActive ? 'bg-gradient-to-r from-primary to-primary-focus text-white' : 'text-gray-600 dark:text-gray-400'} flex-col items-center py-2 px-3 min-w-0`
          },
            React.createElement('span', { className: "text-xl mb-1" }, '👥'),
            React.createElement(UsersIcon, { className: "h-4 w-4 mb-1" }),
            React.createElement('span', { className: "text-xs font-medium" }, 'プレイヤー')
          ),
          ),
          React.createElement(NavLink, { to: "/record-game", className: getLinkClass },
          React.createElement(NavLink, { 
            to: "/record-game", 
            className: ({ isActive }) => `${commonLinkClasses} ${isActive ? 'bg-gradient-to-r from-primary to-primary-focus text-white' : 'text-gray-600 dark:text-gray-400'} flex-col items-center py-2 px-3 min-w-0`
          },
            React.createElement('span', { className: "text-xl mb-1" }, '➕'),
            React.createElement(PlusCircleIcon, { className: "h-4 w-4 mb-1" }),
            React.createElement('span', { className: "text-xs font-medium" }, '記録')
          ),
          React.createElement(NavLink, { 
            to: "/game-history", 
            className: ({ isActive }) => `${commonLinkClasses} ${isActive ? 'bg-gradient-to-r from-primary to-primary-focus text-white' : 'text-gray-600 dark:text-gray-400'} flex-col items-center py-2 px-3 min-w-0`
          },
            React.createElement('span', { className: "text-xl mb-1" }, '📜'),
            React.createElement(ListBulletIcon, { className: "h-4 w-4 mb-1" }),
            React.createElement('span', { className: "text-xs font-medium" }, '履歴')
          ),
          React.createElement(NavLink, { 
            to: "/settings", 
            className: ({ isActive }) => `${commonLinkClasses} ${isActive ? 'bg-gradient-to-r from-primary to-primary-focus text-white' : 'text-gray-600 dark:text-gray-400'} flex-col items-center py-2 px-3 min-w-0`
          },
            React.createElement('span', { className: "text-xl mb-1" }, '⚙️'),
            React.createElement(CogIcon, { className: "h-4 w-4 mb-1" }),
            React.createElement('span', { className: "text-xs font-medium" }, '設定')
          )
        ),
        // Mobile season indicator - 改善版
        activeSeason && 
        React.createElement('div', { className: "px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-center border-t border-blue-200 dark:border-blue-700" },
          React.createElement('div', { className: "flex items-center justify-center" },
            React.createElement('span', { className: "text-lg mr-2" }, '📅'),
            React.createElement(CalendarDaysIcon, { className: "h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" }),
            React.createElement('span', { className: "text-sm font-medium text-blue-700 dark:text-blue-300" }, 
              `現在のシーズン: ${activeSeason.name}`
            )
          )
        )
      )
    )
  );
};

export default Navbar;