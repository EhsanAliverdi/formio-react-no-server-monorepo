import { TradeCodeClient } from './TradeCodeClient';
import { TradeCodeDTO } from './TradeCodeDTO';
import { Result } from '../../core/types';
import { mapTradeCodeError } from './TradeCodeErrorMapper';

export class TradeCodeService {
  constructor(
    private readonly client: TradeCodeClient
  ) {}

  async getAll(): Promise<Result<TradeCodeDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapTradeCodeError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<TradeCodeDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapTradeCodeError(err),
      };
    }
  }

  async getByName(
    name: string
  ): Promise<Result<TradeCodeDTO[]>> {
    try {
      const data = await this.client.getByName(name);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapTradeCodeError(err),
      };
    }
  }

  async create(
    actionedByContactId: number,
    tradeCode: TradeCodeDTO
  ): Promise<Result<TradeCodeDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        tradeCode
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapTradeCodeError(err),
      };
    }
  }

  async update(
    tradeCodeId: number,
    actionedByContactId: number,
    tradeCode: TradeCodeDTO
  ): Promise<Result<TradeCodeDTO>> {
    try {
      const data = await this.client.update(
        tradeCodeId,
        actionedByContactId,
        tradeCode
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapTradeCodeError(err),
      };
    }
  }
}
