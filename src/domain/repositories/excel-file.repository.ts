import { ExcelFile } from "../entities/excel-file.entity";
import { ExcelData } from "../entities/excel-data.entity";

export interface ExcelFileRepository {
  findExcelFiles(directoryPath: string): Promise<ExcelFile[]>;
  readExcelData(filePath: string, sheetName?: string): Promise<ExcelData[]>;
  validateExcelFile(filePath: string): Promise<boolean>;
}
