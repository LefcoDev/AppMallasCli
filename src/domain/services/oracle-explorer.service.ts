/**
 * Domain Service for Oracle Explorer Operations
 */
import {
  TableColumn,
  ValidationResult,
  DatabaseInfo,
} from "../repositories/oracle.repository";
import { ValueFormatOptions } from "./interactive-mapping.service";

export interface OracleExplorerService {
  // Table exploration
  exploreTableStructure(tableName: string): Promise<TableExplorationResult>;
  listAllTables(): Promise<string[]>;
  searchTables(pattern: string): Promise<string[]>;

  // Schema exploration
  listAvailableSchemas(): Promise<SchemaInfo[]>;
  searchTablesBySchema(
    schemaName: string,
    pattern?: string
  ): Promise<TableInfo[]>;

  // File generation
  generateInsertFile(
    tableName: string,
    records: InsertRecord[]
  ): Promise<string>;
  generateSampleInsert(tableName: string): Promise<string>;
  generateCtlFile(tableName: string): Promise<string>;
  generateExcelTemplate(tableName: string): Promise<string>;

  // Data validation
  validateExcelFile(
    filePath: string,
    tableName: string
  ): Promise<ExcelValidationResult>;
  bulkProcessExcelFiles(filePatterns: string[]): Promise<BulkProcessResult>;
  bulkProcessFilesWithMapping(
    options: BulkProcessOptions
  ): Promise<BulkProcessWithMappingResult>;
}

export interface TableExplorationResult {
  tableName: string;
  columns: TableColumn[];
  sampleData?: any[];
  totalRows?: number;
}

export interface SchemaInfo {
  schemaName: string;
  tableCount: number;
}

export interface TableInfo {
  tableName: string;
  numRows?: number;
  tablespace?: string;
}

export interface InsertRecord {
  [columnName: string]: any;
}

export interface ExcelValidationResult {
  isValid: boolean;
  errors: ExcelValidationError[];
  warnings: ExcelValidationWarning[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export interface ExcelValidationError {
  row: number;
  column: string;
  value: any;
  error: string;
  severity: "error" | "warning";
}

export interface ExcelValidationWarning {
  row: number;
  column: string;
  value: any;
  warning: string;
}

export interface BulkProcessResult {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  outputFiles: string[];
  summary: string;
}

export interface BulkProcessOptions {
  tableName: string;
  filePatterns: string[];
  processingMode: "single-file" | "multiple-files";
  sheetMode: "all-sheets" | "selected-sheets";
  selectedSheets?: string[];
  columnMapping?: ColumnMapping;
  predefinedMapping?: ColumnMapping; // Mapeo predefinido desde InteractiveMappingService
  valueFormatOptions?: ValueFormatOptions; // Opciones de formato (string vs number)
  fileTypes: ("xlsx" | "csv" | "txt")[];
}

export interface ColumnMapping {
  [excelHeader: string]: string | null; // null means map to NULL
}

export interface FileProcessingResult {
  fileName: string;
  filePath: string;
  fileType: "xlsx" | "csv" | "txt";
  sheets: SheetProcessingResult[];
  success: boolean;
  error?: string;
}

export interface SheetProcessingResult {
  sheetName: string;
  headers: string[];
  totalRows: number;
  processedRows: number;
  insertStatements: number;
  errors: string[];
  warnings: string[];
  columnMapping: ColumnMapping;
  processedData: InsertRecord[];
}

export interface BulkProcessWithMappingResult {
  tableName: string;
  tableStructure: TableColumn[];
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  outputFiles: string[];
  fileResults: FileProcessingResult[];
  globalColumnMapping: ColumnMapping;
  summary: string;
}

export interface DataFileInfo {
  filePath: string;
  fileName: string;
  fileType: "xlsx" | "csv" | "txt";
  sheets?: string[];
  headers?: string[];
}
