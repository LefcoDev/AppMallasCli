/**
 * @fileoverview Repositorio para operaciones de archivos ZIP
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

export interface ZipRepository {
  /**
   * Extrae un archivo ZIP en la ruta especificada
   */
  extractZip(zipPath: string, extractPath: string): Promise<void>;

  /**
   * Verifica si un archivo ZIP existe
   */
  zipExists(zipPath: string): Promise<boolean>;

  /**
   * Limpia archivos temporales
   */
  cleanup(extractPath: string): Promise<void>;
}
