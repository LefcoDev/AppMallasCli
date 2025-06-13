/**
 * Domain Repository for Oracle Operations
 */
export interface OracleRepository {
  // Table operations
  tableExists(tableName: string): Promise<boolean>;
  getTableColumns(tableName: string): Promise<TableColumn[]>;
  getAllTables(): Promise<string[]>;
  getTableSample(tableName: string, limit?: number): Promise<any[]>;

  // Data validation
  validateDataForTable(
    tableName: string,
    data: Record<string, any>
  ): Promise<ValidationResult>;

  // Schema operations
  getCurrentSchema(): Promise<string>;
  getDatabaseInfo(): Promise<DatabaseInfo>;

  // Connection management
  testConnection(): Promise<boolean>;
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Read-only queries
  executeReadOnlyQuery(sql: string, binds?: any[]): Promise<QueryResult>;
}

export interface TableColumn {
  columnName: string;
  dataType: string;
  nullable: string;
  dataLength?: number;
  dataPrecision?: number;
  dataScale?: number;
  defaultValue?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DatabaseInfo {
  version: string;
  schema: string;
  tableCount: number;
  isConnected: boolean;
}

export interface QueryResult {
  rows?: any[];
  rowsAffected?: number;
  metadata?: any[];
}
