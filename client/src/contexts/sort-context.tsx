import { createContext, useContext, useState, ReactNode } from 'react';

type SortType = "price_asc" | "price_desc" | "name";

interface SortContextType {
  sort: SortType;
  setSort: (sort: SortType) => void;
}

const SortContext = createContext<SortContextType | undefined>(undefined);

export function SortProvider({ children }: { children: ReactNode }) {
  const [sort, setSort] = useState<SortType>("name");

  return (
    <SortContext.Provider value={{ sort, setSort }}>
      {children}
    </SortContext.Provider>
  );
}

export function useSort() {
  const context = useContext(SortContext);
  if (context === undefined) {
    throw new Error('useSort must be used within a SortProvider');
  }
  return context;
}