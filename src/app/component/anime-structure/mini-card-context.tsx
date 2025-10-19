'use client';

import React from 'react';

interface MiniCardProviderProps {
  children: React.ReactNode;
}

// Простейший провайдер-обертка
export const MiniCardProvider: React.FC<MiniCardProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export default MiniCardProvider;
