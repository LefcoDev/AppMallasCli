export interface ExcelRowData {
  [columnName: string]: any;
}

export class ExcelData {
  constructor(
    public readonly fileName: string,
    public readonly sheetName: string,
    public readonly headers: string[],
    public readonly rows: ExcelRowData[],
    public readonly totalRows: number
  ) {}

  static create(
    fileName: string,
    sheetName: string,
    headers: string[],
    rows: ExcelRowData[]
  ): ExcelData {
    return new ExcelData(fileName, sheetName, headers, rows, rows.length);
  }

  isEmpty(): boolean {
    return this.totalRows === 0;
  }

  getColumnData(columnName: string): any[] {
    return this.rows.map((row) => row[columnName]);
  }
}
