import React, { createContext, useCallback, useContext, useState } from 'react';

interface Toast { id: number; msg: string; kind: 'info' | 'ok' | 'bad' }
interface ToastCtx { push: (msg: string, kind?: Toast['kind']) => void }

const Ctx = createContext<ToastCtx>({ push: () => {} });
let seq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((msg: string, kind: Toast['kind'] = 'info') => {
    const id = seq++;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toast-zone">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
