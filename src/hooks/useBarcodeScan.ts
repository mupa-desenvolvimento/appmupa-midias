
import { useState } from 'react';

export const useBarcodeScan = () => {
  const [isScanning, setIsScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const startScan = () => {
    setIsScanning(true);
    setScannedCode(null);
  };

  const resetScan = () => {
    setScannedCode(null);
    setIsScanning(true);
  };

  const handleBarcodeScan = (barcode: string) => {
    if (barcode && barcode.length >= 8) {
      setScannedCode(barcode);
      setIsScanning(false);
      // Store barcode for consultation screen
      localStorage.setItem('lastBarcode', barcode);
    }
  };

  return {
    isScanning,
    scannedCode,
    startScan,
    resetScan,
    handleBarcodeScan
  };
};
