/**
 * Oracle Explorer Input Service
 * Responsabilidad: Manejar la entrada de datos del usuario
 */
import { CLIInterface } from "../cli/interfaces/cli.interface";
import { InsertRecord } from "../../domain/services/oracle-explorer.service";
import { TableColumn } from "../../domain/repositories/oracle.repository";
import { ControllerUtils } from "../utils/controller.utils";

export interface UserInputRequest {
  message: string;
  required?: boolean;
  defaultValue?: string;
  validation?: (value: string) => boolean | string;
}

export interface MultipleRecordsRequest {
  tableName: string;
  columns: TableColumn[];
  maxRecords?: number;
}

export class OracleExplorerInputService {
  constructor(private readonly cliService: CLIInterface) {}
  async getUserInput(request: UserInputRequest): Promise<string | null> {
    const { message, required = false, defaultValue, validation } = request;

    while (true) {
      const displayMessage = defaultValue
        ? `${message} [${defaultValue}] (o 'cancelar' para salir):`
        : `${message} (o 'cancelar' para salir):`;

      const value = await this.cliService.question(displayMessage);

      // Verificar cancelación
      if (
        value.trim().toLowerCase() === "cancelar" ||
        value.trim().toLowerCase() === "cancel"
      ) {
        throw new Error("OPERATION_CANCELLED");
      }

      const finalValue = value.trim() || defaultValue || "";

      // Verificar si es requerido
      if (required && !finalValue) {
        this.cliService.showWarning("Este campo es requerido");
        continue;
      }

      // Aplicar validación si existe
      if (validation && finalValue) {
        const validationResult = validation(finalValue);
        if (validationResult !== true) {
          const errorMessage =
            typeof validationResult === "string"
              ? validationResult
              : "Valor inválido";
          this.cliService.showWarning(errorMessage);
          continue;
        }
      }

      return finalValue || null;
    }
  }

  async getTableName(supportSchema: boolean = true): Promise<string | null> {
    const message = supportSchema
      ? "Nombre de la tabla (soporta ESQUEMA.TABLA)"
      : "Nombre de la tabla";

    return this.getUserInput({
      message,
      required: true,
      validation: (value) => {
        if (!value.trim()) return "Nombre de tabla requerido";
        if (supportSchema && value.includes(".")) {
          const parts = value.split(".");
          if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
            return "Formato inválido. Use ESQUEMA.TABLA";
          }
        }
        return true;
      },
    });
  }

  async getSearchPattern(): Promise<string | null> {
    return this.getUserInput({
      message: "Patrón de búsqueda (ej: SM%, %ACAD%, USUARIOS)",
      required: true,
      validation: (value) => {
        if (!value.trim()) return "Patrón de búsqueda requerido";
        return true;
      },
    });
  }

  async getSchemaName(): Promise<string | null> {
    return this.getUserInput({
      message: "Nombre del esquema",
      required: true,
      validation: (value) => {
        if (!value.trim()) return "Nombre de esquema requerido";
        return true;
      },
    });
  }

  async getFilePath(operation: string): Promise<string | null> {
    return this.getUserInput({
      message: `Ruta del archivo para ${operation}`,
      required: true,
      validation: (value) => {
        if (!value.trim()) return "Ruta de archivo requerida";
        // Validación básica de formato de archivo
        if (!value.includes(".")) {
          return "La ruta debe incluir el nombre del archivo con extensión";
        }
        return true;
      },
    });
  }

  async getNumberOfRecords(maxAllowed: number = 100): Promise<number> {
    const result = await this.getUserInput({
      message: `¿Cuántos registros INSERT desea generar? (1-${maxAllowed})`,
      required: true,
      defaultValue: "1",
      validation: (value) => {
        const num = parseInt(value);
        if (isNaN(num)) return "Debe ser un número válido";
        if (num < 1) return `Mínimo 1 registro`;
        if (num > maxAllowed) return `Máximo ${maxAllowed} registros`;
        return true;
      },
    });

    return parseInt(result || "1");
  }
  async collectMultipleRecords(
    request: MultipleRecordsRequest
  ): Promise<InsertRecord[]> {
    const { tableName, columns, maxRecords = 100 } = request;
    const records: InsertRecord[] = [];

    const numRecords = await this.getNumberOfRecords(maxRecords);
    for (let i = 0; i < numRecords; i++) {
      console.log(`\n📝 Registro ${i + 1} de ${numRecords}:`);
      ControllerUtils.printDashLine(40);

      const record: InsertRecord = {};

      for (const column of columns) {
        try {
          const value = await this.collectColumnValue(column, i + 1);
          record[column.columnName] = value;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "OPERATION_CANCELLED"
          ) {
            throw error; // Re-lanzar la cancelación
          }
          throw error;
        }
      }

      records.push(record);

      // Confirmar si continuar (excepto en el último registro)
      if (i < numRecords - 1) {
        const continueAdding = await this.cliService.confirmAction(
          "¿Continuar con el siguiente registro?"
        );
        if (!continueAdding) {
          break;
        }
      }
    }

    return records;
  }
  private async collectColumnValue(
    column: TableColumn,
    recordNumber: number
  ): Promise<any> {
    const isRequired = column.nullable === "N";
    const dataTypeInfo = this.formatDataType(column);

    const prompt = `  ${column.columnName} (${dataTypeInfo})${
      isRequired ? " [REQUERIDO]" : " [OPCIONAL]"
    } (o 'cancelar' para salir)`;

    while (true) {
      const value = await this.cliService.question(prompt + ":");

      // Verificar cancelación
      if (
        value.trim().toLowerCase() === "cancelar" ||
        value.trim().toLowerCase() === "cancel"
      ) {
        throw new Error("OPERATION_CANCELLED");
      }

      // Si está vacío y no es requerido, retornar null
      if (!value.trim() && !isRequired) {
        return null;
      }

      // Si está vacío y es requerido, mostrar error
      if (!value.trim() && isRequired) {
        this.cliService.showWarning("Este campo es requerido");
        continue;
      }

      // Convertir y validar el valor
      const convertedValue = this.convertValueByDataType(value.trim(), column);
      if (convertedValue !== undefined) {
        return convertedValue;
      }

      this.cliService.showWarning(
        `Valor inválido para tipo ${column.dataType}`
      );
    }
  }

  private convertValueByDataType(value: string, column: TableColumn): any {
    if (!value || value.toLowerCase() === "null") {
      return null;
    }

    try {
      switch (column.dataType) {
        case "NUMBER":
          const numValue = Number(value);
          return isNaN(numValue) ? undefined : numValue;

        case "VARCHAR2":
        case "CHAR":
        case "CLOB":
          // Validar longitud para VARCHAR2 y CHAR
          if (
            column.dataLength &&
            value.length > column.dataLength &&
            (column.dataType === "VARCHAR2" || column.dataType === "CHAR")
          ) {
            this.cliService.showWarning(
              `Valor demasiado largo. Máximo: ${column.dataLength} caracteres`
            );
            return undefined;
          }
          return value;

        case "DATE":
          // Validar formato de fecha básico
          if (
            /^\d{2}\/\d{2}\/\d{4}$/.test(value) ||
            /^\d{4}-\d{2}-\d{2}$/.test(value)
          ) {
            return value;
          }
          this.cliService.showWarning(
            "Formato de fecha inválido. Use DD/MM/YYYY o YYYY-MM-DD"
          );
          return undefined;

        case "TIMESTAMP":
          // Validar formato de timestamp básico
          if (
            /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(value) ||
            /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
          ) {
            return value;
          }
          this.cliService.showWarning(
            "Formato de timestamp inválido. Use DD/MM/YYYY HH:MM:SS"
          );
          return undefined;

        default:
          return value;
      }
    } catch (error) {
      return undefined;
    }
  }

  private formatDataType(column: TableColumn): string {
    let type = column.dataType;

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
}
