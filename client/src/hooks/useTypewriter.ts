import { useEffect, useRef, useState } from 'react';

/**
 * Reveals `text` one character at a time.
 * Returns the currently-visible string.
 */
export function useTypewriter(text: string, speed = 28, startDelay = 400): string {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    indexRef.current = 0;

    const timeout = setTimeout(() => {
      const id = setInterval(() => {
        indexRef.current += 1;
        setDisplayed(text.slice(0, indexRef.current));
        if (indexRef.current >= text.length) clearInterval(id);
      }, speed);
      return () => clearInterval(id);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return displayed;
}
