import { EntityId, Code, Name } from '../../core/types';

export interface TradeCodeDTO {
  tradeCodeId?: EntityId;

  tradeCodeName?: Name;        // e.g. Electrician
  tradeCodeDescription?: string;

  tradeCode?: Code;            // short code
  isActive?: boolean;
}
