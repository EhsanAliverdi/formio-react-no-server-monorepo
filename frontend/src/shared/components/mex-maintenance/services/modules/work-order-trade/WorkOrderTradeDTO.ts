import { EntityId } from '../../core/types';

export interface WorkOrderTradeDTO {
  workOrderTradeId?: EntityId;
  workOrderId?: EntityId;

  tradeCodeId?: EntityId;
  tradeCodeName?: string;

  hoursWorked?: number;
  hourlyRate?: number;
  totalCost?: number;

  workDate?: string;
}
