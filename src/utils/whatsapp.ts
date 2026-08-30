import type { Shipment } from '../domain/logistics/entities';
import type { TenantOperationalSettings } from '../domain/settings/entities';
import { defaultWhatsAppTemplate } from '../domain/settings/entities';
import { formatCurrency } from './helpers';

export interface WhatsAppNotificationResult {
  phone: string;
  message: string;
  waUrl: string;
}

export function generateWhatsAppNotification(
  shipment: Shipment,
  settings?: TenantOperationalSettings
): WhatsAppNotificationResult {
  const addressGov = typeof shipment.address === 'object' && shipment.address ? (shipment.address as { governorate?: string }).governorate : '';
  const governorate = shipment.governorate || addressGov || 'القاهرة';
  const govRates = settings?.pricing?.governorateRates ?? [];
  const matchedRate = govRates.find(
    (g) => g.governorate.includes(governorate) || governorate.includes(g.governorate)
  );
  
  const estimatedDays = matchedRate?.estimatedDays ?? (governorate.includes('القاهرة') || governorate.includes('الجيزة') ? 1 : 2);
  const daysText = estimatedDays === 1 ? 'خلال 24 ساعة' : `خلال ${estimatedDays} أيام عمل`;

  const template =
    settings?.notifications?.whatsApp?.defaultTemplate || defaultWhatsAppTemplate;

  const companyName = settings?.notifications?.whatsApp?.companyName || 'فيكس 365';
  const recipientName = shipment.customerName || 'العميل العزيز';
  const merchantName = shipment.merchantName || 'التاجر';
  const codAmount = formatCurrency(shipment.expectedCollection || shipment.collectedCash || 0);
  const trackingUrl = `${window.location.origin}/shipments?shipment=${shipment.trackingNumber || shipment.id}`;

  const message = template
    .replaceAll('{اسم_العميل}', recipientName)
    .replaceAll('{رقم_الشحنة}', shipment.trackingNumber || shipment.id)
    .replaceAll('{اسم_التاجر}', merchantName)
    .replaceAll('{اسم_شركة_الشحن}', companyName)
    .replaceAll('{المحافظة}', governorate)
    .replaceAll('{مدة_التسليم}', daysText)
    .replaceAll('{المبلغ}', codAmount)
    .replaceAll('{رابط_التتبع}', trackingUrl);

  let rawPhone = (shipment.customerPhone || '').replace(/\D/g, '');
  if (rawPhone.startsWith('0')) {
    rawPhone = '20' + rawPhone.slice(1);
  } else if (!rawPhone.startsWith('20') && rawPhone.length === 10) {
    rawPhone = '20' + rawPhone;
  }

  const waUrl = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(message)}`;

  return { phone: rawPhone, message, waUrl };
}

export function openWhatsAppNotification(
  shipment: Shipment,
  settings?: TenantOperationalSettings
) {
  const { waUrl } = generateWhatsAppNotification(shipment, settings);
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}
