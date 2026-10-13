import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface ReceiptSettingsProps {
  className?: string;
}

export const ReceiptSettings: React.FC<ReceiptSettingsProps> = ({ className }) => {
  const router = useRouter();

  const handleOpenSettings = () => {
    router.push('/receipt-settings');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={handleOpenSettings}
        variant="outline"
        size="sm"
        className="border-orange-200 text-orange-700 hover:bg-orange-50"
      >
        <Settings className="w-4 h-4 mr-2" />
        Cài đặt mẫu in
      </Button>
    </div>
  );
};

export default ReceiptSettings;
