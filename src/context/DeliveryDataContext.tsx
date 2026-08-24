/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CommandResult, DeliveryCommand, DeliveryState } from '../application/delivery/types';
import { deliveryGateway } from '../infrastructure/delivery/gateway';
import { friendlyApiMessage } from '../infrastructure/api/errors';

interface DeliveryDataContextValue {
  state: DeliveryState | null;
  isLoading: boolean;
  error: string | null;
  execute: (command: DeliveryCommand) => Promise<CommandResult>;
  refetch: () => Promise<void>;
}

const DeliveryDataContext = createContext<DeliveryDataContextValue | null>(null);

export function DeliveryDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DeliveryState | null>(null);
  const stateRef = useRef<DeliveryState | null>(null);
  const loadSequence = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setIsLoading(true);
    setError(null);
    try {
      const next = await deliveryGateway.load();
      if (sequence !== loadSequence.current) return;
      stateRef.current = next;
      setState(next);
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      setError(friendlyApiMessage(cause));
    } finally {
      if (sequence === loadSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => { loadSequence.current += 1; };
  }, [load]);

  const execute = useCallback(async (command: DeliveryCommand): Promise<CommandResult> => {
    if (!stateRef.current) return { ok: false, message: 'البيانات لم تكتمل بعد.' };
    try {
      const response = await deliveryGateway.execute(command);
      if (!response.result.ok) return response.result;

      // Server projections are authoritative. Never simulate domain writes locally.
      if (response.projection) {
        stateRef.current = response.projection;
        setState(response.projection);
      } else if (response.refresh !== false) {
        const projection = await deliveryGateway.load();
        stateRef.current = projection;
        setState(projection);
      }
      return response.result;
    } catch (cause) {
      return { ok: false, message: friendlyApiMessage(cause) };
    }
  }, []);

  const refetch = useCallback(() => load(), [load]);
  const value = useMemo(() => ({ state, isLoading, error, execute, refetch }), [state, isLoading, error, execute, refetch]);
  return <DeliveryDataContext.Provider value={value}>{children}</DeliveryDataContext.Provider>;
}

export function useDeliveryData() {
  const context = useContext(DeliveryDataContext);
  if (!context) throw new Error('useDeliveryData must be used inside DeliveryDataProvider');
  return context;
}
