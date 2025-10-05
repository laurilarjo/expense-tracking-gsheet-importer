import React from 'react';
import { Bank } from '@/lib/types/bank';

interface BankLogoProps {
  bank: Bank;
  className?: string;
}

export const BankLogo: React.FC<BankLogoProps> = ({ bank, className = "h-10 w-10" }) => {
  const getLogoPath = (bank: Bank): string => {
    switch (bank) {
      case Bank.OP:
        return '/bank-logos/op.png';
      case Bank.NORDEA_FI:
        return '/bank-logos/nordea.png';
      case Bank.NORWEGIAN:
        return '/bank-logos/norwegian.png';
      case Bank.BINANCE:
        return '/bank-logos/binance.png';
      case Bank.HANDELSBANKEN:
        return '/bank-logos/handelsbanken.png';
      case Bank.NORDEA_SE:
        return '/bank-logos/nordea.png';
      default:
        return '/bank-logos/default.png'; // fallback
    }
  };

  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src={getLogoPath(bank)} 
        alt={`${bank} logo`}
        className="max-w-full max-h-full object-contain"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
