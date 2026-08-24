import type { DeliveryGateway } from '../../application/delivery/contracts';
import { apiDeliveryGateway } from './apiDeliveryGateway';
import { mockDeliveryGateway } from './mockDeliveryGateway';

export function isMockMode(): boolean {
  return localStorage.getItem('deliver-it-mode') === 'mock' || !import.meta.env.VITE_API_URL;
}

export function setDashboardMode(mode: 'live' | 'mock') {
  localStorage.setItem('deliver-it-mode', mode);
  window.location.reload();
}

export const deliveryGateway: DeliveryGateway = {
  async load() {
    if (localStorage.getItem('deliver-it-mode') === 'mock') {
      return mockDeliveryGateway.load();
    }
    try {
      return await apiDeliveryGateway.load();
    } catch {
      // Graceful fallback to mock data when backend is not deployed/offline
      return mockDeliveryGateway.load();
    }
  },
  async execute(command) {
    if (localStorage.getItem('deliver-it-mode') === 'mock') {
      return mockDeliveryGateway.execute(command);
    }
    try {
      return await apiDeliveryGateway.execute(command);
    } catch {
      return mockDeliveryGateway.execute(command);
    }
  },
};
