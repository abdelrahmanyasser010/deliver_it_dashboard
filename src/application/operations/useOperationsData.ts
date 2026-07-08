import { useMemo, useState } from 'react';
import type { DeliveryBatch, DriverShipmentUpdate, PickupTask } from '../../domain/operations/entities';
import { operationsMockRepository } from '../../infrastructure/mock/operationsMockRepository';

export function useOperationsWorkspace() {
  const [pickupTasks, setPickupTasks] = useState<PickupTask[]>(() => operationsMockRepository.getPickupTasks());
  const [deliveryBatches, setDeliveryBatches] = useState<DeliveryBatch[]>(() => operationsMockRepository.getDeliveryBatches());
  const [driverUpdates, setDriverUpdates] = useState<DriverShipmentUpdate[]>(() => operationsMockRepository.getDriverUpdates());
  const [activityMessage, setActivityMessage] = useState<string | null>(null);

  const metrics = useMemo(() => ({
    pickupTasksWaitingApproval: pickupTasks.filter((task) => task.status === 'driverSubmitted').length,
    deliveryBatchesInProgress: deliveryBatches.filter((batch) => batch.status === 'inProgress').length,
    pendingDriverUpdates: driverUpdates.filter((update) => update.status === 'pendingAdminApproval').length,
    shipmentsReadyForAssignment: deliveryBatches
      .filter((batch) => batch.status === 'draft')
      .reduce((sum, batch) => sum + batch.shipmentIds.length, 0),
  }), [deliveryBatches, driverUpdates, pickupTasks]);

  const approvePickupTask = (taskId: string) => {
    setPickupTasks((tasks) => tasks.map((task) => (
      task.id === taskId ? { ...task, status: 'approved', reviewNote: 'تم اعتماد ما استلمه المندوب من الشركة.' } : task
    )));
    setActivityMessage(`تم اعتماد مهمة الاستلام ${taskId}`);
  };

  const markPickupTaskNeedsReview = (taskId: string) => {
    setPickupTasks((tasks) => tasks.map((task) => (
      task.id === taskId ? { ...task, status: 'needsReview', reviewNote: 'يوجد نقص في الشحنات المستلمة ويحتاج مراجعة مع التاجر/المندوب.' } : task
    )));
    setActivityMessage(`تم وضع مهمة الاستلام ${taskId} في المراجعة`);
  };

  const assignBatchToDriver = (batchId: string, driverName = 'ياسر عمر') => {
    setDeliveryBatches((batches) => batches.map((batch) => (
      batch.id === batchId
        ? { ...batch, driverId: 'DRV-005', driverName, status: 'assigned' }
        : batch
    )));
    setActivityMessage(`تم تكليف ${driverName} بتوصيل مجموعة ${batchId}`);
  };

  const approveDriverUpdate = (updateId: string) => {
    setDriverUpdates((updates) => updates.map((update) => (
      update.id === updateId ? { ...update, status: 'approvedForMerchant' } : update
    )));
    setActivityMessage(`تم اعتماد تحديث المندوب ${updateId} وسيظهر للتاجر`);
  };

  const rejectDriverUpdate = (updateId: string) => {
    setDriverUpdates((updates) => updates.map((update) => (
      update.id === updateId ? { ...update, status: 'rejectedForReview' } : update
    )));
    setActivityMessage(`تم رفض تحديث المندوب ${updateId} وإرساله للمراجعة`);
  };

  return {
    activityMessage,
    approveDriverUpdate,
    approvePickupTask,
    assignBatchToDriver,
    deliveryBatches,
    driverUpdates,
    markPickupTaskNeedsReview,
    metrics,
    pickupTasks,
    rejectDriverUpdate,
  };
}
