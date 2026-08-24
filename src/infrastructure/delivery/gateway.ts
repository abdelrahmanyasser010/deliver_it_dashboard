import type { DeliveryGateway } from '../../application/delivery/contracts';
import { apiDeliveryGateway } from './apiDeliveryGateway';

export const deliveryGateway: DeliveryGateway = apiDeliveryGateway;
