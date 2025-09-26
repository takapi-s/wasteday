import React from 'react';
import { AppManagementPage as SharedAppManagement } from '@wasteday/ui';
import { useLocalAppCategories } from '../hooks/utils';
import { useBrowsingData } from '../hooks/data';

export const AppManagementPage: React.FC = () => {
  const { 
    categories, 
    loading, 
    error, 
    updateCategory, 
    toggleActive,
    discovered,
    addCategory,
    deleteCategory,
  } = useLocalAppCategories();

  const { sessions: browsingSessions } = useBrowsingData();

  return (
    <SharedAppManagement
      categories={categories}
      loading={loading}
      error={error}
      onUpdateCategory={updateCategory}
      onToggleActive={toggleActive}
      discovered={discovered}
      onAddCategory={addCategory}
      onDeleteCategory={deleteCategory}
      browsingSessions={browsingSessions}
    />
  );
};
