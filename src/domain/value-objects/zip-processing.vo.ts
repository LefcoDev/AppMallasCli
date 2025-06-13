/**
 * @fileoverview Value Objects para el procesamiento de archivos ZIP
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

/**
 * Value Object que representa el resultado del mapeo de archivos
 */
export class FolderMapping {
  constructor(
    public readonly targetFolder: string,
    public readonly txtFiles: readonly string[]
  ) {}

  /**
   * Agrega un archivo TXT al mapping
   */
  addFile(fileName: string): FolderMapping {
    return new FolderMapping(this.targetFolder, [...this.txtFiles, fileName]);
  }

  /**
   * Obtiene el nombre base de la carpeta
   */
  get folderName(): string {
    return this.targetFolder.split(/[/\\]/).pop() || "";
  }
}

/**
 * Value Object que representa el contexto de origen de un archivo
 */
export class SourceContext {
  private static readonly VALID_CONTEXTS = [
    "admision",
    "alumnos",
    "persona_general",
  ] as const;

  constructor(public readonly value: string) {
    if (!SourceContext.VALID_CONTEXTS.includes(value as any)) {
      throw new Error(`Contexto inválido: ${value}`);
    }
  }

  /**
   * Detecta el contexto basado en una ruta
   */
  static detectFromPath(originalPath: string): SourceContext | null {
    const pathLower = originalPath.toLowerCase();

    const admisionPatterns = [
      "admision",
      "admisión",
      "admission",
      "ingreso",
      "postulante",
      "postulacion",
      "candidato",
      "aspirante",
      "nuevo",
      "inscripcion",
    ];

    const alumnosPatterns = [
      "alumno",
      "student",
      "estudiante",
      "matricula",
      "cursando",
      "activo",
      "vigente",
      "actual",
    ];

    for (const pattern of admisionPatterns) {
      if (pathLower.includes(pattern)) {
        return new SourceContext("admision");
      }
    }

    for (const pattern of alumnosPatterns) {
      if (pathLower.includes(pattern)) {
        return new SourceContext("alumnos");
      }
    }

    return null;
  }

  /**
   * Obtiene los patrones asociados al contexto
   */
  getPatterns(): string[] {
    switch (this.value) {
      case "admision":
        return ["admision", "admisión", "admission", "ingreso", "postulante"];
      case "alumnos":
        return ["alumno", "alumnos", "student", "estudiante", "matricula"];
      case "persona_general":
        return ["persona", "general"];
      default:
        return [];
    }
  }

  equals(other: SourceContext): boolean {
    return this.value === other.value;
  }
}

/**
 * Value Object que representa estadísticas de procesamiento
 */
export class ProcessingStats {
  constructor(
    public readonly totalFiles: number,
    public readonly mappedFiles: number,
    public readonly unmappedFiles: number,
    public readonly contextFiles: number,
    public readonly duplicateFiles: number,
    public readonly availableFolders: number
  ) {}

  get mappingRate(): number {
    return this.totalFiles > 0 ? (this.mappedFiles / this.totalFiles) * 100 : 0;
  }

  get contextRate(): number {
    return this.totalFiles > 0
      ? (this.contextFiles / this.totalFiles) * 100
      : 0;
  }

  static create(
    totalFiles: number,
    mappedFiles: number,
    contextFiles: number,
    duplicateFiles: number,
    availableFolders: number
  ): ProcessingStats {
    return new ProcessingStats(
      totalFiles,
      mappedFiles,
      totalFiles - mappedFiles,
      contextFiles,
      duplicateFiles,
      availableFolders
    );
  }
}
