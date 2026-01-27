import { MexHttpClient } from '../../core/http';
import { JobTypeDTO } from './JobTypeDTO';

export class JobTypeClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<JobTypeDTO[]> {
    return this.http.get('/JobType/GetAll');
  }

  getById(
    jobTypeId: number
  ): Promise<JobTypeDTO> {
    return this.http.get(`/JobType/${jobTypeId}`);
  }

  getByName(
    name: string
  ): Promise<JobTypeDTO[]> {
    return this.http.get(
      `/JobType/GetByJobTypeName/${encodeURIComponent(
        name
      )}`
    );
  }

  getByDescription(
    description: string
  ): Promise<JobTypeDTO[]> {
    return this.http.get(
      `/JobType/GetByJobTypeDescription/${encodeURIComponent(
        description
      )}`
    );
  }
}
