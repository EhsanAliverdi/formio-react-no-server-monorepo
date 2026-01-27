import { MexHttpClient } from '../../core/http';
import { TradeCodeDTO } from './TradeCodeDTO';

export class TradeCodeClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<TradeCodeDTO[]> {
    return this.http.get('/TradeCode/GetAll');
  }

  getById(
    tradeCodeId: number
  ): Promise<TradeCodeDTO> {
    return this.http.get(`/TradeCode/${tradeCodeId}`);
  }

  getByName(
    name: string
  ): Promise<TradeCodeDTO[]> {
    return this.http.get(
      `/TradeCode/GetByTradeCodeName/${encodeURIComponent(
        name
      )}`
    );
  }

  create(
    actionedByContactId: number,
    payload: TradeCodeDTO
  ): Promise<TradeCodeDTO> {
    return this.http.post(
      `/TradeCode/${actionedByContactId}`,
      payload
    );
  }

  update(
    tradeCodeId: number,
    actionedByContactId: number,
    payload: TradeCodeDTO
  ): Promise<TradeCodeDTO> {
    return this.http.put(
      `/TradeCode/${tradeCodeId}/${actionedByContactId}`,
      payload
    );
  }
}
