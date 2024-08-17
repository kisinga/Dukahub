export interface TableColumn {
    key: string;
    label: string;
    type: 'text' | 'number' | 'image' | 'editable';
}