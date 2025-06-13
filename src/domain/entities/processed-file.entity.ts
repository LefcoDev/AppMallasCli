/**
 * @fileoverview Entidad que representa un archivo procesado desde ZIP
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

export interface ProcessedFileProperties {
  originalPath: string;
  fileName: string;
  folderName: string;
  newPath: string;
  matchedFolder?: string;
  sourceContext?: string;
}

/**
 * Entidad ProcessedFile - Representa un archivo extraído y procesado desde ZIP
 * Mantiene información de mapeo y contexto
 */
export class ProcessedFile {
  constructor(private props: ProcessedFileProperties) {}

  get originalPath(): string {
    return this.props.originalPath;
  }

  get fileName(): string {
    return this.props.fileName;
  }

  get folderName(): string {
    return this.props.folderName;
  }

  get newPath(): string {
    return this.props.newPath;
  }

  get matchedFolder(): string | undefined {
    return this.props.matchedFolder;
  }

  get sourceContext(): string | undefined {
    return this.props.sourceContext;
  }

  get fileNameWithoutExtension(): string {
    return this.fileName.replace(/\.[^/.]+$/, "");
  }

  /**
   * Indica si el archivo fue mapeado exitosamente
   */
  isMapped(): boolean {
    return !!this.matchedFolder;
  }

  /**
   * Indica si es un archivo duplicado conocido
   */
  isDuplicate(): boolean {
    const duplicateFiles = ["sorlcur.txt", "sorlfos.txt"];
    return duplicateFiles.includes(this.fileName.toLowerCase());
  }

  /**
   * Indica si tiene contexto específico detectado
   */
  hasContext(): boolean {
    return !!this.sourceContext;
  }

  /**
   * Actualiza la ruta de destino del archivo
   */
  updateDestinationPath(newPath: string): void {
    this.props.newPath = newPath;
  }

  /**
   * Establece la carpeta coincidente
   */
  setMatchedFolder(folderPath: string): void {
    this.props.matchedFolder = folderPath;
  }

  /**
   * Crea una nueva instancia de ProcessedFile
   */
  static create(props: ProcessedFileProperties): ProcessedFile {
    return new ProcessedFile(props);
  }
}
