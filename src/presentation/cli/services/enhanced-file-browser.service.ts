/**
 * Enhanced File Browser Service for CLI Interface
 * Provides intuitive file and directory navigation with modern icons
 * Integrates with the IconService for consistent visual experience
 */

import { promises as fs } from "fs";
import * as path from "path";
import inquirer from "inquirer";
import { IconService } from "./icon.service";
import { StatusIconService } from "./status-icon.service";
import { ControllerUtils } from "../../utils/controller.utils";
import { SpinnerService } from "./spinner.service";

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory" | "parent";
  size?: number;
  extension?: string;
  isExcel?: boolean;
  isHidden?: boolean;
  lastModified?: Date;
  preview?: string; // Preview content for small files
  isImage?: boolean;
  mimeType?: string;
}

export interface FileBrowserOptions {
  startPath?: string;
  fileTypes?: string[];
  allowMultiSelect?: boolean;
  showHidden?: boolean;
  mode: "file" | "directory" | "both";
  maxDepth?: number;
  maxFiles?: number;
  sortBy?: "name" | "size" | "date";
  sortOrder?: "asc" | "desc";
  showPreview?: boolean; // Show file preview
  enableBreadcrumbs?: boolean; // Show navigation breadcrumbs
}

export interface FileBrowserResult {
  selectedPaths: string[];
  cancelled: boolean;
  totalFiles: number;
  totalDirectories: number;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
  isRoot?: boolean;
}

export class EnhancedFileBrowserService {
  private spinnerService: SpinnerService;
  private history: string[] = []; // For back navigation
  private forwardHistory: string[] = []; // For forward navigation
  private favoriteDirectories: string[] = []; // Quick access directories

  constructor() {
    this.spinnerService = SpinnerService.getInstance();
    this.initializeFavorites();
  }

  /**
   * Initialize common favorite directories
   */
  private initializeFavorites(): void {
    this.favoriteDirectories = [
      process.cwd(), // Current working directory
      "./data", // Data folder
      "./output", // Output folder
      "./src", // Source folder
      require("os").homedir(), // User home directory
    ].filter((dir) => {
      try {
        require("fs").accessSync(dir);
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Add directory to favorites
   * @param dirPath Directory path to add
   */
  addToFavorites(dirPath: string): void {
    if (!this.favoriteDirectories.includes(dirPath)) {
      this.favoriteDirectories.unshift(dirPath);
      // Keep only last 10 favorites
      this.favoriteDirectories = this.favoriteDirectories.slice(0, 10);
    }
  }

  /**
   * Show quick access menu for favorite directories
   * @returns Selected directory path or null
   */
  private async showQuickAccess(): Promise<string | null> {
    const choices = this.favoriteDirectories.map((dir, index) => ({
      name: `${IconService.get("folder")} ${require("path").basename(
        dir
      )} ${IconService.get("arrow")} ${dir}`,
      value: index.toString(),
      short: require("path").basename(dir),
    }));

    choices.push({
      name: `${IconService.get("cancel")} Cancelar`,
      value: "CANCEL",
      short: "Cancelar",
    });

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "selection",
        message: `${IconService.get("search")} Acceso rápido:`,
        choices,
        pageSize: 10,
      },
    ]);

    if (answer.selection === "CANCEL") return null;
    return this.favoriteDirectories[parseInt(answer.selection)];
  }

  /**
   * Generate breadcrumb navigation for current path
   * @param currentPath - Current directory path
   * @returns Array of breadcrumb items
   */
  private generateBreadcrumbs(currentPath: string): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    const pathParts = currentPath.split(path.sep);
    let buildPath = "";

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      if (i === 0) {
        // Root drive/directory
        buildPath = part || path.sep;
        breadcrumbs.push({
          name: part || "Root",
          path: buildPath,
          isRoot: true,
        });
      } else if (part) {
        buildPath = path.join(buildPath, part);
        breadcrumbs.push({
          name: part,
          path: buildPath,
        });
      }
    }

    return breadcrumbs;
  }
  /**
   * Display breadcrumb navigation
   * @param currentPath - Current directory path
   */
  private displayBreadcrumbs(currentPath: string): void {
    const breadcrumbs = this.generateBreadcrumbs(currentPath);
    const breadcrumbText = breadcrumbs
      .map((crumb, index) => {
        const icon = crumb.isRoot
          ? IconService.get("folder")
          : IconService.get("folder");
        const isLast = index === breadcrumbs.length - 1;
        return isLast
          ? `${icon} ${crumb.name}`
          : `${icon} ${crumb.name} ${IconService.get("arrow")}`;
      })
      .join(" ");

    console.log(`\n${breadcrumbText}`);
    console.log(IconService.separator(Math.min(breadcrumbText.length, 80)));
  }

  /**
   * Get file preview content for small text files
   * @param filePath - Path to file
   * @returns Preview content or null
   */
  private async getFilePreview(filePath: string): Promise<string | null> {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();

      // Only preview small text files
      if (stats.size > 1024 * 10) return null; // Max 10KB

      const textExtensions = [
        ".txt",
        ".log",
        ".md",
        ".json",
        ".yml",
        ".yaml",
        ".ini",
        ".cfg",
        ".conf",
      ];
      if (!textExtensions.includes(ext)) return null;

      const content = await fs.readFile(filePath, "utf8");
      const lines = content.split("\n").slice(0, 3); // First 3 lines
      return (
        lines.join("\n").substring(0, 100) + (content.length > 100 ? "..." : "")
      );
    } catch {
      return null;
    }
  }
  /**
   * Add current path to navigation history
   * @param currentPath - Current directory path
   */
  private addToHistory(currentPath: string): void {
    // If we're navigating to a new path, clear forward history
    if (
      this.history.length > 0 &&
      this.history[this.history.length - 1] !== currentPath
    ) {
      this.forwardHistory = [];
    }

    // Don't add duplicate consecutive paths
    if (this.history[this.history.length - 1] !== currentPath) {
      this.history.push(currentPath);

      // Keep history reasonable size
      if (this.history.length > 50) {
        this.history = this.history.slice(-50);
      }
    }
  }

  /**
   * Navigate back in history
   * @returns Previous path or null
   */
  private goBack(): string | null {
    if (this.history.length > 1) {
      const currentPath = this.history.pop()!;
      this.forwardHistory.push(currentPath);
      return this.history[this.history.length - 1];
    }
    return null;
  }

  /**
   * Navigate forward in history
   * @returns Next path or null
   */
  private goForward(): string | null {
    if (this.forwardHistory.length > 0) {
      const nextPath = this.forwardHistory.pop()!;
      this.history.push(nextPath);
      return nextPath;
    }
    return null;
  }
  /**
   * Main file browser interface
   * @param options - Browser configuration
   * @returns Selected files/directories or empty array if cancelled
   */
  async browseAndSelect(options: FileBrowserOptions): Promise<string[]> {
    let currentPath = options.startPath || process.cwd();
    let selectedFiles: string[] = [];
    const maxFiles = options.maxFiles || 50;

    // Initialize navigation history
    this.addToHistory(currentPath);

    while (true) {
      const items = await this.getDirectoryItems(currentPath, options);
      const displayItems = items.slice(0, maxFiles);

      if (items.length > maxFiles) {
        console.log(
          StatusIconService.warning(
            `Mostrando ${maxFiles} de ${items.length} elementos encontrados`
          )
        );
      }

      const choice = await this.displayFileBrowser(
        currentPath,
        displayItems,
        selectedFiles,
        options
      );

      const result = await this.handleBrowserChoice(
        choice,
        currentPath,
        items,
        selectedFiles,
        options
      );

      if (result.action === "done") {
        return result.selectedFiles;
      } else if (result.action === "cancel") {
        return [];
      } else if (result.action === "navigate") {
        const newPath = result.newPath!;
        if (newPath !== currentPath) {
          this.addToHistory(newPath);
        }
        currentPath = newPath;
      }
    }
  }

  /**
   * Quick search functionality
   * @param searchPattern - Pattern to search for
   * @param options - Search options
   * @returns Array of matching file paths
   */
  async quickSearch(
    searchPattern: string,
    options: FileBrowserOptions
  ): Promise<string[]> {
    const startPath = options.startPath || process.cwd();
    const results: FileItem[] = [];

    this.spinnerService.startPreset(
      "searching",
      `Buscando "${searchPattern}"...`
    );

    try {
      await this.searchRecursive(startPath, searchPattern, results, options, 0);
      this.spinnerService.succeed(`Encontrados ${results.length} archivos`);

      if (results.length === 0) {
        console.log(
          StatusIconService.warning(
            "No se encontraron archivos que coincidan con el patrón."
          )
        );
        return [];
      }

      return await this.selectFromSearchResults(results);
    } catch (error) {
      this.spinnerService.fail(
        `Error en la búsqueda: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
      return [];
    }
  }

  /**
   * Get directory contents with metadata
   * @param dirPath - Directory to read
   * @param options - Browser options
   * @returns Array of file items
   */
  private async getDirectoryItems(
    dirPath: string,
    options: FileBrowserOptions
  ): Promise<FileItem[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items: FileItem[] = [];

      for (const entry of entries) {
        // Skip hidden files unless specifically requested
        if (!options.showHidden && entry.name.startsWith(".")) continue;

        const fullPath = path.join(dirPath, entry.name);

        try {
          const stats = await fs.stat(fullPath);

          if (entry.isDirectory()) {
            items.push({
              name: entry.name,
              path: fullPath,
              type: "directory",
              isHidden: entry.name.startsWith("."),
              lastModified: stats.mtime,
            });
          } else if (entry.isFile() && options.mode !== "directory") {
            const ext = path.extname(entry.name).toLowerCase();
            const isValidFile =
              !options.fileTypes ||
              options.fileTypes.includes(ext) ||
              options.fileTypes.includes("*");

            if (isValidFile) {
              const fileItem: FileItem = {
                name: entry.name,
                path: fullPath,
                type: "file",
                size: stats.size,
                extension: ext,
                isExcel: [".xlsx", ".xls", ".csv"].includes(ext),
                isImage: [
                  ".jpg",
                  ".jpeg",
                  ".png",
                  ".gif",
                  ".bmp",
                  ".svg",
                ].includes(ext),
                isHidden: entry.name.startsWith("."),
                lastModified: stats.mtime,
              }; // Add preview for small text files if enabled
              if (options.showPreview) {
                const preview = await this.getFilePreview(fullPath);
                if (preview) {
                  fileItem.preview = preview;
                }
              }

              items.push(fileItem);
            }
          }
        } catch (statError) {
          // Skip files we can't stat (permissions, etc.)
          continue;
        }
      }

      return this.sortItems(items, options);
    } catch (error) {
      console.log(
        StatusIconService.error(
          `Error leyendo directorio: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`
        )
      );
      return [];
    }
  }

  /**
   * Sort file items based on options
   * @param items - Items to sort
   * @param options - Sort options
   * @returns Sorted items
   */
  private sortItems(
    items: FileItem[],
    options: FileBrowserOptions
  ): FileItem[] {
    const sortBy = options.sortBy || "name";
    const sortOrder = options.sortOrder || "asc";
    const multiplier = sortOrder === "asc" ? 1 : -1;

    return items.sort((a, b) => {
      // Always put directories first
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }

      let comparison = 0;
      switch (sortBy) {
        case "size":
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case "date":
          comparison =
            (a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0);
          break;
        case "name":
        default:
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return comparison * multiplier;
    });
  }
  /**
   * Display the file browser interface
   * @param currentPath - Current directory path
   * @param items - Items to display
   * @param selectedFiles - Currently selected files
   * @param options - Browser options
   * @returns User's choice
   */
  private async displayFileBrowser(
    currentPath: string,
    items: FileItem[],
    selectedFiles: string[],
    options: FileBrowserOptions
  ): Promise<string> {
    // Clear screen and show header with breadcrumbs
    console.clear();

    if (options.enableBreadcrumbs !== false) {
      this.displayBreadcrumbs(currentPath);
    } else {
      console.log(`\n${IconService.get("folder")} ${currentPath}`);
      console.log(IconService.separator(60));
    }

    if (selectedFiles.length > 0) {
      console.log(
        StatusIconService.info(
          `Seleccionados: ${selectedFiles.length} archivo(s)`
        )
      );
    }

    // Create choices for inquirer
    const choices: any[] = [];

    // Back/Forward navigation buttons
    const canGoBack = this.history.length > 1;
    const canGoForward = this.forwardHistory.length > 0;

    if (canGoBack || canGoForward) {
      if (canGoBack) {
        choices.push({
          name: `${IconService.get("previous")} Ir atrás`,
          value: "BACK",
          short: "Atrás",
        });
      }
      if (canGoForward) {
        choices.push({
          name: `${IconService.get("next")} Ir adelante`,
          value: "FORWARD",
          short: "Adelante",
        });
      }
      choices.push({ type: "separator" });
    }

    // Navigation: Up directory
    if (currentPath !== path.parse(currentPath).root) {
      choices.push({
        name: `${IconService.getDirectoryIcon(true)} .. (Directorio padre)`,
        value: "UP",
        short: "..",
      });
    }

    // Current directory selection (if mode allows)
    if (options.mode !== "file") {
      choices.push({
        name: `${IconService.get(
          "currentDirectory"
        )} Seleccionar directorio actual`,
        value: "CURRENT_DIR",
        short: "Actual",
      });
    }

    // Add separator before file/directory items
    if (choices.length > 0) {
      choices.push({ type: "separator" });
    } // Directory and file items
    items.forEach((item, index) => {
      const icon = this.getItemIcon(item);
      const isSelected = selectedFiles.includes(item.path);
      const selectedMark = isSelected ? ` ${IconService.get("selected")}` : "";

      // Mejorar la construcción del sizeInfo con validaciones
      const formatSize = item.size
        ? ControllerUtils.formatFileSize(item.size)
        : null;
      const sizeInfo = formatSize ? ` (${formatSize})` : "";

      // Enhanced display with preview and metadata
      let displayName = `${icon} ${item.name}${selectedMark}${sizeInfo}`;

      // Add file type indicators with validaciones
      if (item.isExcel) {
        const excelIcon = IconService.get("excel") || "📊";
        displayName += ` ${excelIcon}`;
      } else if (item.isImage) {
        displayName += ` 🖼️`;
      }

      // Add preview text if available con validación
      if (
        item.preview &&
        typeof item.preview === "string" &&
        item.preview.trim()
      ) {
        const infoIcon = IconService.get("info") || "ℹ️";
        displayName += `\n    ${infoIcon} ${item.preview}`;
      }

      // Add last modified info for files con validaciones
      if (item.type === "file" && item.lastModified) {
        try {
          const timeAgo = this.getTimeAgo(item.lastModified);
          if (timeAgo && typeof timeAgo === "string" && timeAgo.trim()) {
            displayName += ` • ${timeAgo}`;
          }
        } catch (error) {
          // Silenciar errores de timeAgo para evitar undefined
        }
      }

      choices.push({
        name: displayName,
        value: `SELECT_${index}`,
        short: item.name,
      });
    });

    // Add actions separator
    choices.push({ type: "separator" });

    // Search option
    choices.push({
      name: `${IconService.get("search")} Búsqueda rápida`,
      value: "SEARCH",
      short: "Buscar",
    });

    // Quick access to favorites
    if (this.favoriteDirectories.length > 0) {
      choices.push({
        name: `${IconService.get("folder")} Acceso rápido`,
        value: "QUICK_ACCESS",
        short: "Rápido",
      });
    }

    // Add current directory to favorites
    choices.push({
      name: `${IconService.get("selected")} Marcar como favorito`,
      value: "ADD_FAVORITE",
      short: "Favorito",
    });

    // Multi-select actions
    if (options.allowMultiSelect && selectedFiles.length > 0) {
      choices.push({
        name: `${IconService.get("selected")} Finalizar (${
          selectedFiles.length
        } seleccionados)`,
        value: "DONE",
        short: "Finalizar",
      });

      choices.push({
        name: `${IconService.get("cancel")} Limpiar selección`,
        value: "CLEAR",
        short: "Limpiar",
      });
    }

    // Cancel option
    choices.push({
      name: `${IconService.get("cancel")} Cancelar`,
      value: "CANCEL",
      short: "Cancelar",
    });

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "choice",
        message: `${IconService.get("pointer")} Selecciona una opción:`,
        choices,
        pageSize: 20,
        loop: false,
      },
    ]);

    return answer.choice;
  }

  /**
   * Handle user choice in browser
   * @param choice - User's choice
   * @param currentPath - Current directory
   * @param items - Available items
   * @param selectedFiles - Selected files array
   * @param options - Browser options
   * @returns Action result
   */
  private async handleBrowserChoice(
    choice: string,
    currentPath: string,
    items: FileItem[],
    selectedFiles: string[],
    options: FileBrowserOptions
  ): Promise<{
    action: "done" | "cancel" | "navigate";
    selectedFiles: string[];
    newPath?: string;
  }> {
    switch (choice) {
      case "DONE":
        return { action: "done", selectedFiles };

      case "CANCEL":
        return { action: "cancel", selectedFiles: [] };

      case "BACK":
        const backPath = this.goBack();
        if (backPath) {
          return {
            action: "navigate",
            selectedFiles,
            newPath: backPath,
          };
        }
        return { action: "navigate", selectedFiles, newPath: currentPath };

      case "FORWARD":
        const forwardPath = this.goForward();
        if (forwardPath) {
          return {
            action: "navigate",
            selectedFiles,
            newPath: forwardPath,
          };
        }
        return { action: "navigate", selectedFiles, newPath: currentPath };

      case "UP":
        return {
          action: "navigate",
          selectedFiles,
          newPath: path.dirname(currentPath),
        };

      case "CURRENT_DIR":
        return { action: "done", selectedFiles: [currentPath] };
      case "SEARCH":
        const searchResults = await this.handleQuickSearch(
          currentPath,
          options
        );
        if (searchResults.length > 0) {
          if (options.allowMultiSelect) {
            selectedFiles.push(...searchResults);
          } else {
            return { action: "done", selectedFiles: searchResults };
          }
        }
        return { action: "navigate", selectedFiles, newPath: currentPath };

      case "QUICK_ACCESS":
        const quickPath = await this.showQuickAccess();
        if (quickPath) {
          return {
            action: "navigate",
            selectedFiles,
            newPath: quickPath,
          };
        }
        return { action: "navigate", selectedFiles, newPath: currentPath };

      case "ADD_FAVORITE":
        this.addToFavorites(currentPath);
        console.log(
          StatusIconService.success(
            `Directorio marcado como favorito: ${currentPath}`
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Brief pause to show message
        return { action: "navigate", selectedFiles, newPath: currentPath };

      case "CLEAR":
        selectedFiles.length = 0;
        return { action: "navigate", selectedFiles, newPath: currentPath };

      default:
        if (choice.startsWith("SELECT_")) {
          const index = parseInt(choice.replace("SELECT_", ""));
          const item = items[index];

          if (item.type === "directory") {
            return {
              action: "navigate",
              selectedFiles,
              newPath: item.path,
            };
          } else if (item.type === "file") {
            if (options.allowMultiSelect) {
              this.toggleSelection(selectedFiles, item.path);
              return {
                action: "navigate",
                selectedFiles,
                newPath: currentPath,
              };
            } else {
              return { action: "done", selectedFiles: [item.path] };
            }
          }
        }
        return { action: "navigate", selectedFiles, newPath: currentPath };
    }
  }

  /**
   * Handle quick search from browser
   * @param currentPath - Current directory
   * @param options - Browser options
   * @returns Selected files from search
   */ private async handleQuickSearch(
    currentPath: string,
    options: FileBrowserOptions
  ): Promise<string[]> {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "pattern",
        message: `${IconService.get("search")} Patrón de búsqueda:`,
        validate: (input: string) =>
          input.trim().length > 0 || "Ingresa un patrón válido",
      },
    ]);

    if (!answer.pattern.trim()) return [];

    return await this.quickSearch(answer.pattern, {
      ...options,
      startPath: currentPath,
    });
  }

  /**
   * Select files from search results
   * @param results - Search results
   * @returns Selected file paths
   */
  private async selectFromSearchResults(
    results: FileItem[]
  ): Promise<string[]> {
    if (results.length === 1) {
      return [results[0].path];
    }

    const choices = results.map((item, index) => ({
      name: `${this.getItemIcon(item)} ${item.name} ${path.dirname(item.path)}`,
      value: index.toString(),
      short: item.name,
    }));

    choices.push({
      name: `${IconService.get("cancel")} Cancelar búsqueda`,
      value: "CANCEL",
      short: "Cancelar",
    });

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "selection",
        message: `${IconService.get("search")} Selecciona un archivo:`,
        choices,
        pageSize: 15,
      },
    ]);

    if (answer.selection === "CANCEL") return [];

    const selectedItem = results[parseInt(answer.selection)];
    return [selectedItem.path];
  }

  /**
   * Recursive search implementation
   * @param dirPath - Directory to search
   * @param pattern - Search pattern
   * @param results - Results array
   * @param options - Search options
   * @param depth - Current depth
   */
  private async searchRecursive(
    dirPath: string,
    pattern: string,
    results: FileItem[],
    options: FileBrowserOptions,
    depth: number
  ): Promise<void> {
    if (options.maxDepth && depth > options.maxDepth) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!options.showHidden && entry.name.startsWith(".")) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (
          entry.isFile() &&
          entry.name.toLowerCase().includes(pattern.toLowerCase())
        ) {
          const ext = path.extname(entry.name).toLowerCase();
          const isValidFile =
            !options.fileTypes ||
            options.fileTypes.includes(ext) ||
            options.fileTypes.includes("*");

          if (isValidFile) {
            try {
              const stats = await fs.stat(fullPath);
              results.push({
                name: entry.name,
                path: fullPath,
                type: "file",
                size: stats.size,
                extension: ext,
                isExcel: [".xlsx", ".xls", ".csv"].includes(ext),
                lastModified: stats.mtime,
              });
            } catch {
              // Skip files we can't stat
            }
          }
        } else if (entry.isDirectory()) {
          await this.searchRecursive(
            fullPath,
            pattern,
            results,
            options,
            depth + 1
          );
        }
      }
    } catch {
      // Skip directories we can't access
    }
  }
  /**
   * Toggle file selection in multi-select mode
   * @param selectedFiles - Array of selected files
   * @param filePath - File to toggle
   */
  private toggleSelection(selectedFiles: string[], filePath: string): void {
    const index = selectedFiles.indexOf(filePath);
    if (index === -1) {
      selectedFiles.push(filePath);
    } else {
      selectedFiles.splice(index, 1);
    }
  }
  /**
   * Get appropriate icon for file item
   * @param item - File item
   * @returns Icon string
   */
  private getItemIcon(item: FileItem): string {
    try {
      // Validación de entrada
      if (!item || typeof item !== "object") {
        return IconService.get("file") || "📄";
      }

      if (item.type === "directory") {
        const folderIcon = IconService.get("folder");
        return folderIcon || "📁";
      }

      // Para archivos, usar el nombre si existe
      if (item.name && typeof item.name === "string") {
        const fileIcon = IconService.getFileIcon(item.name);
        return fileIcon || IconService.get("file") || "📄";
      }

      // Fallback final
      return IconService.get("file") || "📄";
    } catch (error) {
      // Fallback en caso de cualquier error
      return "📄";
    }
  }
  /**
   * Get human-readable time ago string
   * @param date - Date to compare
   * @returns Time ago string
   */
  private getTimeAgo(date: Date): string {
    try {
      // Validación de entrada para prevenir undefined
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return "fecha inválida";
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();

      // Validar que diffMs sea un número válido
      if (isNaN(diffMs)) {
        return "fecha inválida";
      }

      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return "ahora mismo";
      if (diffMinutes < 60) return `${diffMinutes}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;

      // Fallback seguro para toLocaleDateString
      try {
        return date.toLocaleDateString() || "fecha no disponible";
      } catch {
        return "fecha no disponible";
      }
    } catch (error) {
      // Fallback en caso de cualquier error
      return "fecha no disponible";
    }
  }
}
