'use client';

import React from 'react';
// We'll use a standard React component pattern instead of SessionProvider
// since we're not fully implementing next-auth yet

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 