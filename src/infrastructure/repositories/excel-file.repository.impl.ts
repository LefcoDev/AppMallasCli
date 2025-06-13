import { ExcelFileRepository } from "../../domain/repositories/excel-file.repository";
import { ExcelData } from "../../domain/entities/excel-data.entity";
import { ExcelFile } from "../../domain/entities/excel-file.entity";
import { ExcelReaderConfig } from "../../config";
import { promises as fs } from "fs";
import path from "path";
import { ControllerUtils } from "../../presentation/utils/controller.utils";

export class ExcelFileRepositoryImpl implements ExcelFileRepository {
  constructor(private readonly excelReader: ExcelReaderConfig) {}

  async findExcelFiles(directoryPath: string): Promise<ExcelFile[]> {
    try {
      const files = await fs.readdir(directoryPath);
      const excelFiles: ExcelFile[] = [];

      for (const file of files) {
        if (this.isExcelFile(file)) {
          const filePath = path.join(directoryPath, file);
          const workbook = await this.excelReader.readFile(filePath);

          excelFiles.push(
            ExcelFile.create(filePath, file, workbook.sheetNames)
          );
        }
      }

      return excelFiles;
    } catch (error) {
      throw new Error(`Error finding Excel files: ${error}`);
    }
  }

  async readExcelData(
    filePath: string,
    sheetName?: string
  ): Promise<ExcelData[]> {
    try {
      const workbook = await this.excelReader.readFile(filePath);
      const fileName = path.basename(filePath);
      const excelDataList: ExcelData[] = [];

      const sheetsToProcess = sheetName ? [sheetName] : workbook.sheetNames;

      for (const sheet of sheetsToProcess) {
        const worksheet = workbook.getWorksheet(sheet);
        const rawData = this.excelReader.parseWorksheet(worksheet);

        if (rawData.length > 0) {
          const headers = rawData[0] as string[];
          const rows = rawData.slice(1).map((row) => {
            const rowData: { [key: string]: any } = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index] || "";
            });
            return rowData;
          });

          excelDataList.push(ExcelData.create(fileName, sheet, headers, rows));
        }
      }

      return excelDataList;
    } catch (error) {
      throw new Error(`Error reading Excel data: ${error}`);
    }
  }

  async validateExcelFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile() && this.isExcelFile(filePath);
    } catch {
      return false;
    }
  }
  private isExcelFile(fileName: string): boolean {
    return ControllerUtils.detectFileType(fileName) === "excel";
  }
}
