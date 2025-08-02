import React, { useState } from 'react';
import PlayerForm from '../components/player/PlayerForm.jsx';
import PlayerList from '../components/player/PlayerList.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import { UsersIcon, PlusCircleIcon } from '../components/icons/Icons.jsx';
import Card from '../components/ui/Card.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';

const PlayersPage = ({ players, addPlayer, updatePlayer, isLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddModal = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingPlayer(null);
  };

  const handleSavePlayer = async (data) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updatePlayer(data.id, data.name);
      } else {
        await addPlayer(data.name);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save player:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading && players.length === 0) {
    return (
      React.createElement('div', { className: "flex justify-center items-center h-64" },
        React.createElement(LoadingSpinner, { size: "lg", message: "Loading players..." })
      )
    );
  }

  return (
    React.createElement('div', { className: "space-y-6" },
      React.createElement(Card, { className: "p-4 sm:p-6" },
        React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6" },
          React.createElement('div', { className: "flex items-center mb-4 sm:mb-0" },
            React.createElement(UsersIcon, { className: "w-8 h-8 mr-3 text-primary" }),
            React.createElement('h1', { className: "text-3xl font-bold" }, 'プレイヤー管理')
          ),
          React.createElement(Button, { 
            onClick: handleOpenAddModal, 
            variant: "primary", 
            leftIcon: React.createElement(PlusCircleIcon, { className: "w-5 h-5" })
          }, '新規プレイヤー追加')
        ),
        
        isLoading && players.length > 0 && 
        React.createElement(LoadingSpinner, { message: "Refreshing player list...", className: "my-4" }),
        
        React.createElement(PlayerList, { 
          players: players, 
          onEditPlayer: handleOpenEditModal 
        }),
        
        !isLoading && players.length === 0 &&
        React.createElement('p', { className: "text-center text-neutral py-4" },
          'まだプレイヤーが登録されていません。「新規プレイヤー追加」をクリックして開始しましょう。'
        )
      ),

      React.createElement(Modal, { 
        isOpen: isModalOpen, 
        onClose: handleCloseModal, 
        title: editingPlayer ? 'プレイヤー編集' : '新規プレイヤー追加'
      },
        React.createElement(PlayerForm, { 
          onSave: handleSavePlayer, 
          initialData: editingPlayer ? { id: editingPlayer.id, name: editingPlayer.name } : null,
          onClose: handleCloseModal
        }),
        isSubmitting && React.createElement(LoadingSpinner, { message: "Saving...", className: "mt-2" })
      )
    )
  );
};

export default PlayersPage;