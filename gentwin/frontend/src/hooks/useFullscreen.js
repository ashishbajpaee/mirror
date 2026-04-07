import { useEffect } from 'react';

export default function useFullscreen() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle fullscreen on 'F'
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
        }
      }
      // Esc is handled natively by browsers to exit fullscreen, 
      // but we can also manually exit if needed.
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
