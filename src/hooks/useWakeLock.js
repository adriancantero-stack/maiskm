import { useState, useCallback, useEffect } from 'react';

export function useWakeLock() {
  const [wakeLock, setWakeLock] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (isSupported) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        console.log('Wake Lock ativo.');

        lock.addEventListener('release', () => {
          console.log('Wake Lock liberado.');
          setWakeLock(null);
        });
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    } else {
      console.warn('Wake Lock API não suportada neste navegador.');
      // Opcional: Fallback video hack aqui
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock !== null) {
      await wakeLock.release();
      setWakeLock(null);
    }
  }, [wakeLock]);

  // Se a aba ficar invisível, o lock é liberado automaticamente.
  // Precisamos pedir de novo quando ela voltar.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wakeLock, requestWakeLock]);

  return { isSupported, requestWakeLock, releaseWakeLock, isActive: wakeLock !== null };
}
