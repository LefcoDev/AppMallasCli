/**
 * Servicio de operaciones Oracle SEGURAS
 * Solo permite operaciones de lectura por defecto
 * Las operaciones de escritura requieren confirmación explícita
 */

import { OracleConnectionService } from "./oracle-connection.service";

export class OracleSafeOperationsService {
  constructor(private connectionService: OracleConnectionService) {}
  // =================================================================
  // OPERACIONES DE SOLO LECTURA (SEGURAS)
  // =================================================================

  /**
   * Verifica si una tabla existe (SOLO LECTURA)
   * Soporta formato ESQUEMA.TABLA y tabla simple
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const upperTableName = tableName.toUpperCase().trim();

      // Check if it's schema-qualified (SCHEMA.TABLE)
      if (upperTableName.includes(".")) {
        const [schema, table] = upperTableName.split(".");
        if (!schema || !table) {
          console.error(`❌ Formato inválido de tabla: ${tableName}`);
          return false;
        }

        // Use ALL_TABLES for cross-schema queries
        const sql = `
          SELECT COUNT(*) AS table_count 
          FROM ALL_TABLES 
          WHERE OWNER = :1 AND TABLE_NAME = :2
        `;

        const result = await this.connectionService.executeReadOnlyQuery(sql, [
          schema,
          table,
        ]);
        const count = result.rows?.[0]?.TABLE_COUNT || 0;
        return count > 0;
      } else {
        // Use USER_TABLES for current schema tables
        const sql = `
          SELECT COUNT(*) AS table_count 
          FROM USER_TABLES 
          WHERE TABLE_NAME = :1
        `;

        const result = await this.connectionService.executeReadOnlyQuery(sql, [
          upperTableName,
        ]);
        const count = result.rows?.[0]?.TABLE_COUNT || 0;
        return count > 0;
      }
    } catch (error) {
      console.error(`❌ Error verificando tabla ${tableName}:`, error);
      return false;
    }
  }
  /**
   * Obtiene las columnas de una tabla (SOLO LECTURA)
   * Soporta formato ESQUEMA.TABLA y tabla simple
   */
  async getTableColumns(tableName: string): Promise<
    Array<{
      columnName: string;
      dataType: string;
      nullable: string;
      dataLength?: number;
      dataPrecision?: number;
      dataScale?: number;
    }>
  > {
    try {
      const upperTableName = tableName.toUpperCase().trim();

      // Check if it's schema-qualified (SCHEMA.TABLE)
      if (upperTableName.includes(".")) {
        const [schema, table] = upperTableName.split(".");
        if (!schema || !table) {
          console.error(`❌ Formato inválido de tabla: ${tableName}`);
          return [];
        }

        // Use ALL_TAB_COLUMNS for cross-schema queries
        const sql = `
          SELECT 
            COLUMN_NAME as "columnName",
            DATA_TYPE as "dataType", 
            NULLABLE as "nullable",
            DATA_LENGTH as "dataLength",
            DATA_PRECISION as "dataPrecision",
            DATA_SCALE as "dataScale"
          FROM ALL_TAB_COLUMNS 
          WHERE OWNER = :1 AND TABLE_NAME = :2
          ORDER BY COLUMN_ID
        `;

        const result = await this.connectionService.executeReadOnlyQuery(sql, [
          schema,
          table,
        ]);
        return result.rows || [];
      } else {
        // Use USER_TAB_COLUMNS for current schema tables
        const sql = `
          SELECT 
            COLUMN_NAME as "columnName",
            DATA_TYPE as "dataType", 
            NULLABLE as "nullable",
            DATA_LENGTH as "dataLength",
            DATA_PRECISION as "dataPrecision",
            DATA_SCALE as "dataScale"
          FROM USER_TAB_COLUMNS 
          WHERE TABLE_NAME = :1
          ORDER BY COLUMN_ID
        `;

        const result = await this.connectionService.executeReadOnlyQuery(sql, [
          upperTableName,
        ]);
        return result.rows || [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo columnas de ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Obtiene información del esquema actual (SOLO LECTURA)
   */
  async getCurrentSchema(): Promise<string> {
    try {
      const result = await this.connectionService.executeReadOnlyQuery(
        "SELECT SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AS schema_name FROM DUAL"
      );
      return result.rows?.[0]?.SCHEMA_NAME || "UNKNOWN";
    } catch (error) {
      console.error("❌ Error obteniendo esquema actual:", error);
      return "ERROR";
    }
  }

  /**
   * Obtiene todas las tablas del esquema actual (SOLO LECTURA)
   */
  async getAllTables(): Promise<string[]> {
    try {
      const sql = `
        SELECT TABLE_NAME as "tableName"
        FROM USER_TABLES 
        ORDER BY TABLE_NAME
      `;

      const result = await this.connectionService.executeReadOnlyQuery(sql);
      return result.rows?.map((row) => row.tableName) || [];
    } catch (error) {
      console.error("❌ Error obteniendo tablas:", error);
      return [];
    }
  }
  /**
   * Obtiene el conteo de registros de una tabla (SOLO LECTURA)
   * Soporta formato ESQUEMA.TABLA y tabla simple
   */
  async getTableRowCount(tableName: string): Promise<number> {
    try {
      const upperTableName = tableName.toUpperCase().trim();
      // The table name can be used directly in SQL as it handles schema qualification
      const sql = `SELECT COUNT(*) AS row_count FROM ${upperTableName}`;
      const result = await this.connectionService.executeReadOnlyQuery(sql);
      return result.rows?.[0]?.ROW_COUNT || 0;
    } catch (error) {
      console.error(`❌ Error obteniendo conteo de ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Obtiene una muestra de datos de una tabla (SOLO LECTURA)
   * Soporta formato ESQUEMA.TABLA y tabla simple
   */
  async getTableSample(tableName: string, limit: number = 5): Promise<any[]> {
    try {
      const upperTableName = tableName.toUpperCase().trim();
      // The table name can be used directly in SQL as it handles schema qualification
      const sql = `SELECT * FROM ${upperTableName} WHERE ROWNUM <= :1`;
      const result = await this.connectionService.executeReadOnlyQuery(sql, [
        limit,
      ]);
      return result.rows || [];
    } catch (error) {
      console.error(`❌ Error obteniendo muestra de ${tableName}:`, error);
      return [];
    }
  }

  // =================================================================
  // OPERACIONES DE ESCRITURA (REQUIEREN CONFIRMACIÓN EXPLÍCITA)
  // =================================================================

  /**
   * Ejecuta un INSERT CON confirmación explícita
   */
  async executeInsertWithConfirmation(
    tableName: string,
    data: Record<string, any>,
    options: { confirmed: boolean } = { confirmed: false }
  ): Promise<number> {
    if (!options.confirmed) {
      throw new Error(
        `OPERACIÓN DE ESCRITURA BLOQUEADA: ` +
          `Para insertar en ${tableName}, use { confirmed: true }. ` +
          `Datos a insertar: ${JSON.stringify(data, null, 2)}`
      );
    }

    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns
        .map((_, index) => `:${index + 1}`)
        .join(", ");

      const sql = `INSERT INTO ${tableName} (${columns.join(
        ", "
      )}) VALUES (${placeholders})`;

      console.log(`⚠️ EJECUTANDO INSERT EN ${tableName}`);
      console.log(`📝 Datos:`, data);

      const result = await this.connectionService.executeWriteQuery(
        sql,
        values,
        { forceCommit: true }
      );

      console.log(
        `✅ INSERT exitoso en ${tableName}: ${result.rowsAffected} filas afectadas`
      );
      return result.rowsAffected || 0;
    } catch (error) {
      console.error(`❌ Error ejecutando INSERT en ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Ejecuta múltiples INSERTs CON confirmación explícita
   */
  async executeBatchInsertsWithConfirmation(
    tableName: string,
    dataArray: Array<Record<string, any>>,
    options: { confirmed: boolean } = { confirmed: false }
  ): Promise<number> {
    if (!options.confirmed) {
      throw new Error(
        `OPERACIÓN DE ESCRITURA MASIVA BLOQUEADA: ` +
          `Para insertar ${dataArray.length} registros en ${tableName}, use { confirmed: true }. ` +
          `Primeros registros: ${JSON.stringify(
            dataArray.slice(0, 2),
            null,
            2
          )}`
      );
    }

    if (dataArray.length === 0) return 0;

    try {
      console.log(`⚠️ EJECUTANDO BATCH INSERT EN ${tableName}`);
      console.log(`📊 Cantidad de registros: ${dataArray.length}`);
      console.log(`📝 Ejemplo de datos:`, dataArray[0]);

      const columns = Object.keys(dataArray[0]);
      const placeholders = columns
        .map((_, index) => `:${index + 1}`)
        .join(", ");

      const sql = `INSERT INTO ${tableName} (${columns.join(
        ", "
      )}) VALUES (${placeholders})`;

      const queries = dataArray.map((data) => ({
        sql,
        binds: Object.values(data),
      }));

      const results = await this.connectionService.executeTransaction(queries);
      const totalInserted = results.reduce(
        (total, result) => total + (result.rowsAffected || 0),
        0
      );

      console.log(
        `✅ BATCH INSERT exitoso en ${tableName}: ${totalInserted} filas insertadas`
      );
      return totalInserted;
    } catch (error) {
      console.error(`❌ Error ejecutando batch INSERT en ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Crea una tabla CON confirmación explícita
   */
  async createTableWithConfirmation(
    tableName: string,
    ddlSql: string,
    options: { confirmed: boolean } = { confirmed: false }
  ): Promise<void> {
    if (!options.confirmed) {
      throw new Error(
        `OPERACIÓN DDL BLOQUEADA: ` +
          `Para crear la tabla ${tableName}, use { confirmed: true }. ` +
          `DDL: ${ddlSql.substring(0, 200)}...`
      );
    }

    try {
      console.log(`⚠️ CREANDO TABLA ${tableName}`);
      console.log(`📝 DDL:`, ddlSql);

      await this.connectionService.executeWriteQuery(ddlSql, [], {
        forceCommit: true,
      });

      console.log(`✅ Tabla ${tableName} creada exitosamente`);
    } catch (error) {
      console.error(`❌ Error creando tabla ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Trunca una tabla CON confirmación explícita
   */
  async truncateTableWithConfirmation(
    tableName: string,
    options: { confirmed: boolean } = { confirmed: false }
  ): Promise<void> {
    if (!options.confirmed) {
      throw new Error(
        `OPERACIÓN DESTRUCTIVA BLOQUEADA: ` +
          `Para truncar la tabla ${tableName}, use { confirmed: true }. ` +
          `ADVERTENCIA: Esto eliminará TODOS los datos de la tabla.`
      );
    }

    try {
      // Obtener conteo actual antes de truncar
      const currentCount = await this.getTableRowCount(tableName);

      console.log(`⚠️ TRUNCANDO TABLA ${tableName}`);
      console.log(`📊 Registros que se eliminarán: ${currentCount}`);

      await this.connectionService.executeWriteQuery(
        `TRUNCATE TABLE ${tableName}`,
        [],
        { forceCommit: true }
      );

      console.log(
        `✅ Tabla ${tableName} truncada exitosamente (${currentCount} registros eliminados)`
      );
    } catch (error) {
      console.error(`❌ Error truncando tabla ${tableName}:`, error);
      throw error;
    }
  }

  // =================================================================
  // OPERACIONES DE VALIDACIÓN (SOLO LECTURA)
  // =================================================================

  /**
   * Valida que los datos coincidan con la estructura de la tabla (SOLO LECTURA)
   */
  async validateDataForTable(
    tableName: string,
    data: Record<string, any>
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Verificar que la tabla existe
      const tableExists = await this.tableExists(tableName);
      if (!tableExists) {
        errors.push(`La tabla ${tableName} no existe`);
        return { isValid: false, errors, warnings };
      }

      // Obtener columnas de la tabla
      const columns = await this.getTableColumns(tableName);
      const columnMap = new Map(
        columns.map((col) => [col.columnName.toUpperCase(), col])
      );

      // Validar cada campo de datos
      for (const [fieldName, value] of Object.entries(data)) {
        const fieldNameUpper = fieldName.toUpperCase();
        const column = columnMap.get(fieldNameUpper);

        if (!column) {
          warnings.push(
            `La columna ${fieldName} no existe en la tabla ${tableName}`
          );
          continue;
        }

        // Validar nulos
        if (value === null || value === undefined) {
          if (column.nullable === "N") {
            errors.push(`La columna ${fieldName} no puede ser nula`);
          }
          continue;
        }

        // Validar tipos de datos básicos
        if (column.dataType === "VARCHAR2" && typeof value !== "string") {
          warnings.push(
            `La columna ${fieldName} espera texto, recibió ${typeof value}`
          );
        } else if (column.dataType === "NUMBER" && typeof value !== "number") {
          warnings.push(
            `La columna ${fieldName} espera número, recibió ${typeof value}`
          );
        }

        // Validar longitud para VARCHAR2
        if (column.dataType === "VARCHAR2" && typeof value === "string") {
          if (column.dataLength && value.length > column.dataLength) {
            errors.push(
              `La columna ${fieldName} excede la longitud máxima (${column.dataLength})`
            );
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Error validando datos: ${error}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Genera un reporte de estado de tabla (SOLO LECTURA)
   */
  async generateTableReport(tableName: string): Promise<{
    exists: boolean;
    rowCount?: number;
    columnCount?: number;
    columns?: Array<{ name: string; type: string; nullable: boolean }>;
    sample?: any[];
  }> {
    try {
      const exists = await this.tableExists(tableName);

      if (!exists) {
        return { exists: false };
      }

      const [rowCount, columns, sample] = await Promise.all([
        this.getTableRowCount(tableName),
        this.getTableColumns(tableName),
        this.getTableSample(tableName, 3),
      ]);

      return {
        exists: true,
        rowCount,
        columnCount: columns.length,
        columns: columns.map((col) => ({
          name: col.columnName,
          type: col.dataType,
          nullable: col.nullable === "Y",
        })),
        sample,
      };
    } catch (error) {
      console.error(`❌ Error generando reporte de ${tableName}:`, error);
      return { exists: false };
    }
  }
}
