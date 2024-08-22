export interface TableColumn {
    key: string;
    label: string;
    type: 'text' | 'number' | 'image' | 'editable';
}

export interface FinancialTableData {
    id: string; //This field maps the original account id
    accountIconURL: string;
    existingRecordID?: string;
    accountName: string;
    accountSubText: string;
    openingBal: number;
    closingBal: number;
}