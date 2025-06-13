/**
 * Universal Display Service - Simplified Version
 * No depende de CLI específica, trabaja con UserInterface abstracta
 * Versión simplificada con sistema de iconos moderno
 */
import { UserInterface } from "../interfaces/user-interface.interface";
import { IconService } from "../cli/services/icon.service";
import { StatusIconService } from "../cli/services/status-icon.service";
import { ControllerUtils } from "../utils/controller.utils";

export class UniversalDisplayService {
  constructor(private readonly userInterface: UserInterface) {}

  /**
   * Muestra resultado de operación simple
   */
  async displayOperationResult(
    title: string,
    success: boolean,
    message?: string
  ): Promise<void> {
    await this.userInterface.display({
      type: success ? "success" : "error",
      title,
      content:
        message ||
        (success
          ? "Operación completada exitosamente"
          : "Error en la operación"),
    });
  }
  /**
   * Muestra información de archivo generado con iconos modernos
   */
  async displayFileGenerated(
    title: string,
    filePath: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    let content = IconService.format("file", `Archivo generado: ${filePath}`);

    if (metadata) {
      content += `\n\n${IconService.format("excel", "Detalles:")}`;
      Object.entries(metadata).forEach(([key, value]) => {
        content += `\n${IconService.get("bullet")} ${key}: ${value}`;
      });
    }

    await this.userInterface.display({
      type: "success",
      title,
      content,
    });
  }

  /**
   * Muestra mensaje simple
   */
  async displayMessage(
    message: string,
    type: "success" | "error" | "warning" | "message" = "message"
  ): Promise<void> {
    await this.userInterface.display({
      type,
      content: message,
    });
  }
  /**
   * Muestra lista de elementos con iconos modernos
   */
  async displayList(title: string, items: string[]): Promise<void> {
    const content = items
      .map(
        (item, index) => `${IconService.get("bullet")} ${index + 1}. ${item}`
      )
      .join("\n");

    await this.userInterface.display({
      type: "message",
      title,
      content,
    });
  }

  /**
   * Muestra resumen de carga de archivos Excel
   */
  async displayLoadResult(result: any): Promise<void> {
    await this.userInterface.display({
      type: "message",
      title: IconService.format("excel", "Resumen de Archivos Excel"),
      content: StatusIconService.createSummary({
        success: result.successCount || 0,
        error: result.errorCount || 0,
        info: result.totalFiles || 0,
      }),
    });

    if (result.loadedFiles && result.loadedFiles.length > 0) {
      await this.displayList(
        IconService.format("success", "Archivos cargados exitosamente"),
        result.loadedFiles.map((file: any) => file.fileName || file)
      );
    }

    if (result.errors && result.errors.length > 0) {
      await this.displayList(
        IconService.format("error", "Errores encontrados"),
        result.errors
      );
    }
  }
  /**
   * Muestra información completa de procesamiento masivo
   */
  async displayBulkProcessResult(result: any): Promise<void> {
    // Mostrar estadísticas principales
    const summary = [
      `${IconService.get("file")} Archivos procesados: ${
        result.processedFiles || 0
      }/${result.totalFiles || 0}`,
      `${IconService.get("error")} Archivos fallidos: ${
        result.failedFiles || 0
      }`,
      `${IconService.get(
        "info"
      )} Total de filas: ${ControllerUtils.formatNumber(
        result.totalRows || 0
      )}`,
      `${IconService.get(
        "success"
      )} Filas válidas: ${ControllerUtils.formatNumber(result.validRows || 0)}`,
      `${IconService.get(
        "error"
      )} Filas con errores: ${ControllerUtils.formatNumber(
        result.errorRows || 0
      )}`,
      `${IconService.get("excel")} Archivos generados: ${
        result.outputFiles?.length || 0
      }`,
    ].join("\n");

    await this.userInterface.display({
      type: "message",
      title: IconService.format(
        "processing",
        "🚀 Resultado del Procesamiento Masivo"
      ),
      content: summary,
    });

    // Mostrar archivos SQL generados
    if (result.outputFiles && result.outputFiles.length > 0) {
      await this.displayList(
        IconService.format("file", "📄 Archivos SQL generados"),
        result.outputFiles.map((file: string) =>
          file.includes("/") || file.includes("\\")
            ? require("path").basename(file)
            : file
        )
      );
    }

    // Mostrar detalles por archivo si están disponibles
    if (result.fileResults && result.fileResults.length > 0) {
      await this.userInterface.display({
        type: "message",
        title: IconService.format("info", "📊 Detalles por archivo"),
        content: result.fileResults
          .map((fileResult: any) => {
            let details = `\n📁 ${fileResult.fileName}:\n`;
            details += `   ✅ Éxito: ${fileResult.success ? "Sí" : "No"}\n`;

            if (fileResult.error) {
              details += `   ❌ Error: ${fileResult.error}\n`;
            }

            if (fileResult.sheets) {
              fileResult.sheets.forEach((sheet: any) => {
                details += `   📋 ${sheet.sheetName}: ${sheet.processedRows}/${sheet.totalRows} filas procesadas\n`;
              });
            }

            return details;
          })
          .join("\n"),
      });
    }

    // Mostrar resumen si está disponible
    if (result.summary) {
      await this.userInterface.display({
        type: "message",
        title: IconService.format("info", "📝 Resumen"),
        content: result.summary,
      });
    }
  }
}
