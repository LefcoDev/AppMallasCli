/**
 * Use Case: Excel Operations
 * Responsabilidad: Operaciones con Excel (templates, validación, procesamiento masivo)
 */
import {
  OracleExplorerService,
  ExcelValidationResult,
  BulkProcessResult,
} from "../../../domain/services/oracle-explorer.service";

export interface GenerateExcelTemplateRequest {
  tableName: string;
  includeValidations?: boolean;
}

export interface GenerateExcelTemplateResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface ValidateExcelFileRequest {
  filePath: string;
  tableName: string;
}

export interface ValidateExcelFileResponse {
  success: boolean;
  validation?: ExcelValidationResult;
  error?: string;
}

export interface BulkProcessExcelRequest {
  filePatterns: string[];
  continueOnError?: boolean;
}

export interface BulkProcessExcelResponse {
  success: boolean;
  result?: BulkProcessResult;
  error?: string;
}

export class ExcelOperationsUseCase {
  constructor(private readonly oracleExplorerService: OracleExplorerService) {}

  async generateExcelTemplate(
    request: GenerateExcelTemplateRequest
  ): Promise<GenerateExcelTemplateResponse> {
    try {
      const { tableName, includeValidations = true } = request;

      if (!tableName?.trim()) {
        return {
          success: false,
          error: "Nombre de tabla requerido",
        };
      }

      const filePath = await this.oracleExplorerService.generateExcelTemplate(
        tableName.toUpperCase().trim()
      );

      return {
        success: true,
        filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error generando plantilla Excel: ${error}`,
      };
    }
  }

  async validateExcelFile(
    request: ValidateExcelFileRequest
  ): Promise<ValidateExcelFileResponse> {
    try {
      const { filePath, tableName } = request;

      if (!filePath?.trim()) {
        return {
          success: false,
          error: "Ruta de archivo requerida",
        };
      }

      if (!tableName?.trim()) {
        return {
          success: false,
          error: "Nombre de tabla requerido",
        };
      }

      // Verificar que el archivo existe
      const fs = await import("fs/promises");
      try {
        await fs.access(filePath);
      } catch {
        return {
          success: false,
          error: `El archivo no existe: ${filePath}`,
        };
      }

      const validation = await this.oracleExplorerService.validateExcelFile(
        filePath,
        tableName.toUpperCase().trim()
      );

      return {
        success: true,
        validation,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error validando archivo Excel: ${error}`,
      };
    }
  }

  async bulkProcessExcelFiles(
    request: BulkProcessExcelRequest
  ): Promise<BulkProcessExcelResponse> {
    try {
      const { filePatterns, continueOnError = true } = request;

      if (!filePatterns || filePatterns.length === 0) {
        return {
          success: false,
          error: "Se requiere al menos un patrón de archivo",
        };
      }

      const result = await this.oracleExplorerService.bulkProcessExcelFiles(
        filePatterns
      );

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error en procesamiento masivo: ${error}`,
      };
    }
  }
}
