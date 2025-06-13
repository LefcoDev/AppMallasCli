/**
 * Oracle Explorer Display Service
 * Responsabilidad: Formatear y mostrar información al usuario
 */
import { CLIInterface } from "../cli/interfaces/cli.interface";
import {
  TableExplorationResult,
  SchemaInfo,
  TableInfo,
  ExcelValidationResult,
  BulkProcessResult,
} from "../../domain/services/oracle-explorer.service";
import { TableColumn } from "../../domain/repositories/oracle.repository";
import { ControllerUtils } from "../utils/controller.utils";

export class OracleExplorerDisplayService {
  constructor(private readonly cliService: CLIInterface) {}
  displayTableStructure(result: TableExplorationResult): void {
    const { tableName, columns, sampleData, totalRows } = result;

    console.log(`\n📊 Estructura de la tabla: ${tableName}`);
    ControllerUtils.printEqualsLine();

    this.displayColumns(columns);

    if (sampleData && sampleData.length > 0) {
      console.log("\n📋 Datos de muestra:");
      ControllerUtils.printDashLine();
      this.displaySampleData(sampleData);
    }

    if (totalRows !== undefined) {
      console.log(
        `\n📊 Total de registros: ${ControllerUtils.formatNumber(totalRows)}`
      );
    }

    console.log(ControllerUtils.generateEqualsLine() + "\n");
  }

  private displayColumns(columns: TableColumn[]): void {
    console.log(
      "COLUMNA".padEnd(25) +
        "TIPO".padEnd(20) +
        "NULO".padEnd(8) +
        "LONGITUD".padEnd(12) +
        "PRECISIÓN".padEnd(12)
    );
    ControllerUtils.printDashLine();

    columns.forEach((column) => {
      const typeInfo = this.formatDataType(column);
      const dataLength = this.safeToString(column.dataLength);
      const dataPrecision = this.safeToString(column.dataPrecision);
      const columnName = this.safeToString(column.columnName);
      const nullable = this.safeToString(column.nullable);

      console.log(
        columnName.padEnd(25) +
          typeInfo.padEnd(20) +
          nullable.padEnd(8) +
          dataLength.padEnd(12) +
          dataPrecision.padEnd(12)
      );
    });

    ControllerUtils.printDashLine();
    console.log(`Total de columnas: ${columns.length}`);
  }
  private displaySampleData(sampleData: any[]): void {
    if (sampleData.length === 0) return;

    const headers = Object.keys(sampleData[0]);
    console.log(headers.map((h) => h.padEnd(15)).join(" | "));
    console.log(ControllerUtils.generateDashLine(headers.length * 17));

    sampleData.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        const displayValue =
          value !== null && value !== undefined
            ? value.toString().substring(0, 15)
            : "NULL";
        return displayValue.padEnd(15);
      });
      console.log(values.join(" | "));
    });
  }

  displayTablesList(tables: string[], searchPattern?: string): void {
    const title = searchPattern
      ? `🔎 Tablas que coinciden con '${searchPattern}'`
      : "📋 Tablas disponibles en el esquema";
    console.log(`\n${title} (${tables.length} total):`);
    ControllerUtils.printEqualsLine(60);

    if (tables.length === 0) {
      console.log("No se encontraron tablas");
      return;
    }

    // Mostrar en columnas
    const columns = 3;
    for (let i = 0; i < tables.length; i += columns) {
      const row = tables.slice(i, i + columns);
      console.log(row.map((table) => table.padEnd(20)).join(" | "));
    }

    ControllerUtils.printEqualsLine(60);
    console.log(`Total: ${tables.length} tablas\n`);
  }
  displaySchemasList(schemas: SchemaInfo[]): void {
    console.log(`\n📋 Esquemas disponibles (${schemas.length} total):`);
    console.log(ControllerUtils.generateEqualsLine());
    console.log("ESQUEMA".padEnd(30) + "TABLAS");
    ControllerUtils.printDashLine();

    schemas.forEach((schema) => {
      console.log(
        `${schema.schemaName.padEnd(30)} ${schema.tableCount} tablas`
      );
    });

    console.log(ControllerUtils.generateEqualsLine());
    console.log(`Total: ${schemas.length} esquemas accesibles\n`);
  }

  displaySchemaTablesList(
    tables: TableInfo[],
    schemaName: string,
    searchPattern?: string
  ): void {
    const title = searchPattern
      ? `🔍 Tablas en ${schemaName} que coinciden con '${searchPattern}'`
      : `📋 Tablas en esquema ${schemaName}`;

    console.log(`\n${title} (${tables.length} encontradas):`);
    console.log(
      "================================================================================"
    );
    console.log("TABLA".padEnd(30) + "FILAS".padEnd(15) + "TABLESPACE");
    ControllerUtils.printDashLine();

    tables.forEach((table) => {
      const numRows = ControllerUtils.formatNumber(table.numRows) || "N/A";
      const tablespace = table.tablespace || "N/A";

      console.log(
        `${table.tableName.padEnd(30)} ${numRows.padEnd(15)} ${tablespace}`
      );
    });

    console.log(ControllerUtils.generateEqualsLine());
    console.log(`Total: ${tables.length} tablas encontradas\n`);
  }

  displayFileGenerated(
    operation: string,
    filePath: string,
    additionalInfo?: Record<string, any>
  ): void {
    this.cliService.showSuccess(`✅ ${operation} completado exitosamente`);
    console.log(`📁 Ubicación: ${filePath}`);

    if (additionalInfo) {
      Object.entries(additionalInfo).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    }

    console.log("");
  }
  displayExcelValidation(validation: ExcelValidationResult): void {
    const { isValid, errors, warnings, summary } = validation;

    console.log("\n📊 Resultado de Validación Excel:");
    ControllerUtils.printEqualsLine(60);

    // Resumen
    console.log("📈 Resumen:");
    console.log(
      `  Total de filas: ${ControllerUtils.formatNumber(summary.totalRows)}`
    );
    console.log(
      `  Filas válidas: ${ControllerUtils.formatNumber(summary.validRows)}`
    );
    console.log(
      `  Filas con errores: ${ControllerUtils.formatNumber(summary.errorRows)}`
    );
    console.log(
      `  Advertencias: ${ControllerUtils.formatNumber(summary.warningRows)}`
    );

    // Estado general
    const status = isValid ? "✅ VÁLIDO" : "❌ CONTIENE ERRORES";
    console.log(`\n🎯 Estado: ${status}`);

    // Mostrar errores si existen
    if (errors.length > 0) {
      console.log("\n❌ Errores encontrados:");
      errors.slice(0, 10).forEach((error: any, index: number) => {
        console.log(
          `  ${index + 1}. Fila ${error.row}, Columna '${error.column}': ${
            error.error
          }`
        );
      });

      if (errors.length > 10) {
        console.log(`  ... y ${errors.length - 10} errores más`);
      }
    }

    // Mostrar advertencias si existen
    if (warnings.length > 0) {
      console.log("\n⚠️  Advertencias:");
      warnings.slice(0, 5).forEach((warning: any, index: number) => {
        console.log(
          `  ${index + 1}. Fila ${warning.row}, Columna '${warning.column}': ${
            warning.warning
          }`
        );
      });

      if (warnings.length > 5) {
        console.log(`  ... y ${warnings.length - 5} advertencias más`);
      }
    }
    console.log(ControllerUtils.generateEqualsLine(60) + "\n");
  }

  private formatDataType(column: TableColumn): string {
    let type = this.safeToString(column.dataType);

    if (
      column.dataPrecision !== null &&
      column.dataPrecision !== undefined &&
      column.dataScale !== null &&
      column.dataScale !== undefined
    ) {
      type += `(${column.dataPrecision},${column.dataScale})`;
    } else if (
      column.dataLength !== null &&
      column.dataLength !== undefined &&
      column.dataType !== "NUMBER"
    ) {
      type += `(${column.dataLength})`;
    }

    return type;
  }

  private safeToString(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  }
}
