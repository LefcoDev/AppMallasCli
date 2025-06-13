/**
 * @fileoverview Caso de uso para procesamiento completo de archivos ZIP
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

import { ZipFile } from "../../domain/entities/zip-file.entity";
import { ZipRepository } from "../../domain/repositories/zip.repository";
import {
  ZipProcessingService,
  ZipProcessingResult,
} from "../../domain/services/zip-processing.service";

export interface ProcessZipFileRequest {
  zipPath: string;
  searchPath: string;
  outputPath?: string;
  extractPath?: string;
}

export interface ProcessZipFileResponse {
  success: boolean;
  result?: ZipProcessingResult;
  error?: string;
}

/**
 * Caso de uso principal para procesamiento de archivos ZIP
 */
export class ProcessZipFileUseCase {
  constructor(
    private readonly zipRepository: ZipRepository,
    private readonly processingService: ZipProcessingService
  ) {}

  async execute(
    request: ProcessZipFileRequest
  ): Promise<ProcessZipFileResponse> {
    try {
      // Validar que el ZIP existe
      const zipExists = await this.zipRepository.zipExists(request.zipPath);
      if (!zipExists) {
        return {
          success: false,
          error: `El archivo ZIP no existe: ${request.zipPath}`,
        };
      }

      // Crear entidad ZipFile
      const zipFile = ZipFile.create({
        zipPath: request.zipPath,
        extractPath: request.extractPath || "./temp_extract",
        outputPath: request.outputPath || "./organized_files",
        searchPath: request.searchPath,
      });

      // Validar la entidad
      if (!zipFile.isValid()) {
        return {
          success: false,
          error: "Configuración del ZIP inválida",
        };
      }

      console.log(`🎯 Procesando ZIP: ${zipFile.fileName}`);
      console.log(`📂 Ruta de búsqueda: ${zipFile.searchPath}`);
      console.log(`📁 Salida: ${zipFile.outputPath}`);

      // Extraer el ZIP
      await this.zipRepository.extractZip(zipFile.zipPath, zipFile.extractPath);

      // Procesar el contenido
      const result = await this.processingService.processZipFile(zipFile);

      console.log("✅ Procesamiento completado exitosamente!");

      return {
        success: true,
        result,
      };
    } catch (error) {
      console.error("❌ Error durante el procesamiento:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  /**
   * Limpia archivos temporales después del procesamiento
   */
  async cleanup(extractPath: string): Promise<void> {
    await this.zipRepository.cleanup(extractPath);
  }
}
