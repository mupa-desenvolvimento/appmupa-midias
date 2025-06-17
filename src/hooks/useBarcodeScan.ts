
import { useState, useEffect } from 'react';

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
    if (barcode && barcode.length >= 8) { // Validação mínima para códigos de barras
      setScannedCode(barcode);
      setIsScanning(false);
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
