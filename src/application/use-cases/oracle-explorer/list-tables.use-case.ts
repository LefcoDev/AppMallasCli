/**
 * Use Case: List Tables
 * Responsabilidad: Listar y buscar tablas
 */
import {
  OracleExplorerService,
  SchemaInfo,
  TableInfo,
} from "../../../domain/services/oracle-explorer.service";

export interface ListTablesRequest {
  searchPattern?: string;
  schemaName?: string;
  limit?: number;
}

export interface ListTablesResponse {
  success: boolean;
  tables?: string[];
  totalFound?: number;
  searchPattern?: string;
  error?: string;
}

export interface ListSchemasResponse {
  success: boolean;
  schemas?: SchemaInfo[];
  totalFound?: number;
  error?: string;
}

export interface SearchTablesBySchemaRequest {
  schemaName: string;
  searchPattern?: string;
}

export interface SearchTablesBySchemaResponse {
  success: boolean;
  tables?: TableInfo[];
  totalFound?: number;
  schemaName?: string;
  searchPattern?: string;
  error?: string;
}

export class ListTablesUseCase {
  constructor(private readonly oracleExplorerService: OracleExplorerService) {}

  async listAllTables(
    request: ListTablesRequest = {}
  ): Promise<ListTablesResponse> {
    try {
      const { searchPattern, limit = 1000 } = request;

      let tables: string[];

      if (searchPattern?.trim()) {
        tables = await this.oracleExplorerService.searchTables(
          searchPattern.trim()
        );
      } else {
        tables = await this.oracleExplorerService.listAllTables();
      }

      // Aplicar límite si se especifica
      if (limit > 0 && tables.length > limit) {
        tables = tables.slice(0, limit);
      }

      return {
        success: true,
        tables,
        totalFound: tables.length,
        searchPattern,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error listando tablas: ${error}`,
      };
    }
  }

  async listAvailableSchemas(): Promise<ListSchemasResponse> {
    try {
      const schemas = await this.oracleExplorerService.listAvailableSchemas();

      return {
        success: true,
        schemas,
        totalFound: schemas.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error listando esquemas: ${error}`,
      };
    }
  }

  async searchTablesBySchema(
    request: SearchTablesBySchemaRequest
  ): Promise<SearchTablesBySchemaResponse> {
    try {
      const { schemaName, searchPattern } = request;

      if (!schemaName?.trim()) {
        return {
          success: false,
          error: "Nombre de esquema requerido",
        };
      }

      const tables = await this.oracleExplorerService.searchTablesBySchema(
        schemaName.toUpperCase().trim(),
        searchPattern?.trim()
      );

      return {
        success: true,
        tables,
        totalFound: tables.length,
        schemaName: schemaName.toUpperCase(),
        searchPattern,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error buscando tablas en esquema: ${error}`,
      };
    }
  }
}
