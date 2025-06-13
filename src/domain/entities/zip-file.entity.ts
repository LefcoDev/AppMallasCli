/**
 * @fileoverview Entidad que representa un archivo ZIP para procesamiento
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

export interface ZipFileProperties {
  zipPath: string;
  extractPath: string;
  outputPath: string;
  searchPath: string;
}

/**
 * Entidad ZipFile - Representa un archivo ZIP a procesar
 * Mantiene información sobre rutas de extracción y procesamiento
 */
export class ZipFile {
  constructor(private props: ZipFileProperties) {}

  get zipPath(): string {
    return this.props.zipPath;
  }

  get extractPath(): string {
    return this.props.extractPath;
  }

  get outputPath(): string {
    return this.props.outputPath;
  }

  get searchPath(): string {
    return this.props.searchPath;
  }

  get fileName(): string {
    return this.zipPath.split(/[/\\]/).pop() || "";
  }

  /**
   * Valida si las rutas del ZIP son válidas
   */
  isValid(): boolean {
    return (
      this.zipPath.length > 0 &&
      this.extractPath.length > 0 &&
      this.outputPath.length > 0 &&
      this.searchPath.length > 0
    );
  }

  /**
   * Crea una nueva instancia de ZipFile
   */
  static create(props: ZipFileProperties): ZipFile {
    return new ZipFile(props);
  }
}
