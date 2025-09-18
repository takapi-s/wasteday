import React from 'react';
import { AppManagementPage as SharedAppManagement } from '@wasteday/ui';
import { useLocalAppCategories } from '../hooks/useLocalAppCategories';

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
    />
  );
};
