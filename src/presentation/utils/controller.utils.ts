/**
 * Utilidades comunes para Controllers
 * Centraliza funcionalidad repetida entre controllers para evitar duplicación
 */
import { UserInterface } from "../interfaces/user-interface.interface";
import { ExcelFile } from "../../domain/entities/excel-file.entity";
import { format } from "date-fns";

export class ControllerUtils {
  /**
   * Método común para generar estadísticas de procesamiento
   */
  static generateProcessingStats(tableName: string): void {
    console.log(`� Estadísticas para tabla: ${tableName}`);
  }

  /**
   * Método común para mostrar opciones de procesamiento
   */
  static getProcessingOptions(files: ExcelFile[]) {
    return [
      {
        key: "all-files-all-sheets",
        label: "Procesar TODOS los archivos y TODAS las hojas",
        description: `Procesar ${files.length} archivos automáticamente con todas sus hojas`,
      },
      {
        key: "single-file-all-sheets",
        label: "Procesar UN archivo y TODAS sus hojas",
        description:
          "Seleccionar un archivo, luego procesar todas las hojas automáticamente",
      },
      {
        key: "single-file-single-sheet",
        label: "Procesar UN archivo y UNA hoja",
        description: "Selección manual - elegir archivo específico y hoja",
      },
    ];
  }

  /**
   * Método común para mostrar mensaje de error de Oracle Explorer
   */
  static async showOracleExplorerError(
    userInterface: UserInterface,
    error: unknown
  ): Promise<void> {
    await userInterface.display({
      type: "error",
      title: "Error Oracle Explorer",
      content: `Error iniciando Oracle Explorer: ${error}`,
    });
  }
  /**
   * Método común para iniciar Oracle Explorer
   */
  static async startOracleExplorer(
    outputPath: string,
    onError?: (error: unknown) => void
  ): Promise<void> {
    try {
      const { OracleExplorerControllerFactory } = await import(
        "../factories/oracle-explorer-controller.factory"
      );
      const oracleExplorer = OracleExplorerControllerFactory.create(outputPath);
      await oracleExplorer.start();
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error(`❌ Error iniciando Oracle Explorer: ${error}`);
      }
    }
  }
  /**
   * Método común para obtener configuraciones de mapeo estándar
   */
  static getStandardMappingConfigs() {
    return [
      {
        key: "smrarul",
        label: "SMRARUL - Reglas de Area Curriculum",
        tableName: "SMRARUL",
        columnMapping: {
          AREA: "AREA",
          MATERIA: "MATERIA",
          CURSO: "CURSO",
          NOMBRE_CORTO_DEL_CURSO: "NOMBRE_CORTO_DEL_CURSO",
        },
        requiredColumns: ["AREA", "MATERIA", "CURSO", "NOMBRE_CORTO_DEL_CURSO"],
      },
      {
        key: "smbarul",
        label: "SMBARUL - Base de Area Curriculum",
        tableName: "SMBARUL",
        columnMapping: {
          AREA: "AREA",
          MATERIA: "MATERIA",
          CURSO: "CURSO",
          NOMBRE_CORTO_DEL_CURSO: "NOMBRE_CORTO_DEL_CURSO",
        },
        requiredColumns: ["AREA", "MATERIA", "CURSO", "NOMBRE_CORTO_DEL_CURSO"],
      },
      {
        key: "smracaa",
        label: "SMRACAA - Area Curriculum Academico",
        tableName: "SMRACAA",
        columnMapping: {
          AREA: "AREA",
          MATERIA: "MATERIA",
          CURSO: "CURSO",
          NOMBRE_CORTO_DEL_CURSO: "NOMBRE_CORTO_DEL_CURSO",
        },
        requiredColumns: ["AREA", "MATERIA", "CURSO", "NOMBRE_CORTO_DEL_CURSO"],
      },
    ];
  }

  /**
   * Método común para mostrar menú principal básico
   */
  static getMainMenuOptions() {
    return [
      {
        key: "excel-mapper",
        label: "📊 Mapear Excel a Oracle",
        description: "Generar sentencias INSERT desde archivos Excel",
      },
      {
        key: "oracle-explorer",
        label: "🔍 Oracle Database Explorer",
        description: "Explorar base de datos y generar INSERTs manuales",
      },
      {
        key: "exit",
        label: "🚪 Salir",
        description: "Cerrar la aplicación",
      },
    ];
  }

  /**
   * Detecta el tipo de archivo basado en la extensión
   */
  static detectFileType(fileName: string): "excel" | "csv" | "txt" | "unknown" {
    const extension = fileName.toLowerCase().split(".").pop();

    switch (extension) {
      case "xlsx":
      case "xls":
      case "xlsm":
        return "excel";
      case "csv":
        return "csv";
      case "txt":
      case "tsv":
        return "txt";
      default:
        return "unknown";
    }
  }
  /**
   * Formatea el tamaño de archivo con unidades apropiadas (B, KB, MB, GB)
   */
  static formatFileSize(sizeInBytes: number): string {
    // Validación para prevenir undefined o valores inválidos
    if (!sizeInBytes || isNaN(sizeInBytes) || sizeInBytes < 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    // Asegurar que el resultado sea válido
    const formattedSize = size.toFixed(1);
    const unit = units[unitIndex];

    return `${formattedSize} ${unit}`;
  }
  /**
   * Valida si un nombre de tabla es válido
   */
  static validateTableName(tableName: string): boolean {
    return /^[A-Z_][A-Z0-9_]*$/i.test(tableName);
  }

  /**
   * Genera timestamp para nombres de archivo
   */
  static generateFileTimestamp(): string {
    return format(new Date(), "dd-MM-yyyy_HHmmss");
  }

  /**
   * Genera fecha legible para reportes y comentarios SQL
   */
  static generateReadableDateTime(): string {
    return format(new Date(), "dd/MM/yyyy HH:mm:ss");
  }

  /**
   * Formatea números con separadores de miles
   */
  static formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return "N/A";
    return value.toLocaleString();
  }

  /**
   * Formatea fecha para display en tablas
   */
  static formatDate(value: string | Date | null | undefined): string {
    if (!value) return "N/A";
    const date = new Date(value);
    return date.toLocaleDateString();
  }

  /**
   * Genera separador con equals (=) de ancho específico
   */
  static generateEqualsLine(width: number = 80): string {
    return "=".repeat(width);
  }

  /**
   * Genera separador con guiones (-) de ancho específico
   */
  static generateDashLine(width: number = 80): string {
    return "-".repeat(width);
  }

  /**
   * Imprime línea de separación con equals
   */
  static printEqualsLine(width: number = 80): void {
    console.log(this.generateEqualsLine(width));
  }

  /**
   * Imprime línea de separación con guiones
   */
  static printDashLine(width: number = 80): void {
    console.log(this.generateDashLine(width));
  }

  /**
   * Imprime título con líneas de separación
   */
  static printSectionTitle(title: string, width: number = 80): void {
    console.log(`\n${title}`);
    this.printEqualsLine(width);
  }

  /**
   * Imprime subtítulo con líneas de guiones
   */
  static printSubTitle(title: string, width: number = 80): void {
    console.log(`\n${title}`);
    this.printDashLine(width);
  }

  /**
   * Genera comentario SQL con separador de equals
   */
  static generateSQLComment(text: string, width: number = 64): string {
    const separator = "=".repeat(width);
    return `-- ${separator}\n-- ${text}\n-- ${separator}`;
  }

  /**
   * Genera comentario SQL simple con texto
   */
  static generateSQLSimpleComment(text: string): string {
    return `-- ${text}`;
  }

  /**
   * Genera bloque de comentario SQL completo
   */
  static generateSQLBlock(
    title: string,
    content: string[],
    width: number = 64
  ): string {
    const separator = "=".repeat(width);
    const lines = [
      `-- ${separator}`,
      `-- ${title}`,
      `-- ${separator}`,
      ...content.map((line) => `-- ${line}`),
      `-- ${separator}`,
    ];
    return lines.join("\n");
  }
}
