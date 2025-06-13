import * as XLSX from "xlsx";

export interface ExcelReaderConfig {
  readFile(filePath: string): Promise<ExcelWorkbook>;
  parseWorksheet(worksheet: any): ExcelRow[];
}

export interface ExcelWorkbook {
  sheetNames: string[];
  getWorksheet(sheetName: string): any;
}

export interface ExcelRow {
  [key: string]: any;
}

export class XlsxReaderConfig implements ExcelReaderConfig {
  async readFile(filePath: string): Promise<ExcelWorkbook> {
    try {
      const workbook = XLSX.readFile(filePath);

      return {
        sheetNames: workbook.SheetNames,
        getWorksheet: (sheetName: string) => workbook.Sheets[sheetName],
      };
    } catch (error) {
      throw new Error(`Error reading Excel file: ${error}`);
    }
  }

  parseWorksheet(worksheet: any): ExcelRow[] {
    try {
      return XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });
    } catch (error) {
      throw new Error(`Error parsing worksheet: ${error}`);
    }
  }
}

// Factory para crear la instancia
export const createExcelReader = (): ExcelReaderConfig => {
  return new XlsxReaderConfig();
};
