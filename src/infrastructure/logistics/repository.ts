import type { LogisticsRepository } from '../../domain/logistics/repository';
import { logisticsMockRepository } from '../mock/logisticsMockRepository';

// نقطة الاستبدال الوحيدة عند توصيل الـBackend لاحقًا.
export const logisticsRepository: LogisticsRepository = logisticsMockRepository;
