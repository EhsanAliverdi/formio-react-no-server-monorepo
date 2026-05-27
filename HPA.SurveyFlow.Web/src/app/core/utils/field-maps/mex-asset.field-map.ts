/**
 * MEX Asset field map.
 * Defines how raw MEX API field names are presented to the user.
 *
 * Structure:
 *   groups: ordered list of section groups, each with an ordered list of fields.
 *   Fields not listed here will appear in the "Other Fields" catch-all section.
 *
 * Adding a new integration: create a new file following the same pattern,
 * then register it in source-field-map.registry.ts.
 */

export interface FieldDef {
  key: string;          // exact key in the raw JSON
  label: string;        // human-readable label
  type?: 'text' | 'date' | 'datetime' | 'boolean' | 'currency' | 'number' | 'multiline';
  hide_if_empty?: boolean; // skip the field when null/0/empty string
}

export interface FieldGroup {
  title: string;
  fields: FieldDef[];
}

export const MEX_ASSET_FIELD_MAP: FieldGroup[] = [
  {
    title: 'Identification',
    fields: [
      { key: 'assetNumber',          label: 'Asset Number' },
      { key: 'assetDescription',     label: 'Description',        type: 'multiline' },
      { key: 'assetType',            label: 'Asset Type' },
      { key: 'assetStatus',          label: 'Status',             hide_if_empty: true },
      { key: 'isActive',             label: 'Active',             type: 'boolean' },
      { key: 'barcodeNumber',        label: 'Barcode',            hide_if_empty: true },
      { key: 'serialNumber',         label: 'Serial Number',      hide_if_empty: true },
      { key: 'modelNumber',          label: 'Model Number',       hide_if_empty: true },
      { key: 'manufacturer',         label: 'Manufacturer',       hide_if_empty: true },
      { key: 'financialAssetNumber', label: 'Financial Asset No', hide_if_empty: true },
    ],
  },
  {
    title: 'Location & Organisation',
    fields: [
      { key: 'areaOfPlant',    label: 'Area of Plant',   hide_if_empty: true },
      { key: 'department',     label: 'Department',      hide_if_empty: true },
      { key: 'addressLine1',   label: 'Address',         hide_if_empty: true },
      { key: 'addressLine2',   label: 'Address Line 2',  hide_if_empty: true },
      { key: 'suburb',         label: 'Suburb',          hide_if_empty: true },
      { key: 'city',           label: 'City',            hide_if_empty: true },
      { key: 'state',          label: 'State',           hide_if_empty: true },
      { key: 'postCode',       label: 'Post Code',       hide_if_empty: true },
    ],
  },
  {
    title: 'Purchase & Finance',
    fields: [
      { key: 'purchasedDateTime',    label: 'Purchase Date',      type: 'date',     hide_if_empty: true },
      { key: 'receivedDateTime',     label: 'Received Date',      type: 'date',     hide_if_empty: true },
      { key: 'purchaseCost',         label: 'Purchase Cost',      type: 'currency', hide_if_empty: true },
      { key: 'unitPrice',            label: 'Unit Price',         type: 'currency', hide_if_empty: true },
      { key: 'marketValue',          label: 'Market Value',       type: 'currency', hide_if_empty: true },
      { key: 'replacementValue',     label: 'Replacement Value',  type: 'currency', hide_if_empty: true },
      { key: 'salvageValue',         label: 'Salvage Value',      type: 'currency', hide_if_empty: true },
      { key: 'insuranceValue',       label: 'Insurance Value',    type: 'currency', hide_if_empty: true },
      { key: 'insurancePolicyNumber',label: 'Insurance Policy',   hide_if_empty: true },
      { key: 'insuranceRenewalDateTime', label: 'Insurance Renewal', type: 'date', hide_if_empty: true },
      { key: 'accountCode',          label: 'Account Code',       hide_if_empty: true },
      { key: 'orderNumber',          label: 'Order Number',       hide_if_empty: true },
    ],
  },
  {
    title: 'Warranty',
    fields: [
      { key: 'warrantyStartDateTime',    label: 'Warranty Start',    type: 'date', hide_if_empty: true },
      { key: 'warrantyFinishDateTime',   label: 'Warranty End',      type: 'date', hide_if_empty: true },
      { key: 'warrantySupplierContact',  label: 'Warranty Supplier', hide_if_empty: true },
      { key: 'warrantyPeriodMonths',     label: 'Warranty Months',   type: 'number', hide_if_empty: true },
    ],
  },
  {
    title: 'Compliance & Registration',
    fields: [
      { key: 'registrationNumber',             label: 'Registration No',     hide_if_empty: true },
      { key: 'registrationState',              label: 'Registration State',  hide_if_empty: true },
      { key: 'registrationDueDateTime',        label: 'Registration Due',    type: 'date', hide_if_empty: true },
      { key: 'licenseCode',                    label: 'License Code',        hide_if_empty: true },
      { key: 'machineryCertificateNumber',     label: 'Machinery Certificate', hide_if_empty: true },
      { key: 'machineryInspectionDoneDateTime',label: 'Last Inspection',     type: 'date', hide_if_empty: true },
      { key: 'machineryInspectionNextDueDateTime', label: 'Next Inspection', type: 'date', hide_if_empty: true },
    ],
  },
  {
    title: 'Criticality Flags',
    fields: [
      { key: 'isCriticalitySafety',        label: 'Safety Critical',        type: 'boolean' },
      { key: 'isCriticalityEnvironmental', label: 'Environmental Critical',  type: 'boolean' },
      { key: 'isCriticalityCompliance',    label: 'Compliance Critical',     type: 'boolean' },
      { key: 'isCriticalityQuality',       label: 'Quality Critical',        type: 'boolean' },
      { key: 'isCriticalityOperational',   label: 'Operational Critical',    type: 'boolean' },
      { key: 'isStandDown',                label: 'Stand Down',              type: 'boolean' },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'comment',     label: 'Comments',     type: 'multiline', hide_if_empty: true },
      { key: 'safetyNote',  label: 'Safety Note',  type: 'multiline', hide_if_empty: true },
    ],
  },
  {
    title: 'Audit',
    fields: [
      { key: 'createdDateTime',    label: 'Created',         type: 'datetime' },
      { key: 'modifiedDateTime',   label: 'Last Modified',   type: 'datetime' },
    ],
  },
];
