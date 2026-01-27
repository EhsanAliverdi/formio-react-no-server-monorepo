import { EntityId } from '../../core/types';

export interface CatalogueTransactionDTO {
  catalogueTransactionId?: EntityId;

  catalogueId?: EntityId;
  transactionType?: string;

  quantity?: number;
  transactionDateTime?: string;

  referenceNumber?: string;
  comments?: string;
}
