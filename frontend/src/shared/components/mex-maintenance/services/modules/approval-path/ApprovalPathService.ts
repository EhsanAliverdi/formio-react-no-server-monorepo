import { ApprovalPathClient } from './ApprovalPathClient';
import { Result } from '../../core/types';
import { ApprovalPathDTO } from './ApprovalPathDTO';
import { mapApprovalPathError } from './ApprovalPathErrorMapper';

export class ApprovalPathService {
  constructor(
    private readonly client: ApprovalPathClient
  ) {}

  async getAll(): Promise<Result<ApprovalPathDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapApprovalPathError(err) };
    }
  }

  async getById(id: number): Promise<Result<ApprovalPathDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapApprovalPathError(err) };
    }
  }
}
