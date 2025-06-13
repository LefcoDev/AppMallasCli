/**
 * Servicio de conexión a Oracle usando el driver oracledb
 * Este servicio maneja la conexión directa a Oracle sin ORM
 */

import oracledb from "oracledb";
import { oracleConfig, OracleConfig } from "../../../config/oracle.config";

export class OracleConnectionService {
  private pool: oracledb.Pool | null = null;
  private config: OracleConfig;

  constructor(config?: OracleConfig) {
    this.config = config || oracleConfig;
  }

  /**
   * Inicializa el pool de conexiones
   */
  async initialize(): Promise<void> {
    try {
      console.log("🔄 Inicializando pool de conexiones Oracle...");

      this.pool = await oracledb.createPool({
        user: this.config.user,
        password: this.config.password,
        connectString: this.config.connectString,
        poolMin: this.config.poolMin,
        poolMax: this.config.poolMax,
        poolIncrement: this.config.poolIncrement,
        poolTimeout: this.config.poolTimeout,
        poolPingInterval: this.config.poolPingInterval,
        stmtCacheSize: this.config.stmtCacheSize,
        edition: this.config.edition,
        events: this.config.events,
        externalAuth: this.config.externalAuth,
        homogeneous: this.config.homogeneous,
        queueMax: this.config.queueMax,
        queueTimeout: this.config.queueTimeout,
      });

      console.log("✅ Pool de conexiones Oracle inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando pool Oracle:", error);
      throw error;
    }
  }

  /**
   * Obtiene una conexión del pool
   */
  async getConnection(): Promise<oracledb.Connection> {
    if (!this.pool) {
      throw new Error("Pool no inicializado. Ejecute initialize() primero.");
    }

    try {
      return await this.pool.getConnection();
    } catch (error) {
      console.error("❌ Error obteniendo conexión:", error);
      throw error;
    }
  }
  /**
   * Ejecuta una consulta SQL (solo lectura por defecto)
   */
  async executeQuery(
    sql: string,
    binds: oracledb.BindParameters = [],
    options: oracledb.ExecuteOptions = {}
  ): Promise<oracledb.Result<any>> {
    const connection = await this.getConnection();

    try {
      // Detectar si es una consulta de modificación
      const isModifyingQuery =
        /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)\s/i.test(
          sql.trim()
        );

      const defaultOptions: oracledb.ExecuteOptions = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        // Solo autoCommit para consultas SELECT, para modificaciones requiere confirmación explícita
        autoCommit: !isModifyingQuery,
        ...options,
      };

      return await connection.execute(sql, binds, defaultOptions);
    } finally {
      await connection.close();
    }
  }

  /**
   * Ejecuta múltiples consultas en una transacción
   */
  async executeTransaction(
    queries: Array<{
      sql: string;
      binds?: oracledb.BindParameters;
      options?: oracledb.ExecuteOptions;
    }>
  ): Promise<oracledb.Result<any>[]> {
    const connection = await this.getConnection();
    const results: oracledb.Result<any>[] = [];

    try {
      for (const query of queries) {
        const defaultOptions: oracledb.ExecuteOptions = {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          autoCommit: false,
          ...query.options,
        };

        const result = await connection.execute(
          query.sql,
          query.binds || [],
          defaultOptions
        );
        results.push(result);
      }

      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
    }
  }

  /**
   * Cierra el pool de conexiones
   */
  async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close(10); // Espera 10 segundos para cerrar conexiones
        this.pool = null;
        console.log("✅ Pool de conexiones Oracle cerrado");
      } catch (error) {
        console.error("❌ Error cerrando pool Oracle:", error);
        throw error;
      }
    }
  }
  /**
   * Verifica la conectividad con la base de datos (SOLO LECTURA)
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.executeReadOnlyQuery(
        "SELECT 1 AS test_value FROM DUAL"
      );
      return !!(result.rows && result.rows.length > 0);
    } catch (error) {
      console.error("❌ Error probando conexión Oracle:", error);
      return false;
    }
  }
  /**
   * Obtiene información de la versión de Oracle (SOLO LECTURA)
   */
  async getOracleVersion(): Promise<string> {
    try {
      const result = await this.executeReadOnlyQuery(
        "SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1"
      );
      return result.rows?.[0]?.BANNER || "Versión desconocida";
    } catch (error) {
      console.error("❌ Error obteniendo versión Oracle:", error);
      return "Error obteniendo versión";
    }
  }

  /**
   * Ejecuta una consulta de solo lectura (SELECT)
   */
  async executeReadOnlyQuery(
    sql: string,
    binds: oracledb.BindParameters = []
  ): Promise<oracledb.Result<any>> {
    // Validar que sea solo una consulta SELECT
    if (!/^\s*SELECT\s/i.test(sql.trim())) {
      throw new Error("executeReadOnlyQuery solo acepta consultas SELECT");
    }

    return this.executeQuery(sql, binds, { autoCommit: false });
  }

  /**
   * Ejecuta una consulta de escritura CON confirmación explícita
   */
  async executeWriteQuery(
    sql: string,
    binds: oracledb.BindParameters = [],
    options: { forceCommit?: boolean } = {}
  ): Promise<oracledb.Result<any>> {
    const connection = await this.getConnection();

    try {
      // Detectar tipo de operación
      const operationType = sql
        .trim()
        .match(/^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)\s/i)?.[1]
        ?.toUpperCase();

      if (!operationType) {
        throw new Error("No se detectó una operación de escritura válida");
      }

      console.log(`⚠️ OPERACIÓN DE ESCRITURA DETECTADA: ${operationType}`);
      console.log(
        `📝 SQL: ${sql.substring(0, 100)}${sql.length > 100 ? "..." : ""}`
      );

      if (!options.forceCommit) {
        throw new Error(
          `Operación ${operationType} requiere confirmación explícita. ` +
            `Use { forceCommit: true } para confirmar la operación.`
        );
      }

      const result = await connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: false,
      });

      // Commit manual después de confirmación
      await connection.commit();
      console.log(`✅ ${operationType} ejecutado y confirmado`);

      return result;
    } catch (error) {
      await connection.rollback();
      console.error(`❌ Error en operación de escritura:`, error);
      throw error;
    } finally {
      await connection.close();
    }
  }
}

// Instancia singleton
export const oracleConnection = new OracleConnectionService();
