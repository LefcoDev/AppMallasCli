/**
 * @fileoverview Servicio de dominio para procesamiento de archivos ZIP
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

import { ProcessedFile } from "../entities/processed-file.entity";
import { ZipFile } from "../entities/zip-file.entity";
import {
  FolderMapping,
  ProcessingStats,
  SourceContext,
} from "../value-objects/zip-processing.vo";
import { IntelligentMappingService } from "./intelligent-mapping.service";

export interface ZipProcessingService {
  /**
   * Procesa un archivo ZIP completo
   */
  processZipFile(zipFile: ZipFile): Promise<ZipProcessingResult>;

  /**
   * Escanea carpetas disponibles en la ruta de búsqueda
   */
  scanAvailableFolders(searchPath: string): Promise<string[]>;

  /**
   * Identifica y procesa archivos TXT del ZIP extraído
   */
  identifyAndProcessFiles(extractPath: string): Promise<ProcessedFile[]>;

  /**
   * Realiza mapeo inteligente de archivos
   */
  performIntelligentMapping(
    files: ProcessedFile[],
    availableFolders: string[]
  ): Promise<ProcessedFile[]>;

  /**
   * Organiza archivos en sus destinos finales
   */
  organizeFiles(files: ProcessedFile[], unmappedPath: string): Promise<void>;
}

export interface ZipProcessingResult {
  processedFiles: ProcessedFile[];
  folderMappings: Map<string, FolderMapping>;
  stats: ProcessingStats;
  availableFolders: string[];
}

/**
 * Implementación del servicio de procesamiento de ZIP
 */
export class ZipProcessingServiceImpl implements ZipProcessingService {
  constructor(private readonly mappingService: IntelligentMappingService) {}

  async processZipFile(zipFile: ZipFile): Promise<ZipProcessingResult> {
    console.log(
      "🚀 Iniciando procesamiento del ZIP con búsqueda inteligente..."
    );

    // Paso 1: Escanear carpetas disponibles
    const availableFolders = await this.scanAvailableFolders(
      zipFile.searchPath
    );

    // Paso 2: Identificar y procesar archivos (asumiendo que el ZIP ya fue extraído)
    const processedFiles = await this.identifyAndProcessFiles(
      zipFile.extractPath
    );

    // Paso 3: Realizar mapeo inteligente
    const mappedFiles = await this.performIntelligentMapping(
      processedFiles,
      availableFolders
    );

    // Paso 4: Crear carpeta estándar para no mapeados
    const unmappedPath = this.createUnmappedFolder(zipFile.outputPath);

    // Paso 5: Organizar archivos
    await this.organizeFiles(mappedFiles, unmappedPath);

    // Paso 6: Generar resultados
    const folderMappings = this.generateFolderMappings(mappedFiles);
    const stats = this.generateStats(mappedFiles, availableFolders.length);

    return {
      processedFiles: mappedFiles,
      folderMappings,
      stats,
      availableFolders,
    };
  }

  async scanAvailableFolders(searchPath: string): Promise<string[]> {
    console.log("🔍 Escaneando carpetas y subcarpetas disponibles...");
    console.log(`📂 Ruta de búsqueda: ${searchPath}`);

    const folders: string[] = [];

    try {
      await this.scanFoldersRecursively(searchPath, 0, folders);
      console.log(`🔍 Total de carpetas encontradas: ${folders.length}`);
      return folders;
    } catch (error) {
      console.error(`❌ Error al escanear carpetas en ${searchPath}:`, error);
      throw error;
    }
  }

  async identifyAndProcessFiles(extractPath: string): Promise<ProcessedFile[]> {
    console.log("🔍 Identificando archivos TXT...");

    // Renombrar archivos problemáticos ANTES del procesamiento
    await this.renameProblematicFiles(extractPath);

    const txtFiles = await this.getAllTxtFiles(extractPath);
    const processedFiles: ProcessedFile[] = [];

    for (const filePath of txtFiles) {
      const relativePath = require("path").relative(extractPath, filePath);
      const fileName = require("path").basename(filePath);
      const fileNameWithoutExt = require("path").basename(filePath, ".txt");

      // Detectar contexto de la carpeta de origen
      const sourceContext = SourceContext.detectFromPath(relativePath);

      const processedFile = ProcessedFile.create({
        originalPath: filePath,
        fileName: fileName,
        folderName: fileNameWithoutExt,
        newPath: "", // Se definirá después del mapping
        sourceContext: sourceContext?.value,
      });

      processedFiles.push(processedFile);

      console.log(
        `  📄 Encontrado: ${relativePath}${
          sourceContext ? ` [${sourceContext.value}]` : ""
        }`
      );
    }

    console.log(
      `🔍 Total de archivos TXT encontrados: ${processedFiles.length}`
    );
    return processedFiles;
  }

  async performIntelligentMapping(
    files: ProcessedFile[],
    availableFolders: string[]
  ): Promise<ProcessedFile[]> {
    console.log("🧠 Realizando coincidencias inteligentes...");

    for (const file of files) {
      const matchedFolder = this.mappingService.findBestMatch(
        file,
        availableFolders
      );

      if (matchedFolder) {
        file.setMatchedFolder(require("path").basename(matchedFolder));
        file.updateDestinationPath(
          require("path").join(matchedFolder, file.fileName)
        );

        console.log(
          `  ✓ Match: ${file.fileName} -> ${require("path").relative(
            availableFolders[0]
              .split(require("path").sep)
              .slice(0, -1)
              .join(require("path").sep),
            matchedFolder
          )}${file.sourceContext ? ` [${file.sourceContext}]` : ""}`
        );
      } else {
        // Si no encuentra coincidencia, se manejará en organizeFiles
        console.log(
          `  ⚠️  Sin match: ${file.fileName}${
            file.sourceContext ? ` [${file.sourceContext}]` : ""
          }`
        );
      }
    }

    console.log("🧠 Coincidencias completadas");
    return files;
  }

  async organizeFiles(
    files: ProcessedFile[],
    unmappedPath: string
  ): Promise<void> {
    console.log("📁 Organizando archivos...");

    for (const file of files) {
      let targetPath: string;

      if (file.isMapped()) {
        // Archivo mapeado exitosamente
        targetPath = file.newPath;
      } else {
        // Archivo sin mapeo - va a carpeta estándar de no mapeados
        if (file.isDuplicate() && file.sourceContext) {
          // Para archivos duplicados con contexto, crear subcarpeta específica
          const contextualFolderName = `${file.folderName}_${file.sourceContext}`;
          targetPath = require("path").join(
            unmappedPath,
            contextualFolderName,
            file.fileName
          );
        } else {
          targetPath = require("path").join(
            unmappedPath,
            file.folderName,
            file.fileName
          );
        }
        file.updateDestinationPath(targetPath);
      }

      // Crear directorio de destino si no existe
      const targetDir = require("path").dirname(targetPath);
      await this.ensureDir(targetDir);

      // Copiar archivo
      await this.copyFile(file.originalPath, targetPath);

      if (file.isMapped()) {
        console.log(`  ✓ Copiado: ${file.fileName} -> ${file.matchedFolder}/`);
      } else {
        console.log(
          `  ✓ Copiado: ${
            file.fileName
          } -> NO_MAPEADOS/${require("path").dirname(
            require("path").relative(unmappedPath, targetPath)
          )}/`
        );
      }
    }

    console.log("📁 Organización completada");
  }

  private createUnmappedFolder(outputPath: string): string {
    return require("path").join(outputPath, "NO_MAPEADOS");
  }

  private async scanFoldersRecursively(
    currentPath: string,
    depth: number,
    folders: string[]
  ): Promise<void> {
    if (depth > 3) return; // Limitar profundidad

    try {
      const fs = require("fs").promises;
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const fullPath = require("path").join(currentPath, item);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
          folders.push(fullPath);

          const relativePath = require("path").relative(
            currentPath
              .split(require("path").sep)
              .slice(0, -depth)
              .join(require("path").sep),
            fullPath
          );
          const indent = "  ".repeat(depth + 1);
          console.log(`${indent}📁 ${relativePath}`);

          // Escanear subcarpetas
          await this.scanFoldersRecursively(fullPath, depth + 1, folders);
        }
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo acceder a: ${currentPath}`);
    }
  }

  private async renameProblematicFiles(extractPath: string): Promise<void> {
    console.log("🔄 Renombrando archivos problemáticos...");

    const renameMappings: { [key: string]: string } = {
      "SHRRTM.txt": "SHRTTRM.txt",
      "shrrtm.txt": "SHRTTRM.txt",
    };

    const allFiles = await this.getAllTxtFiles(extractPath);

    for (const filePath of allFiles) {
      const fileName = require("path").basename(filePath);
      const newFileName = renameMappings[fileName];

      if (newFileName) {
        const newFilePath = require("path").join(
          require("path").dirname(filePath),
          newFileName
        );

        try {
          const fs = require("fs").promises;
          await fs.rename(filePath, newFilePath);
          console.log(`  ✅ Renombrado: ${fileName} → ${newFileName}`);
        } catch (error) {
          console.warn(`  ⚠️ No se pudo renombrar ${fileName}:`, error);
        }
      }
    }

    console.log("🔄 Renombrado de archivos completado");
  }

  private async getAllTxtFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const fs = require("fs").promises;

    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = require("path").join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        const subFiles = await this.getAllTxtFiles(fullPath);
        files.push(...subFiles);
      } else if (require("path").extname(item).toLowerCase() === ".txt") {
        files.push(fullPath);
      }
    }

    return files;
  }

  private generateFolderMappings(
    files: ProcessedFile[]
  ): Map<string, FolderMapping> {
    const mappings = new Map<string, FolderMapping>();

    for (const file of files) {
      if (file.isMapped() && file.matchedFolder) {
        const folderKey = file.matchedFolder;

        if (!mappings.has(folderKey)) {
          mappings.set(
            folderKey,
            new FolderMapping(require("path").dirname(file.newPath), [])
          );
        }

        const existingMapping = mappings.get(folderKey)!;
        mappings.set(folderKey, existingMapping.addFile(file.fileName));
      }
    }

    return mappings;
  }

  private generateStats(
    files: ProcessedFile[],
    availableFolders: number
  ): ProcessingStats {
    const mappedFiles = files.filter((f) => f.isMapped()).length;
    const contextFiles = files.filter((f) => f.hasContext()).length;
    const duplicateFiles = files.filter((f) => f.isDuplicate()).length;

    return ProcessingStats.create(
      files.length,
      mappedFiles,
      contextFiles,
      duplicateFiles,
      availableFolders
    );
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      const fs = require("fs").promises;
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }

  private async copyFile(src: string, dest: string): Promise<void> {
    const fs = require("fs").promises;
    await fs.copyFile(src, dest);
  }
}
