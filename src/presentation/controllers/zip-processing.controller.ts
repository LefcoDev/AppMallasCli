/**
 * @fileoverview Controlador para procesamiento de archivos ZIP
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

import { UserInterface } from "../interfaces/user-interface.interface";
import {
  ProcessZipFileUseCase,
  ProcessZipFileRequest,
} from "../../application/use-cases/process-zip-file.use-case";
import { ZipProcessingResult } from "../../domain/services/zip-processing.service";
import { NavigationService } from "../services/navigation.service";

export interface ZipProcessingController {
  /**
   * Inicia el flujo de procesamiento de ZIP
   */
  startZipProcessing(): Promise<void>;
}

/**
 * Controlador para el procesamiento de archivos ZIP
 * Mantiene la separación de responsabilidades y usa la interfaz desacoplada
 */
export class ZipProcessingControllerImpl implements ZipProcessingController {
  constructor(
    private readonly userInterface: UserInterface,
    private readonly processZipUseCase: ProcessZipFileUseCase,
    private readonly navigationService: NavigationService
  ) {}

  async startZipProcessing(): Promise<void> {
    try {
      console.log("🚀 Procesador de Archivos ZIP");
      console.log("Mapeo Inteligente de Archivos");
      console.log("=".repeat(50));

      // Configurar rutas usando navegación existente
      const config = await this.configureZipProcessing();
      if (!config) {
        await this.userInterface.showMessage("❌ Configuración cancelada");
        return;
      }

      // Ejecutar procesamiento
      const response = await this.processZipUseCase.execute(config);

      if (!response.success) {
        await this.userInterface.showMessage(`❌ Error: ${response.error}`);
        return;
      }

      if (!response.result) {
        await this.userInterface.showMessage(
          "❌ No se obtuvo resultado del procesamiento"
        );
        return;
      }

      // Mostrar resultados
      await this.showProcessingResults(response.result);

      // Preguntar por limpieza
      await this.handleCleanup(config.extractPath || "./temp_extract");
    } catch (error) {
      await this.userInterface.showMessage(
        `💥 Error fatal: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }

  private async configureZipProcessing(): Promise<ProcessZipFileRequest | null> {
    // Seleccionar archivo ZIP
    const zipPath = await this.selectZipFile();
    if (!zipPath) return null;

    // Seleccionar ruta de búsqueda de carpetas
    const searchPath = await this.selectSearchPath();
    if (!searchPath) return null;

    // Configurar ruta de salida
    const outputPath = await this.configureOutputPath();
    if (!outputPath) return null;

    return {
      zipPath,
      searchPath,
      outputPath,
      extractPath: "./temp_extract",
    };
  }

  private async selectZipFile(): Promise<string | null> {
    await this.userInterface.showMessage(
      "📦 Selecciona el archivo ZIP a procesar"
    );

    const zipPath = await this.navigationService.selectFile({
      startPath: process.cwd(),
      extensions: [".zip"],
      message: "Selecciona archivo ZIP:",
    });

    if (!zipPath) {
      await this.userInterface.showMessage("❌ No se seleccionó archivo ZIP");
      return null;
    }

    await this.userInterface.showMessage(`✅ ZIP seleccionado: ${zipPath}`);
    return zipPath;
  }

  private async selectSearchPath(): Promise<string | null> {
    await this.userInterface.showMessage(
      "🔍 Selecciona la carpeta donde buscar coincidencias"
    );

    const searchPath = await this.navigationService.selectDirectory({
      startPath: process.cwd(),
      message: "Selecciona carpeta de búsqueda:",
    });

    if (!searchPath) {
      await this.userInterface.showMessage(
        "❌ No se seleccionó carpeta de búsqueda"
      );
      return null;
    }

    await this.userInterface.showMessage(`✅ Ruta de búsqueda: ${searchPath}`);
    return searchPath;
  }

  private async configureOutputPath(): Promise<string | null> {
    const useDefault = await this.userInterface.confirmAction(
      "¿Usar carpeta de salida por defecto? (./organized_files)"
    );

    if (useDefault) {
      return "./organized_files";
    }

    await this.userInterface.showMessage(
      "📁 Selecciona carpeta de salida para archivos organizados"
    );

    const outputPath = await this.navigationService.selectDirectory({
      startPath: process.cwd(),
      message: "Selecciona carpeta de salida:",
      allowCreate: true,
    });

    if (!outputPath) {
      await this.userInterface.showMessage(
        "❌ No se seleccionó carpeta de salida"
      );
      return null;
    }

    await this.userInterface.showMessage(`✅ Carpeta de salida: ${outputPath}`);
    return outputPath;
  }

  private async showProcessingResults(
    result: ZipProcessingResult
  ): Promise<void> {
    console.log("\n📊 RESUMEN DEL PROCESAMIENTO");
    console.log("=".repeat(60));

    // Estadísticas generales
    console.log(`📄 Total de archivos procesados: ${result.stats.totalFiles}`);
    console.log(`✅ Archivos mapeados: ${result.stats.mappedFiles}`);
    console.log(`⚠️  Archivos no mapeados: ${result.stats.unmappedFiles}`);
    console.log(`🎯 Archivos con contexto: ${result.stats.contextFiles}`);
    console.log(`🔄 Archivos duplicados: ${result.stats.duplicateFiles}`);
    console.log(`📁 Carpetas disponibles: ${result.stats.availableFolders}`);
    console.log(`📈 Tasa de mapeo: ${result.stats.mappingRate.toFixed(1)}%`);

    // Mostrar coincidencias encontradas
    if (result.folderMappings.size > 0) {
      console.log("\n📋 COINCIDENCIAS ENCONTRADAS:");

      for (const [folderKey, mapping] of result.folderMappings) {
        console.log(`  📁 ${mapping.folderName}`);
        for (const file of mapping.txtFiles) {
          const processedFile = result.processedFiles.find(
            (f) => f.fileName === file
          );
          const contextInfo = processedFile?.sourceContext
            ? ` [${processedFile.sourceContext}]`
            : "";
          const isDuplicate = processedFile?.isDuplicate() ? " 🔄" : "";
          console.log(`    📄 ${file}${contextInfo}${isDuplicate}`);
        }
      }
    }

    // Mostrar archivos no mapeados
    const unmappedFiles = result.processedFiles.filter((f) => !f.isMapped());
    if (unmappedFiles.length > 0) {
      console.log("\n⚠️  ARCHIVOS NO MAPEADOS (en carpeta NO_MAPEADOS):");
      for (const file of unmappedFiles) {
        const contextInfo = file.sourceContext
          ? ` [${file.sourceContext}]`
          : "";
        console.log(`  📄 ${file.fileName}${contextInfo}`);
      }
    }
  }

  private async handleCleanup(extractPath: string): Promise<void> {
    const shouldCleanup = await this.userInterface.confirmAction(
      "¿Deseas eliminar los archivos temporales?"
    );

    if (shouldCleanup) {
      await this.processZipUseCase.cleanup(extractPath);
      await this.userInterface.showMessage("🧹 Archivos temporales eliminados");
    } else {
      await this.userInterface.showMessage(
        `📁 Archivos temporales conservados en: ${extractPath}`
      );
    }
  }
}
