import { MexHttpClient } from '../../core/http';
import { ApprovalPathDTO } from './ApprovalPathDTO';

export class ApprovalPathClient {
  constructor(private readonly http: MexHttpClient) {}

  getAll(): Promise<ApprovalPathDTO[]> {
    return this.http.get('/ApprovalPath/GetAll');
  }

  getById(approvalPathId: number): Promise<ApprovalPathDTO> {
    return this.http.get(`/ApprovalPath/${approvalPathId}`);
  }

  getByName(name: string): Promise<ApprovalPathDTO[]> {
    return this.http.get(
      `/ApprovalPath/GetByApprovalPathName/${encodeURIComponent(name)}`
    );
  }
}
