import type { CommandResult, DeliveryCommand, DeliveryState } from './types';

/**
 * Gateway command responses keep the UI independent from where business rules run.
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
