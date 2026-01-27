import { WorkOrderTradeClient } from './WorkOrderTradeClient';
import { WorkOrderTradeDTO } from './WorkOrderTradeDTO';
import { Result } from '../../core/types';
import { mapWorkOrderTradeError } from './WorkOrderTradeErrorMapper';

export class WorkOrderTradeService {
  constructor(
    private readonly client: WorkOrderTradeClient
  ) {}

  async getAll(): Promise<Result<WorkOrderTradeDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderTradeError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<WorkOrderTradeDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderTradeError(err),
      };
    }
  }

  async getByWorkOrderId(
    workOrderId: number
  ): Promise<Result<WorkOrderTradeDTO[]>> {
    try {
      const data =
        await this.client.getByWorkOrderId(
          workOrderId
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderTradeError(err),
      };
    }
  }
}
