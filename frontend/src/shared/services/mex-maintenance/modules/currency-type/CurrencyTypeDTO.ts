import { EntityId, Code, Name } from '../../core/types';

export interface CurrencyTypeDTO {
  currencyTypeId?: EntityId;

  currencyTypeCode?: Code;        // e.g. AUD, USD
  currencyTypeDescription?: Name; // e.g. Australian Dollar

  isActive?: boolean;
}
