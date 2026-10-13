import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { Category } from '@/services/api';

interface CategoriesContextType {
  categories: Category[];
  isLoading: boolean;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addSubcategory: (categoryId: string, subcategory: string) => Promise<void>;
  updateSubcategory: (categoryId: string, oldName: string, newName: string) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategory: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export const CategoriesProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCategories = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Fall back to default categories if API fails
      setCategories([
        { id: '1', name: 'Women', subcategories: ['Dresses', 'Tops', 'Trousers', 'Skirts', 'Knitwear', 'Outerwear', 'Shoes', 'Accessories'] },
        { id: '2', name: 'Men', subcategories: ['Shirts', 'T-Shirts', 'Trousers', 'Suits', 'Knitwear', 'Outerwear', 'Shoes', 'Accessories'] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCategories();
  }, []);

  const addCategory = async (name: string) => {
    try {
      const newCategory = await api.createCategory(name, []);
      setCategories(prev => [...prev, newCategory]);
    } catch (error) {
      console.error('Failed to add category:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    try {
      const updated = await api.updateCategory(id, { name });
      setCategories(prev =>
        prev.map(cat => (cat.id === id ? updated : cat))
      );
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.deleteCategory(id);
      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  };

  const addSubcategory = async (categoryId: string, subcategory: string) => {
    try {
      const updated = await api.addSubcategory(categoryId, subcategory);
      setCategories(prev =>
        prev.map(cat => (cat.id === categoryId ? updated : cat))
      );
    } catch (error) {
      console.error('Failed to add subcategory:', error);
      throw error;
    }
  };

  const updateSubcategory = async (categoryId: string, oldName: string, newName: string) => {
    // The API uses PATCH /categories/:id/subcategories/:oldName
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) throw new Error('Category not found');
      
      const newSubcategories = category.subcategories.map(sub =>
        sub === oldName ? newName : sub
      );
      
      const updated = await api.updateCategory(categoryId, { subcategories: newSubcategories });
      setCategories(prev =>
        prev.map(cat => (cat.id === categoryId ? updated : cat))
      );
    } catch (error) {
      console.error('Failed to update subcategory:', error);
      throw error;
    }
  };

  const deleteSubcategory = async (categoryId: string, subcategory: string) => {
    try {
      const updated = await api.deleteSubcategory(categoryId, subcategory);
      setCategories(prev =>
        prev.map(cat => (cat.id === categoryId ? updated : cat))
      );
    } catch (error) {
      console.error('Failed to delete subcategory:', error);
      throw error;
    }
  };

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        isLoading,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        refreshCategories,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
};

export type { Category };
