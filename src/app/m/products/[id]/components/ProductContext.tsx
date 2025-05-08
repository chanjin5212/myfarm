import React, { createContext, useContext, useState } from 'react';

interface ProductContextType {
  inquiriesCount: number;
  setInquiriesCount: (count: number) => void;
  updateInquiriesCount: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inquiriesCount, setInquiriesCount] = useState(0);

  const updateInquiriesCount = () => {
    setInquiriesCount(prev => prev + 1);
  };

  return (
    <ProductContext.Provider value={{ inquiriesCount, setInquiriesCount, updateInquiriesCount }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProductContext = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProductContext must be used within a ProductProvider');
  }
  return context;
}; 