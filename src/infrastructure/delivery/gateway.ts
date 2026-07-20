import type { DeliveryGateway } from '../../application/delivery/contracts';
import { mockDeliveryGateway } from './mockDeliveryGateway';

// Replace this binding with apiDeliveryGateway when the backend is ready.
export const deliveryGateway: DeliveryGateway = mockDeliveryGateway;
