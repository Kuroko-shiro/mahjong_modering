import React, { useState } from 'react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import SeasonForm from '../components/season/SeasonForm.jsx';
import SeasonList from '../components/season/SeasonList.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { CalendarDaysIcon, PlusCircleIcon } from '../components/icons/Icons.jsx';

const SeasonsPage = ({ 
  seasons, 
  activeSeason, 
  createSeason, 
  updateSeason, 
  activateSeason, 
  isLoading 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddModal = () => {
    setEditingSeason(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (season) => {
    setEditingSeason(season);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingSeason(null);
  };

  const handleSaveSeason = async (seasonData) => {
    setIsSubmitting(true);
    try {
      if (editingSeason) {
        await updateSeason(editingSeason.id, seasonData);
      } else {
        await createSeason(seasonData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save season:', error);
      // Error handling could be improved with toast notifications
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateSeason = async (seasonId) => {
    try {
      await activateSeason(seasonId);
    } catch (error) {
      console.error('Failed to activate season:', error);
    }
  };

  if (isLoading && seasons.length === 0) {
    return (
      React.createElement('div', { className: "flex justify-center items-center h-64" },
        React.createElement(LoadingSpinner, { size: "lg", message: "Loading seasons..." })
      )
    );
  }

  return (
    React.createElement('div', { className: "space-y-6" },
      React.createElement(Card, { className: "p-4 sm:p-6" },
        React.createElement('div', { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6" },
          React.createElement('div', { className: "flex items-center mb-4 sm:mb-0" },
            React.createElement(CalendarDaysIcon, { className: "w-8 h-8 mr-3 text-primary" }),
            React.createElement('h1', { className: "text-3xl font-bold" }, 'シーズン管理')
          ),
          React.createElement(Button, { 
            onClick: handleOpenAddModal, 
            variant: "primary", 
            leftIcon: React.createElement(PlusCircleIcon, { className: "w-5 h-5" })
          }, '新規シーズン作成')
        ),
        
        isLoading && seasons.length > 0 && 
        React.createElement(LoadingSpinner, { message: "Refreshing seasons...", className: "my-4" }),
        
        React.createElement(SeasonList, { 
          seasons: seasons,
          activeSeason: activeSeason,
          onEditSeason: handleOpenEditModal,
          onActivateSeason: handleActivateSeason
        }),
        
        !isLoading && seasons.length === 0 &&
        React.createElement('p', { className: "text-center text-neutral py-4" },
          'まだシーズンが作成されていません。新規シーズンを作成して麻雀リーグを開始しましょう。'
        )
      ),

      React.createElement(Modal, { 
        isOpen: isModalOpen, 
        onClose: handleCloseModal, 
        title: editingSeason ? 'シーズン編集' : '新規シーズン作成'
      },
        React.createElement(SeasonForm, { 
          onSave: handleSaveSeason, 
          initialData: editingSeason, 
          onClose: handleCloseModal
        }),
        isSubmitting && React.createElement(LoadingSpinner, { message: "Saving...", className: "mt-2" })
      )
    )
  );
};

export default SeasonsPage;