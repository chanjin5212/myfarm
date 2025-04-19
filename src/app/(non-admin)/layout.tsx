import Header from '@/components/Header';
import { Toaster } from 'react-hot-toast';

export default function NonAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Toaster position="top-center" />
      <Header />
      {children}
    </>
  );
} 