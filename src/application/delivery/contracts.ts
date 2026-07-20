import type { CommandResult, DeliveryCommand, DeliveryState } from './types';

/**
 * Gateway command responses keep the UI independent from where business rules run.
 * - The mock adapter sets applyLocally so the pure reducer simulates the backend.
 * - A real API may return a projection, or request a fresh read-model reload.
 */
export interface GatewayCommandResponse {
  result: CommandResult;
  projection?: DeliveryState;
  refresh?: boolean;
  applyLocally?: boolean;
}

export interface DeliveryGateway {
  load(): Promise<DeliveryState>;
  execute(command: DeliveryCommand): Promise<GatewayCommandResponse>;
}
