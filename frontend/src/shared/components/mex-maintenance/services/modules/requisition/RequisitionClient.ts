import { MexHttpClient } from '../../core/http';
import { RequisitionDTO } from './RequisitionDTO';
import { RequisitionActionDTO } from './RequisitionActionDTO';

export class RequisitionClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<RequisitionDTO[]> {
    return this.http.get('/Requisition/GetAll');
  }

  getById(
    requisitionId: number
  ): Promise<RequisitionDTO> {
    return this.http.get(`/Requisition/${requisitionId}`);
  }

  getByRequisitionNumber(
    requisitionNumber: string
  ): Promise<RequisitionDTO> {
    return this.http.get(
      `/Requisition/GetByRequisitionNumber/${encodeURIComponent(
        requisitionNumber
      )}`
    );
  }

  approve(
    payload: RequisitionActionDTO
  ): Promise<void> {
    return this.http.put(
      '/Requisition/ApproveRequisition',
      payload
    );
  }

  decline(
    payload: RequisitionActionDTO
  ): Promise<void> {
    return this.http.put(
      '/Requisition/DeclineRequisition',
      payload
    );
  }
}
