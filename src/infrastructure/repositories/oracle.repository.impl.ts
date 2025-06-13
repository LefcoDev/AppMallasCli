/**
 * Infra  async getTableColumns(tableName: string): Promise<TableColumn[]> {
    const columns = await this.oracleService.getTableColumns(tableName);
    return columns.map(col => ({
      columnName: col.columnName,
      dataType: col.dataType,
      nullable: col.nullable,
      dataLength: col.dataLength,
      dataPrecision: col.dataPrecision,
      dataScale: col.dataScale,
      defaultValue: undefined // No disponible en el servicio actual
    }));
  }pository Implementation for Oracle Operations
 */
import {
  OracleRepository,
  TableColumn,
  ValidationResult,
  DatabaseInfo,
  QueryResult,
} from "../../domain/repositories/oracle.repository";
import { OracleSafeDatabaseService } from "../database/oracle/oracle-safe-database.service";

export class OracleRepositoryImpl implements OracleRepository {
  constructor(private readonly oracleService: OracleSafeDatabaseService) {}

  async tableExists(tableName: string): Promise<boolean> {
    return this.oracleService.tableExists(tableName);
  }
  async getTableColumns(tableName: string): Promise<TableColumn[]> {
    const columns = await this.oracleService.getTableColumns(tableName);
    return columns.map((col) => ({
      columnName: col.columnName,
      dataType: col.dataType,
      nullable: col.nullable,
      dataLength: col.dataLength,
      dataPrecision: col.dataPrecision,
      dataScale: col.dataScale,
      defaultValue: undefined, // No disponible en el servicio actual
    }));
  }

  async getAllTables(): Promise<string[]> {
    return this.oracleService.getAllTables();
  }

  async getTableSample(tableName: string, limit: number = 5): Promise<any[]> {
    return this.oracleService.getTableSample(tableName, limit);
  }

  async validateDataForTable(
    tableName: string,
    data: Record<string, any>
  ): Promise<ValidationResult> {
    return this.oracleService.validateDataForTable(tableName, data);
  }
  async getCurrentSchema(): Promise<string> {
    // Acceder al operationsService a través del servicio público
    const info = await this.oracleService.getDatabaseInfo();
    return info.schema || "UNKNOWN";
  }

  async getDatabaseInfo(): Promise<DatabaseInfo> {
    return this.oracleService.getDatabaseInfo();
  }

  async testConnection(): Promise<boolean> {
    return this.oracleService.testConnection();
  }

  async initialize(): Promise<void> {
    return this.oracleService.initialize();
  }

  async close(): Promise<void> {
    return this.oracleService.close();
  }

  async executeReadOnlyQuery(sql: string, binds?: any[]): Promise<QueryResult> {
    return this.oracleService.executeReadOnlyQuery(sql, binds);
  }
}
