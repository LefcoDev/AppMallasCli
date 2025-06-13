/**
 * @fileoverview Servicio de dominio para mapeo inteligente de archivos
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

import { ProcessedFile } from "../entities/processed-file.entity";
import { SourceContext } from "../value-objects/zip-processing.vo";

export interface IntelligentMappingService {
  /**
   * Encuentra la mejor coincidencia para un archivo procesado
   */
  findBestMatch(file: ProcessedFile, availableFolders: string[]): string | null;

  /**
   * Busca carpeta específica basada en contexto para archivos duplicados
   */
  findContextSpecificFolder(
    baseMatch: string,
    sourceContext: SourceContext
  ): string | null;
}

/**
 * Implementación del servicio de mapeo inteligente
 */
export class IntelligentMappingServiceImpl
  implements IntelligentMappingService
{
  findBestMatch(
    file: ProcessedFile,
    availableFolders: string[]
  ): string | null {
    const fileNameLower = file.fileName.toLowerCase();
    const fileNameWithoutExt = file.fileNameWithoutExtension.toLowerCase();

    console.log(
      `  🔍 Buscando match para: ${file.fileName}${
        file.sourceContext ? ` [CONTEXTO: ${file.sourceContext}]` : ""
      }`
    );

    // 🚨 REGLA ESTRICTA DE CONTEXTO 🚨
    if (file.sourceContext) {
      return this.findMatchWithStrictContext(
        file,
        availableFolders,
        fileNameWithoutExt
      );
    }

    // Si NO tiene contexto específico, buscar normalmente en TODAS las carpetas
    console.log(`    🔍 Archivo sin contexto específico, búsqueda general`);
    return this.findGeneralMatch(fileNameWithoutExt, availableFolders);
  }

  findContextSpecificFolder(
    baseMatch: string,
    sourceContext: SourceContext
  ): string | null {
    // Implementación simplificada - en el futuro se puede expandir
    return baseMatch;
  }

  private findMatchWithStrictContext(
    file: ProcessedFile,
    availableFolders: string[],
    fileNameWithoutExt: string
  ): string | null {
    const sourceContextObj = file.sourceContext
      ? new SourceContext(file.sourceContext)
      : null;

    if (!sourceContextObj) return null;

    console.log(
      `    🎯 APLICANDO REGLA ESTRICTA DE CONTEXTO: ${sourceContextObj.value}`
    );

    const requiredPatterns = sourceContextObj.getPatterns();
    console.log(
      `    🔒 SOLO buscar en carpetas que contengan: [${requiredPatterns.join(
        ", "
      )}]`
    );

    // Filtrar carpetas que contengan el contexto específico
    const contextFolders = availableFolders.filter((folderPath) => {
      const folderName = this.getFolderBaseName(folderPath).toLowerCase();
      return requiredPatterns.some((pattern) => folderName.includes(pattern));
    });

    console.log(
      `    📁 Carpetas del contexto '${sourceContextObj.value}' encontradas: ${contextFolders.length}`
    );

    if (contextFolders.length === 0) {
      console.log(
        `    ❌ NO hay carpetas para el contexto '${sourceContextObj.value}'`
      );
      console.log(`    🚫 RECHAZANDO archivo para evitar mezcla de contextos`);
      return null;
    }

    // Buscar subcarpetas con el nombre del archivo dentro de carpetas de contexto
    const subfolderMatch = this.findSubfolderMatch(
      contextFolders,
      fileNameWithoutExt,
      availableFolders
    );
    if (subfolderMatch) return subfolderMatch;

    // Buscar coincidencia exacta por nombre en carpetas del contexto
    const exactMatch = this.findExactMatch(contextFolders, fileNameWithoutExt);
    if (exactMatch) return exactMatch;

    // Buscar coincidencia parcial en carpetas del contexto
    const partialMatch = this.findPartialMatch(
      contextFolders,
      fileNameWithoutExt
    );
    if (partialMatch) return partialMatch;

    // Buscar por patrones específicos en carpetas del contexto
    const patternMatch = this.findPatternMatch(
      contextFolders,
      fileNameWithoutExt
    );
    if (patternMatch) return patternMatch;

    // Buscar por similitud de palabras SOLO en carpetas del contexto
    const similarityMatch = this.findSimilarityMatch(
      contextFolders,
      fileNameWithoutExt
    );
    if (similarityMatch) return similarityMatch;

    console.log(
      `    ❌ NO se encontró carpeta apropiada en contexto '${sourceContextObj.value}'`
    );
    console.log(
      `    🚫 RECHAZANDO archivo para mantener integridad contextual`
    );
    return null;
  }

  private findGeneralMatch(
    fileNameWithoutExt: string,
    availableFolders: string[]
  ): string | null {
    // Buscar coincidencia exacta por nombre de carpeta
    const exactMatch = this.findExactMatch(
      availableFolders,
      fileNameWithoutExt
    );
    if (exactMatch) return exactMatch;

    // Buscar coincidencia parcial (carpeta contiene nombre del archivo)
    const partialMatch = this.findPartialMatch(
      availableFolders,
      fileNameWithoutExt
    );
    if (partialMatch) return partialMatch;

    // Buscar coincidencia parcial (archivo contiene nombre de carpeta)
    const reversePartialMatch = this.findReversePartialMatch(
      availableFolders,
      fileNameWithoutExt
    );
    if (reversePartialMatch) return reversePartialMatch;

    // Buscar por patrones específicos
    const patternMatch = this.findPatternMatch(
      availableFolders,
      fileNameWithoutExt
    );
    if (patternMatch) return patternMatch;

    // Buscar por similitud de palabras
    const similarityMatch = this.findSimilarityMatch(
      availableFolders,
      fileNameWithoutExt
    );
    if (similarityMatch) return similarityMatch;

    console.log(`    ❌ Sin match encontrado para: ${fileNameWithoutExt}`);
    return null;
  }

  private findSubfolderMatch(
    contextFolders: string[],
    fileNameWithoutExt: string,
    allFolders: string[]
  ): string | null {
    console.log(
      `    🔍 Buscando carpeta '${fileNameWithoutExt}' DENTRO de carpetas de contexto`
    );

    for (const contextFolder of contextFolders) {
      const contextFolderName = this.getFolderBaseName(contextFolder);
      console.log(`    📁 Explorando contexto: ${contextFolderName}`);

      // Buscar subcarpetas dentro de esta carpeta de contexto
      const subfolders = allFolders.filter((folderPath) =>
        folderPath.startsWith(contextFolder + require("path").sep)
      );

      console.log(
        `    🔍 Subcarpetas en ${contextFolderName}: ${subfolders.length}`
      );

      // Buscar coincidencia exacta del nombre del archivo en las subcarpetas
      const exactMatch = subfolders.find((subfolderPath) => {
        const subfolderName =
          this.getFolderBaseName(subfolderPath).toLowerCase();
        const match = subfolderName === fileNameWithoutExt;
        if (match) {
          console.log(
            `    ✅ Match exacto contextual: ${contextFolderName}/${subfolderName}`
          );
        }
        return match;
      });

      if (exactMatch) return exactMatch;

      // Buscar coincidencia parcial en las subcarpetas
      const partialMatch = subfolders.find((subfolderPath) => {
        const subfolderName =
          this.getFolderBaseName(subfolderPath).toLowerCase();
        const match = subfolderName.includes(fileNameWithoutExt);
        if (match) {
          console.log(
            `    ✅ Match parcial contextual: ${contextFolderName}/${subfolderName}`
          );
        }
        return match;
      });

      if (partialMatch) return partialMatch;
    }

    return null;
  }

  private findExactMatch(
    folders: string[],
    fileNameWithoutExt: string
  ): string | null {
    return (
      folders.find((folderPath) => {
        const folderName = this.getFolderBaseName(folderPath).toLowerCase();
        const match = folderName === fileNameWithoutExt;
        if (match) {
          console.log(`    ✅ Match exacto: ${folderName}`);
        }
        return match;
      }) || null
    );
  }

  private findPartialMatch(
    folders: string[],
    fileNameWithoutExt: string
  ): string | null {
    return (
      folders.find((folderPath) => {
        const folderName = this.getFolderBaseName(folderPath).toLowerCase();
        const match = folderName.includes(fileNameWithoutExt);
        if (match) {
          console.log(
            `    ✅ Match parcial (carpeta contiene archivo): ${folderName}`
          );
        }
        return match;
      }) || null
    );
  }

  private findReversePartialMatch(
    folders: string[],
    fileNameWithoutExt: string
  ): string | null {
    return (
      folders.find((folderPath) => {
        const folderName = this.getFolderBaseName(folderPath).toLowerCase();
        const match = fileNameWithoutExt.includes(folderName);
        if (match) {
          console.log(
            `    ✅ Match parcial (archivo contiene carpeta): ${folderName}`
          );
        }
        return match;
      }) || null
    );
  }

  private findPatternMatch(
    folders: string[],
    fileNameWithoutExt: string
  ): string | null {
    const specificMappings: { [key: string]: string[] } = {
      sorlcur: ["sorlcur", "6-sorlcur"],
      sorlfos: ["sorlfos", "7-sorlfos"],
      shrttrm: ["shrttrm", "shrrtm"],
      saradap: ["saradap", "1-saradap"],
      saraatt: ["saraatt", "2-saraatt"],
      sarappd: ["sarappd", "3-sarappd"],
      sarchkl: ["sarchkl", "4-sarchkl"],
      sarchrt: ["sarchrt", "5-sarchrt"],
      persona: ["persona general", "persona_general", "personageneral"],
      admision: ["admisiones", "admision"],
      alumno: ["alumnos", "alumno"],
      historia: [
        "historia academica",
        "historia_academica",
        "historiaacademica",
      ],
    };

    for (const [keyword, patterns] of Object.entries(specificMappings)) {
      if (fileNameWithoutExt.includes(keyword)) {
        for (const pattern of patterns) {
          const match = folders.find((folderPath) => {
            const folderName = this.getFolderBaseName(folderPath).toLowerCase();
            const isMatch = folderName.includes(pattern.toLowerCase());
            if (isMatch) {
              console.log(
                `    ✅ Match por patrón (${keyword}): ${folderName}`
              );
            }
            return isMatch;
          });
          if (match) return match;
        }
      }
    }

    return null;
  }

  private findSimilarityMatch(
    folders: string[],
    fileNameWithoutExt: string
  ): string | null {
    const fileWords = fileNameWithoutExt
      .split(/[-_\s]+/)
      .filter((word) => word.length > 2);

    let maxMatches = 0;
    let bestCandidate: string | null = null;

    console.log(`    🔤 Palabras del archivo: [${fileWords.join(", ")}]`);

    for (const folderPath of folders) {
      const folderName = this.getFolderBaseName(folderPath).toLowerCase();
      const folderWords = folderName
        .split(/[-_\s]+/)
        .filter((word) => word.length > 2);

      let matches = 0;

      for (const fileWord of fileWords) {
        for (const folderWord of folderWords) {
          if (folderWord.includes(fileWord) || fileWord.includes(folderWord)) {
            matches++;
            console.log(
              `      🎯 Coincidencia: "${fileWord}" ↔ "${folderWord}"`
            );
          }
        }
      }

      if (matches > maxMatches && matches > 0) {
        maxMatches = matches;
        bestCandidate = folderPath;
        console.log(
          `      ⭐ Mejor candidato: ${this.getFolderBaseName(
            folderPath
          )} (${matches} coincidencias)`
        );
      }
    }

    if (bestCandidate) {
      console.log(
        `    ✅ Match por similitud: ${this.getFolderBaseName(bestCandidate)}`
      );
    }

    return bestCandidate;
  }

  private getFolderBaseName(folderPath: string): string {
    return folderPath.split(/[/\\]/).pop() || "";
  }
}
