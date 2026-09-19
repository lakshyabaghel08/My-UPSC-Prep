/** Tiny hash router — keeps the app fully offline-capable (no server rewrites needed). */
import { useCallback, useEffect, useState } from 'react';

export function useRoute(): [string, (to: string) => void] {
  const parse = () => {
    const h = window.location.hash.replace(/^#/, '');
    return h.startsWith('/') ? h : '/dashboard';
  };
  const [route, setRoute] = useState(parse);

  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
    window.scrollTo({ top: 0 });
  }, []);

  return [route, navigate];
}

export function navigate(to: string) {
  window.location.hash = to;
  window.scrollTo({ top: 0 });
}
