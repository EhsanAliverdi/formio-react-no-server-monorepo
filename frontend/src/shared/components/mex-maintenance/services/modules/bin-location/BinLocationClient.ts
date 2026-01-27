import { MexHttpClient } from '../../core/http';
import { BinLocationDTO } from './BinLocationDTO';

export class BinLocationClient {
  constructor(private readonly http: MexHttpClient) {}

  getAll(): Promise<BinLocationDTO[]> {
    return this.http.get('/BinLocation/GetAll');
  }

  getById(binLocationId: number): Promise<BinLocationDTO> {
    return this.http.get(`/BinLocation/${binLocationId}`);
  }

  getByName(name: string): Promise<BinLocationDTO[]> {
    return this.http.get(
      `/BinLocation/GetByBinLocationName/${encodeURIComponent(name)}`
    );
  }
}
