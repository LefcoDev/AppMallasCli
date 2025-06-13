/**
 * Enhanced Menu Service for CLI Interface
 * Provides improved navigation flows with file/directory selection
 * Integrates with the enhanced file browser and icon services
 */

import {
  UserInterface,
  SelectOption,
} from "../../interfaces/user-interface.interface";
import {
  EnhancedFileBrowserService,
  FileBrowserOptions,
} from "./enhanced-file-browser.service";
import { IconService } from "./icon.service";
import { StatusIconService } from "./status-icon.service";
import { SpinnerService } from "./spinner.service";

export interface FileSelectionOptions {
  title: string;
  fileTypes?: string[];
  allowMultiple?: boolean;
  startPath?: string;
  mode?: "file" | "directory" | "both";
}

export interface RecentFilesManager {
  addRecentFile(filePath: string): void;
  getRecentFiles(limit?: number): string[];
  clearRecentFiles(): void;
}

export class EnhancedMenuService {
  private fileBrowser: EnhancedFileBrowserService;
  private spinnerService: SpinnerService;
  private recentFiles: string[] = [];

  constructor(private userInterface: UserInterface) {
    this.fileBrowser = new EnhancedFileBrowserService();
    this.spinnerService = SpinnerService.getInstance();
  }

  /**
   * Enhanced file selection with multiple options
   * @param options - File selection configuration
   * @returns Array of selected file paths
   */
  async selectFiles(options: FileSelectionOptions): Promise<string[]> {
    await this.userInterface.showMessage(
      `\n${IconService.format("search", options.title)}`
    );

    const choices: SelectOption[] = [
      {
        value: "BROWSE",
        label: IconService.format("folder", "Explorar archivos"),
        description:
          "Navegar a través de directorios para seleccionar archivos",
      },
      {
        value: "SEARCH",
        label: IconService.format("search", "Búsqueda rápida"),
        description: "Buscar archivos por patrón de nombre",
      },
      {
        value: "MANUAL",
        label: IconService.format("text", "Ingresar ruta manualmente"),
        description: "Escribir la ruta completa del archivo",
      },
    ];

    // Add recent files option if available
    if (this.recentFiles.length > 0) {
      choices.splice(2, 0, {
        value: "RECENT",
        label: IconService.format("arrow", "Archivos recientes"),
        description: "Seleccionar de archivos utilizados recientemente",
      });
    }

    choices.push({
      value: "CANCEL",
      label: IconService.format("cancel", "Cancelar"),
      description: "Volver al menú anterior",
    });

    const choice = await this.userInterface.selectOption(choices);

    switch (choice) {
      case "BROWSE":
        return await this.browseFiles(options);

      case "SEARCH":
        return await this.searchFiles(options);

      case "MANUAL":
        return await this.enterPathManually(options);

      case "RECENT":
        return await this.selectRecentFiles(options);

      default:
        return [];
    }
  }

  /**
   * Enhanced directory selection
   * @param options - Directory selection options
   * @returns Selected directory path
   */
  async selectDirectory(options: {
    title: string;
    startPath?: string;
  }): Promise<string> {
    await this.userInterface.showMessage(
      `\n${IconService.format("folder", options.title)}`
    );

    const choices: SelectOption[] = [
      {
        value: "BROWSE",
        label: IconService.format("folder", "Explorar directorios"),
        description: "Navegar para seleccionar directorio",
      },
      {
        value: "MANUAL",
        label: IconService.format("text", "Ingresar ruta manualmente"),
        description: "Escribir la ruta completa del directorio",
      },
      {
        value: "CURRENT",
        label: IconService.format("currentDirectory", "Usar directorio actual"),
        description: `Usar: ${process.cwd()}`,
      },
      {
        value: "CANCEL",
        label: IconService.format("cancel", "Cancelar"),
        description: "Volver al menú anterior",
      },
    ];

    const choice = await this.userInterface.selectOption(choices);

    switch (choice) {
      case "BROWSE":
        return await this.browseDirectory(options);

      case "MANUAL":
        return await this.enterDirectoryManually();

      case "CURRENT":
        return process.cwd();

      default:
        return "";
    }
  }

  /**
   * Smart file type detection and filtering
   * @param patterns - Array of patterns or file types
   * @returns Standardized file types array
   */
  getFileTypes(patterns?: string[]): string[] {
    if (!patterns || patterns.length === 0) return ["*"];

    const standardTypes: { [key: string]: string[] } = {
      excel: [".xlsx", ".xls"],
      csv: [".csv"],
      text: [".txt", ".log"],
      sql: [".sql"],
      data: [".xlsx", ".xls", ".csv", ".txt"],
    };

    const result: string[] = [];

    for (const pattern of patterns) {
      if (standardTypes[pattern.toLowerCase()]) {
        result.push(...standardTypes[pattern.toLowerCase()]);
      } else if (pattern.startsWith(".")) {
        result.push(pattern);
      } else {
        result.push(`.${pattern}`);
      }
    }

    return result.length > 0 ? result : ["*"];
  }

  /**
   * Display file selection summary
   * @param selectedFiles - Array of selected file paths
   * @param operation - Operation that will be performed
   */
  async displaySelectionSummary(
    selectedFiles: string[],
    operation: string
  ): Promise<boolean> {
    if (selectedFiles.length === 0) {
      await this.userInterface.showMessage(
        StatusIconService.warning("No se seleccionaron archivos.")
      );
      return false;
    }

    await this.userInterface.showMessage(
      `\n${IconService.format("success", "Archivos seleccionados:")}`
    );

    for (const file of selectedFiles) {
      const fileName = require("path").basename(file);
      const dirName = require("path").dirname(file);
      await this.userInterface.showMessage(
        `  ${IconService.getFileIcon(file)} ${fileName} ${IconService.get(
          "arrow"
        )} ${dirName}`
      );
    }

    await this.userInterface.showMessage(
      `\n${IconService.format(
        "info",
        `Total: ${selectedFiles.length} archivo(s) para ${operation}`
      )}`
    );

    return await this.userInterface.confirmAction(
      `¿Proceder con ${operation} de ${selectedFiles.length} archivo(s)?`
    );
  }
  /**
   * Browse files using enhanced file browser
   */
  private async browseFiles(options: FileSelectionOptions): Promise<string[]> {
    const browserOptions: FileBrowserOptions = {
      startPath: options.startPath,
      fileTypes: this.getFileTypes(options.fileTypes),
      allowMultiSelect: options.allowMultiple || false,
      showHidden: false,
      mode: options.mode || "file",
      maxDepth: 10,
      sortBy: "name",
      sortOrder: "asc",
      showPreview: true, // Enable file preview
      enableBreadcrumbs: true, // Enable breadcrumb navigation
    };

    const selectedFiles = await this.fileBrowser.browseAndSelect(
      browserOptions
    );

    // Add to recent files
    selectedFiles.forEach((file) => this.addRecentFile(file));

    return selectedFiles;
  }
  /**
   * Browse directories using enhanced browser
   */
  private async browseDirectory(options: {
    startPath?: string;
  }): Promise<string> {
    const browserOptions: FileBrowserOptions = {
      startPath: options.startPath,
      allowMultiSelect: false,
      showHidden: false,
      mode: "directory",
      showPreview: false, // No preview for directories
      enableBreadcrumbs: true, // Enable breadcrumb navigation
    };

    const selected = await this.fileBrowser.browseAndSelect(browserOptions);
    return selected[0] || "";
  }

  /**
   * Search files using enhanced search
   */
  private async searchFiles(options: FileSelectionOptions): Promise<string[]> {
    const pattern = await this.userInterface.askQuestion(
      `${IconService.get("search")} Patrón de búsqueda (nombre del archivo):`
    );

    if (!pattern.trim()) {
      await this.userInterface.showMessage(
        StatusIconService.error("El patrón de búsqueda no puede estar vacío")
      );
      return [];
    }

    const browserOptions: FileBrowserOptions = {
      startPath: options.startPath,
      fileTypes: this.getFileTypes(options.fileTypes),
      allowMultiSelect: false,
      showHidden: false,
      mode: options.mode || "file",
      maxDepth: 5,
    };

    const results = await this.fileBrowser.quickSearch(pattern, browserOptions);

    // Add to recent files
    results.forEach((file) => this.addRecentFile(file));

    return results;
  }

  /**
   * Manual path entry with validation
   */
  private async enterPathManually(
    options: FileSelectionOptions
  ): Promise<string[]> {
    if (options.allowMultiple) {
      await this.userInterface.showMessage(
        StatusIconService.info(
          "💡 Ingresa múltiples rutas separadas por punto y coma (;)"
        )
      );
    }

    const input = await this.userInterface.askQuestion(
      `${IconService.get("text")} Ruta(s) del archivo:`
    );

    if (!input.trim()) return [];
    const paths = options.allowMultiple
      ? input
          .split(";")
          .map((p: string) => p.trim())
          .filter((p: string) => p)
      : [input.trim()];

    // Validate paths
    const validPaths: string[] = [];
    const fs = require("fs").promises;

    for (const filePath of paths) {
      try {
        await fs.access(filePath);
        validPaths.push(filePath);
        this.addRecentFile(filePath);
      } catch {
        await this.userInterface.showMessage(
          StatusIconService.error(`Archivo no encontrado: ${filePath}`)
        );
      }
    }

    return validPaths;
  }

  /**
   * Manual directory entry with validation
   */
  private async enterDirectoryManually(): Promise<string> {
    const input = await this.userInterface.askQuestion(
      `${IconService.get("folder")} Ruta del directorio:`
    );

    if (!input.trim()) return "";

    const fs = require("fs").promises;
    try {
      const stats = await fs.stat(input.trim());
      if (stats.isDirectory()) {
        return input.trim();
      } else {
        await this.userInterface.showMessage(
          StatusIconService.error("La ruta especificada no es un directorio")
        );
        return "";
      }
    } catch {
      await this.userInterface.showMessage(
        StatusIconService.error(`Directorio no encontrado: ${input}`)
      );
      return "";
    }
  }

  /**
   * Select from recent files
   */
  private async selectRecentFiles(
    options: FileSelectionOptions
  ): Promise<string[]> {
    if (this.recentFiles.length === 0) {
      await this.userInterface.showMessage(
        StatusIconService.warning("No hay archivos recientes disponibles")
      );
      return [];
    }

    const choices: SelectOption[] = this.recentFiles
      .slice(0, 10) // Show last 10 files
      .map((file, index) => {
        const fileName = require("path").basename(file);
        const dirName = require("path").dirname(file);
        return {
          value: index.toString(),
          label: `${IconService.getFileIcon(file)} ${fileName}`,
          description: dirName,
        };
      });

    choices.push({
      value: "CLEAR",
      label: IconService.format("cancel", "Limpiar historial"),
      description: "Eliminar todos los archivos recientes",
    });

    choices.push({
      value: "CANCEL",
      label: IconService.format("cancel", "Cancelar"),
      description: "Volver al menú de selección",
    });

    const choice = await this.userInterface.selectOption(choices);

    if (choice === "CANCEL") return [];
    if (choice === "CLEAR") {
      this.clearRecentFiles();
      await this.userInterface.showMessage(
        StatusIconService.success("Historial limpiado")
      );
      return [];
    }

    const fileIndex = parseInt(choice);
    const selectedFile = this.recentFiles[fileIndex];

    // Validate file still exists
    const fs = require("fs").promises;
    try {
      await fs.access(selectedFile);
      return [selectedFile];
    } catch {
      await this.userInterface.showMessage(
        StatusIconService.error(`El archivo ya no existe: ${selectedFile}`)
      );
      // Remove from recent files
      this.recentFiles.splice(fileIndex, 1);
      return [];
    }
  }

  /**
   * Add file to recent files list
   */
  private addRecentFile(filePath: string): void {
    // Remove if already exists
    const index = this.recentFiles.indexOf(filePath);
    if (index !== -1) {
      this.recentFiles.splice(index, 1);
    }

    // Add to beginning
    this.recentFiles.unshift(filePath);

    // Keep only last 20 files
    if (this.recentFiles.length > 20) {
      this.recentFiles = this.recentFiles.slice(0, 20);
    }
  }

  /**
   * Clear recent files list
   */
  private clearRecentFiles(): void {
    this.recentFiles = [];
  }

  /**
   * Get recent files (for external access)
   */
  getRecentFiles(limit: number = 10): string[] {
    return this.recentFiles.slice(0, limit);
  }
}
