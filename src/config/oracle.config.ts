/**
 * Configuración de conexión a Oracle Database
 * Utiliza el driver oficial oracledb
 */

// Cargar variables de entorno desde .env
import "dotenv/config";

export interface OracleConfig {
  user: string;
  password: string;
  connectString: string;
  poolMin?: number;
  poolMax?: number;
  poolIncrement?: number;
  poolTimeout?: number;
  poolPingInterval?: number;
  stmtCacheSize?: number;
  edition?: string;
  events?: boolean;
  externalAuth?: boolean;
  homogeneous?: boolean;
  queueMax?: number;
  queueTimeout?: number;
}

/**
 * Configuración por defecto para Oracle
 */
export const defaultOracleConfig: Partial<OracleConfig> = {
  poolMin: parseInt(process.env.ORACLE_POOL_MIN || "1"),
  poolMax: parseInt(process.env.ORACLE_POOL_MAX || "10"),
  poolIncrement: parseInt(process.env.ORACLE_POOL_INCREMENT || "1"),
  poolTimeout: parseInt(process.env.ORACLE_POOL_TIMEOUT || "60"),
  poolPingInterval: parseInt(process.env.ORACLE_POOL_PING_INTERVAL || "60"),
  stmtCacheSize: parseInt(process.env.ORACLE_STMT_CACHE_SIZE || "30"),
  events: process.env.ORACLE_EVENTS === "true" || false,
  externalAuth: process.env.ORACLE_EXTERNAL_AUTH === "true" || false,
  homogeneous: process.env.ORACLE_HOMOGENEOUS !== "false",
  queueMax: parseInt(process.env.ORACLE_QUEUE_MAX || "500"),
  queueTimeout: parseInt(process.env.ORACLE_QUEUE_TIMEOUT || "60000"),
};

/**
 * Configuración de Oracle desde variables de entorno
 */
export const oracleConfig: OracleConfig = {
  user: process.env.ORACLE_USER || "hr",
  password: process.env.ORACLE_PASSWORD || "password",
  connectString: process.env.ORACLE_CONNECT_STRING || "localhost:1521/XE",
  ...defaultOracleConfig,
};

/**
 * Configuración para desarrollo/testing
 */
export const oracleDevConfig: OracleConfig = {
  user: process.env.ORACLE_DEV_USER || "dev_user",
  password: process.env.ORACLE_DEV_PASSWORD || "dev_password",
  connectString:
    process.env.ORACLE_DEV_CONNECT_STRING || "localhost:1521/XEPDB1",
  ...defaultOracleConfig,
};

/**
 * Obtiene la configuración según el entorno
 */
export function getOracleConfig(): OracleConfig {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "development":
    case "dev":
      return oracleDevConfig;
    case "production":
    case "prod":
      return oracleConfig;
    case "test":
      return {
        ...oracleDevConfig,
        poolMin: 1,
        poolMax: 5,
      };
    default:
      return oracleConfig;
  }
}

/**
 * Valida la configuración de Oracle
 */
export function validateOracleConfig(config: OracleConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validaciones obligatorias
  if (!config.user || config.user.trim() === "") {
    errors.push("Usuario de Oracle es requerido (ORACLE_USER)");
  }

  if (!config.password || config.password.trim() === "") {
    errors.push("Contraseña de Oracle es requerida (ORACLE_PASSWORD)");
  }

  if (!config.connectString || config.connectString.trim() === "") {
    errors.push(
      "Cadena de conexión Oracle es requerida (ORACLE_CONNECT_STRING)"
    );
  }

  // Validaciones de valores numéricos
  if (config.poolMin && config.poolMin < 0) {
    errors.push("poolMin debe ser mayor o igual a 0");
  }

  if (config.poolMax && config.poolMax < 1) {
    errors.push("poolMax debe ser mayor a 0");
  }

  if (config.poolMin && config.poolMax && config.poolMin > config.poolMax) {
    errors.push("poolMin no puede ser mayor que poolMax");
  }

  // Advertencias
  if (config.user === "hr" && config.password === "password") {
    warnings.push(
      "Usando credenciales por defecto - configura ORACLE_USER y ORACLE_PASSWORD"
    );
  }

  if (config.connectString === "localhost:1521/XE") {
    warnings.push(
      "Usando cadena de conexión por defecto - configura ORACLE_CONNECT_STRING"
    );
  }

  if (config.poolMax && config.poolMax > 50) {
    warnings.push("poolMax muy alto - puede causar problemas de recursos");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export default oracleConfig;
