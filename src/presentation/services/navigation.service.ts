/**
 * @fileoverview Servicio de navegación unificado
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

import { UserInterface } from "../interfaces/user-interface.interface";
import { EnhancedMenuService } from "../cli/services/enhanced-menu.service";

export interface FileSelectionOptions {
  startPath?: string;
  extensions?: string[];
  message?: string;
  allowMultiple?: boolean;
}

export interface DirectorySelectionOptions {
  startPath?: string;
  message?: string;
  allowCreate?: boolean;
}

export interface NavigationService {
  /**
   * Selecciona un archivo usando el navegador mejorado
   */
  selectFile(options: FileSelectionOptions): Promise<string | null>;

  /**
   * Selecciona múltiples archivos
   */
  selectFiles(options: FileSelectionOptions): Promise<string[]>;

  /**
   * Selecciona un directorio
   */
  selectDirectory(options: DirectorySelectionOptions): Promise<string | null>;
}

/**
 * Implementación del servicio de navegación
 * Utiliza los servicios de navegación existentes del proyecto
 */
export class NavigationServiceImpl implements NavigationService {
  constructor(private readonly userInterface: UserInterface) {}

  async selectFile(options: FileSelectionOptions): Promise<string | null> {
    const enhancedMenu = new EnhancedMenuService(this.userInterface);

    const files = await enhancedMenu.selectFiles({
      title: options.message || "Selecciona un archivo",
      startPath: options.startPath,
      fileTypes: options.extensions,
      allowMultiple: false,
      mode: "file",
    });

    return files.length > 0 ? files[0] : null;
  }

  async selectFiles(options: FileSelectionOptions): Promise<string[]> {
    const enhancedMenu = new EnhancedMenuService(this.userInterface);

    return await enhancedMenu.selectFiles({
      title: options.message || "Selecciona archivos",
      startPath: options.startPath,
      fileTypes: options.extensions,
      allowMultiple: options.allowMultiple !== false,
      mode: "file",
    });
  }

  async selectDirectory(
    options: DirectorySelectionOptions
  ): Promise<string | null> {
    const enhancedMenu = new EnhancedMenuService(this.userInterface);

    const directory = await enhancedMenu.selectDirectory({
      title: options.message || "Selecciona un directorio",
      startPath: options.startPath,
    });

    return directory || null;
  }
}
