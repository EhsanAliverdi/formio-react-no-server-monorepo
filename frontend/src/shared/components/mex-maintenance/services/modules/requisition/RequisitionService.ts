import { RequisitionClient } from './RequisitionClient';
import { RequisitionDTO } from './RequisitionDTO';
import { RequisitionActionDTO } from './RequisitionActionDTO';
import { Result } from '../../core/types';
import { mapRequisitionError } from './RequisitionErrorMapper';

export class RequisitionService {
  constructor(
    private readonly client: RequisitionClient
  ) {}

  async getAll(): Promise<Result<RequisitionDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapRequisitionError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<RequisitionDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapRequisitionError(err),
      };
    }
  }

  async getByRequisitionNumber(
    number: string
  ): Promise<Result<RequisitionDTO>> {
    try {
      const data =
        await this.client.getByRequisitionNumber(number);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapRequisitionError(err),
      };
    }
  }

  async approve(
    action: RequisitionActionDTO
  ): Promise<Result<void>> {
    try {
      await this.client.approve(action);
      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapRequisitionError(err),
      };
    }
  }

  async decline(
    action: RequisitionActionDTO
  ): Promise<Result<void>> {
    try {
      await this.client.decline(action);
      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapRequisitionError(err),
      };
    }
  }
}
