/**
 * Servicio principal de Oracle SEGURO
 * Por defecto solo permite operaciones de lectura
 * Las operaciones de escritura requieren confirmación explícita
 */

import {
  OracleConnectionService,
  oracleConnection,
} from "./oracle-connection.service";
import { OracleSafeOperationsService } from "./oracle-safe-operations.service";
import { oracleConfig, OracleConfig } from "../../../config/oracle.config";

export class OracleSafeDatabaseService {
  private connectionService: OracleConnectionService;
  private operationsService: OracleSafeOperationsService;
  private isInitialized: boolean = false;

  constructor(config?: OracleConfig) {
    this.connectionService = config
      ? new OracleConnectionService(config)
      : oracleConnection;
    this.operationsService = new OracleSafeOperationsService(
      this.connectionService
    );
  }

  /**
   * Inicializa el servicio de Oracle (SOLO LECTURA)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("⚠️ Oracle Safe Database Service ya está inicializado");
      return;
    }

    try {
      console.log("🔒 Inicializando Oracle Safe Database Service...");
      console.log(
        "📋 MODO SEGURO: Solo operaciones de lectura permitidas por defecto"
      );

      await this.connectionService.initialize();

      // Verificar conectividad con consulta de solo lectura
      const isConnected = await this.connectionService.testConnection();
      if (!isConnected) {
        throw new Error("No se pudo establecer conexión con Oracle");
      }

      // Obtener información de la base de datos (solo lectura)
      const version = await this.connectionService.getOracleVersion();
      const schema = await this.operationsService.getCurrentSchema();

      console.log(`✅ Conectado a Oracle: ${version}`);
      console.log(`📋 Esquema actual: ${schema}`);
      console.log(
        `🔒 Modo seguro activado: Operaciones de escritura requieren confirmación explícita`
      );

      this.isInitialized = true;
      console.log("🎉 Oracle Safe Database Service inicializado correctamente");
    } catch (error) {
      console.error(
        "❌ Error inicializando Oracle Safe Database Service:",
        error
      );
      throw error;
    }
  }

  /**
   * Cierra las conexiones y limpia recursos
   */
  async close(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await this.connectionService.close();
      this.isInitialized = false;
      console.log("✅ Oracle Safe Database Service cerrado correctamente");
    } catch (error) {
      console.error("❌ Error cerrando Oracle Safe Database Service:", error);
      throw error;
    }
  }

  /**
   * Verifica si el servicio está inicializado
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "Oracle Safe Database Service no está inicializado. Ejecute initialize() primero."
      );
    }
  }

  // =================================================================
  // MÉTODOS DE SOLO LECTURA (SEGUROS)
  // =================================================================

  /**
   * Ejecuta una consulta de solo lectura
   */
  async executeReadOnlyQuery(sql: string, binds?: any[]) {
    this.ensureInitialized();
    return this.connectionService.executeReadOnlyQuery(sql, binds);
  }

  /**
   * Prueba la conexión a la base de datos (SOLO LECTURA)
   */
  async testConnection(): Promise<boolean> {
    this.ensureInitialized();
    return this.connectionService.testConnection();
  }

  /**
   * Verifica si una tabla existe (SOLO LECTURA)
   */
  async tableExists(tableName: string): Promise<boolean> {
    this.ensureInitialized();
    return this.operationsService.tableExists(tableName);
  }

  /**
   * Obtiene las columnas de una tabla (SOLO LECTURA)
   */
  async getTableColumns(tableName: string) {
    this.ensureInitialized();
    return this.operationsService.getTableColumns(tableName);
  }

  /**
   * Obtiene todas las tablas del esquema (SOLO LECTURA)
   */
  async getAllTables(): Promise<string[]> {
    this.ensureInitialized();
    return this.operationsService.getAllTables();
  }

  /**
   * Obtiene el conteo de registros de una tabla (SOLO LECTURA)
   */
  async getTableRowCount(tableName: string): Promise<number> {
    this.ensureInitialized();
    return this.operationsService.getTableRowCount(tableName);
  }

  /**
   * Obtiene una muestra de datos de una tabla (SOLO LECTURA)
   */
  async getTableSample(tableName: string, limit: number = 5): Promise<any[]> {
    this.ensureInitialized();
    return this.operationsService.getTableSample(tableName, limit);
  }

  /**
   * Valida datos contra la estructura de la tabla (SOLO LECTURA)
   */
  async validateDataForTable(tableName: string, data: Record<string, any>) {
    this.ensureInitialized();
    return this.operationsService.validateDataForTable(tableName, data);
  }

  /**
   * Genera un reporte de estado de tabla (SOLO LECTURA)
   */
  async generateTableReport(tableName: string) {
    this.ensureInitialized();
    return this.operationsService.generateTableReport(tableName);
  }

  // =================================================================
  // MÉTODOS DE ESCRITURA (REQUIEREN CONFIRMACIÓN EXPLÍCITA)
  // =================================================================

  /**
   * Ejecuta un INSERT CON confirmación explícita
   * DEBE usarse con { confirmed: true }
   */
  async executeInsert(
    tableName: string,
    data: Record<string, any>,
    options: { confirmed: boolean } = { confirmed: false }
  ): Promise<number> {
    this.ensureInitialized();
    return this.operationsService.executeInsertWithConfirmation(
      tableName,
      data,
      options
    );
  }

  /**
   * Ejecuta múltiples INSERTs CON confirmación explícita
   * DEBE usarse con { confirmed: true }
   */
  async executeBatchInserts(
    tableName: string,
    dataArray: Array<Record<string, any>>,
    options: { confirmed: boolean } = { confirmed: false }
  ): Promise<number> {
    this.ensureInitialized();
    return this.operationsService.executeBatchInsertsWithConfirmation(
      tableName,
      dataArray,
      options
    );
  }

  /**
   * Crea una tabla CON confirmación explícita
   * DEBE usarse con { confirmed: true }
   */
  async createTable(
    tableName: string,
    ddlSql: string,
    options: { confirmed: boolean } = { confirmed: false }
  ): Promise<void> {
    this.ensureInitialized();
    return this.operationsService.createTableWithConfirmation(
      tableName,
      ddlSql,
      options
    );
  }

  /**
   * Trunca una tabla CON confirmación explícita
   * DEBE usarse con { confirmed: true }
   */
  async truncateTable(
    tableName: string,
    options: { confirmed: boolean } = { confirmed: false }
  ): Promise<void> {
    this.ensureInitialized();
    return this.operationsService.truncateTableWithConfirmation(
      tableName,
      options
    );
  }

  // =================================================================
  // MÉTODOS DE INFORMACIÓN (SOLO LECTURA)
  // =================================================================

  /**
   * Obtiene información completa de la base de datos (SOLO LECTURA)
   */
  async getDatabaseInfo(): Promise<{
    version: string;
    schema: string;
    tableCount: number;
    isConnected: boolean;
  }> {
    this.ensureInitialized();

    try {
      const [version, schema, tables, isConnected] = await Promise.all([
        this.connectionService.getOracleVersion(),
        this.operationsService.getCurrentSchema(),
        this.operationsService.getAllTables(),
        this.connectionService.testConnection(),
      ]);

      return {
        version,
        schema,
        tableCount: tables.length,
        isConnected,
      };
    } catch (error) {
      console.error(
        "❌ Error obteniendo información de la base de datos:",
        error
      );
      throw error;
    }
  }

  /**
   * Genera un reporte de estado de las tablas del proyecto (SOLO LECTURA)
   */
  async generateTableStatusReport(tableNames: string[]): Promise<{
    tablesFound: string[];
    tablesNotFound: string[];
    tableDetails: Array<{
      name: string;
      exists: boolean;
      rowCount?: number;
      columnCount?: number;
      sample?: any[];
    }>;
  }> {
    this.ensureInitialized();

    const tablesFound: string[] = [];
    const tablesNotFound: string[] = [];
    const tableDetails: Array<{
      name: string;
      exists: boolean;
      rowCount?: number;
      columnCount?: number;
      sample?: any[];
    }> = [];

    for (const tableName of tableNames) {
      try {
        const report = await this.generateTableReport(tableName);

        if (report.exists) {
          tablesFound.push(tableName);
          tableDetails.push({
            name: tableName,
            exists: true,
            rowCount: report.rowCount,
            columnCount: report.columnCount,
            sample: report.sample,
          });
        } else {
          tablesNotFound.push(tableName);
          tableDetails.push({
            name: tableName,
            exists: false,
          });
        }
      } catch (error) {
        console.error(`❌ Error verificando tabla ${tableName}:`, error);
        tablesNotFound.push(tableName);
        tableDetails.push({
          name: tableName,
          exists: false,
        });
      }
    }

    return {
      tablesFound,
      tablesNotFound,
      tableDetails,
    };
  }

  // =================================================================
  // MÉTODOS DE AYUDA PARA OPERACIONES SEGURAS
  // =================================================================

  /**
   * Muestra cómo usar las operaciones de escritura de forma segura
   */
  showWriteOperationHelp(): void {
    console.log(`
🔒 ORACLE SAFE DATABASE - GUÍA DE USO

📖 OPERACIONES DE LECTURA (Siempre permitidas):
   • tableExists('TABLA')
   • getTableColumns('TABLA') 
   • getAllTables()
   • getTableRowCount('TABLA')
   • getTableSample('TABLA', 5)
   • validateDataForTable('TABLA', data)
   • executeReadOnlyQuery('SELECT * FROM TABLA')

⚠️ OPERACIONES DE ESCRITURA (Requieren confirmación):
   • executeInsert('TABLA', data, { confirmed: true })
   • executeBatchInserts('TABLA', dataArray, { confirmed: true })
   • createTable('TABLA', ddlSql, { confirmed: true })
   • truncateTable('TABLA', { confirmed: true })

💡 EJEMPLO DE USO SEGURO:
   // ❌ Esto fallará (sin confirmación)
   await db.executeInsert('USERS', userData);

   // ✅ Esto funcionará (con confirmación)
   await db.executeInsert('USERS', userData, { confirmed: true });

🛡️ PROPÓSITO: Prevenir operaciones accidentales de escritura en base de datos.
`);
  }
}

// Instancia singleton para uso general (MODO SEGURO)
export const oracleSafeDatabase = new OracleSafeDatabaseService();
