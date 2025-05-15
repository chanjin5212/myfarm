import React, { createContext, useContext, useState, useMemo, memo } from 'react';

interface ProductContextType {
  inquiriesCount: number;
  setInquiriesCount: (count: number) => void;
  updateInquiriesCount: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const [inquiriesCount, setInquiriesCount] = useState(0);

  const updateInquiriesCount = () => {
    setInquiriesCount(prev => prev + 1);
  };

  // useMemo를 사용하여 context 값 메모이제이션
  const contextValue = useMemo(() => ({
    inquiriesCount, 
    setInquiriesCount, 
    updateInquiriesCount
  }), [inquiriesCount]);

  return (
    <ProductContext.Provider value={contextValue}>
      {children}
    </ProductContext.Provider>
  );
});

ProductProvider.displayName = 'ProductProvider';

export const useProductContext = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProductContext must be used within a ProductProvider');
  }
  return context;
}; 