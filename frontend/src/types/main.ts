export interface TableColumn {
    key: string;
    label: string;
    type: 'text' | 'number' | 'image' | 'editable';
}

export interface FinancialTableData {
    id: string;
    account: string;
    accountName: string;
    accountSubText: string;
    openingBal: number;
    closingBal: number;
}