/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CommandResult, DeliveryCommand, DeliveryState } from '../application/delivery/types';
import { reduceDeliveryCommand } from '../application/delivery/reducer';
import { deliveryGateway } from '../infrastructure/delivery/gateway';

interface DeliveryDataContextValue {
  state: DeliveryState | null;
  isLoading: boolean;
  error: string | null;
  execute: (command: DeliveryCommand) => Promise<CommandResult>;
  refetch: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const DeliveryDataContext = createContext<DeliveryDataContextValue | null>(null);
const STORAGE_KEY = 'deliver-it-unified-state-v3';

function readPersisted(): DeliveryState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeliveryState;
    if (!Array.isArray(parsed.shipments) || !Array.isArray(parsed.drivers) || !Array.isArray(parsed.merchants)) return null;
    return parsed;
  } catch { return null; }
}

export function DeliveryDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DeliveryState | null>(() => readPersisted());
  const stateRef = useRef<DeliveryState | null>(state);
  const [isLoading, setIsLoading] = useState(!state);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setIsLoading(true); setError(null);
    try {
      if (!force) {
        const persisted = readPersisted();
        if (persisted) { stateRef.current = persisted; setState(persisted); setIsLoading(false); return; }
      }
      const next = await deliveryGateway.load();
      stateRef.current = next;
      setState(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setError('تعذر تحميل بيانات مساحة العمل التجريبية.');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (stateRef.current) return undefined;
    let cancelled = false;
    void deliveryGateway.load().then((next) => {
      if (cancelled) return;
      stateRef.current = next;
      setState(next);
      setIsLoading(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }).catch(() => {
      if (!cancelled) { setError('تعذر تحميل بيانات مساحة العمل التجريبية.'); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const execute = useCallback(async (command: DeliveryCommand): Promise<CommandResult> => {
    const currentState = stateRef.current;
    if (!currentState) return { ok: false, message: 'البيانات لم تكتمل بعد.' };
    try {
      const response = await deliveryGateway.execute(command);
      if (!response.result.ok) return response.result;

      if (response.projection) {
        stateRef.current = response.projection;
        setState(response.projection);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(response.projection));
        return response.result;
      }

      if (response.refresh) {
        const projection = await deliveryGateway.load();
        stateRef.current = projection;
        setState(projection);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projection));
        return response.result;
      }

      if (response.applyLocally) {
        const reduced = reduceDeliveryCommand(currentState, command);
        stateRef.current = reduced.state;
        setState(reduced.state);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced.state));
        return reduced.result;
      }

      return response.result;
    } catch {
      return { ok: false, message: 'تعذر تنفيذ العملية التجريبية.' };
    }
  }, []);

  const refetch = useCallback(() => load(false), [load]);
  const resetDemo = useCallback(async () => { localStorage.removeItem(STORAGE_KEY); await load(true); }, [load]);
  const value = useMemo(() => ({ state, isLoading, error, execute, refetch, resetDemo }), [state, isLoading, error, execute, refetch, resetDemo]);
  return <DeliveryDataContext.Provider value={value}>{children}</DeliveryDataContext.Provider>;
}

export function useDeliveryData() {
  const context = useContext(DeliveryDataContext);
  if (!context) throw new Error('useDeliveryData must be used inside DeliveryDataProvider');
  return context;
}
