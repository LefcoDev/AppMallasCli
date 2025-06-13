/**
 * Adaptador que convierte CLIInterface a UserInterface
 * Permite usar la CLI existente con la nueva arquitectura abstracta
 * Integrado con el sistema de iconos moderno
 */
import { CLIInterface } from "../cli/interfaces/cli.interface";
import {
  UserInterface,
  UserInputRequest,
  UserInputResponse,
  DisplayData,
  ProgressReporter,
  NavigationController,
  SelectOption,
} from "../interfaces/user-interface.interface";
import { IconService } from "../cli/services/icon.service";
import { StatusIconService } from "../cli/services/status-icon.service";
import { EnhancedFileBrowserService } from "../cli/services/enhanced-file-browser.service";
import { ControllerUtils } from "../utils/controller.utils";

export class CLIUserInterfaceAdapter implements UserInterface {
  private progressReporter?: ProgressReporter;
  private navigationController?: NavigationController;
  private fileBrowser: EnhancedFileBrowserService;

  constructor(private readonly cliService: CLIInterface) {
    this.fileBrowser = new EnhancedFileBrowserService();
  }

  async initialize(): Promise<void> {
    // CLI no requiere inicialización especial
  }

  async close(): Promise<void> {
    this.cliService.close();
  }

  isAvailable(): boolean {
    return true; // CLI siempre está disponible
  }

  async requestInput<T = any>(
    request: UserInputRequest
  ): Promise<UserInputResponse<T>> {
    try {
      let value: any;

      switch (request.type) {
        case "text":
          value = await this.cliService.question(request.message);
          break;

        case "choice":
          if (!request.options) {
            throw new Error("Choice input requires options");
          }
          value = await this.cliService.showMenu(
            request.message,
            request.options
          );
          break;

        case "confirm":
          value = await this.cliService.confirmAction(request.message);
          break;

        case "multiSelect":
          if (!request.options) {
            throw new Error("MultiSelect input requires options");
          }
          // Si CLI soporta multiselect
          if ("showMultiSelect" in this.cliService) {
            value = await (this.cliService as any).showMultiSelect(
              request.message,
              request.options
            );
          } else {
            // Fallback para CLI básicas
            this.cliService.showWarning(
              "Multi-select no soportado, usando selección individual"
            );
            value = [
              await this.cliService.showMenu(request.message, request.options),
            ];
          }
          break;

        case "file":
          // Si CLI soporta selección de archivos
          if ("selectFile" in this.cliService) {
            value = await (this.cliService as any).selectFile(request.message);
          } else {
            value = await this.cliService.question(
              `${request.message} (ruta del archivo): `
            );
          }
          break;

        case "password":
          // Si CLI soporta password input
          if ("askPassword" in this.cliService) {
            value = await (this.cliService as any).askPassword(request.message);
          } else {
            this.cliService.showWarning(
              "Password input no soportado, usando texto normal"
            );
            value = await this.cliService.question(request.message);
          }
          break;

        default:
          throw new Error(`Input type not supported: ${request.type}`);
      }

      // Validación opcional
      if (request.validate && value !== null && value !== undefined) {
        const validation = request.validate(value);
        if (validation !== true) {
          return {
            success: false,
            error:
              typeof validation === "string" ? validation : "Entrada inválida",
          };
        }
      }

      // Verificar si es requerido
      if (request.required && (!value || value === "")) {
        return {
          success: false,
          error: "Este campo es requerido",
        };
      }

      // Manejar cancelación
      if (value === "exit" || value === null) {
        return {
          success: false,
          cancelled: true,
        };
      }

      return {
        success: true,
        value: value as T,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  async display(data: DisplayData): Promise<void> {
    const title = data.title ? `${data.title}: ` : "";

    switch (data.type) {
      case "message":
        this.cliService.showMessage(`${title}${data.content}`);
        break;

      case "error":
        this.cliService.showError(`${title}${data.content}`);
        break;

      case "warning":
        this.cliService.showWarning(`${title}${data.content}`);
        break;

      case "success":
        this.cliService.showSuccess(`${title}${data.content}`);
        break;
      case "table":
        this.displayTableData(data.content, data.title);
        break;

      case "list":
        this.displayList(data.content, data.title);
        break;

      case "json":
        this.displayJson(data.content, data.title);
        break;

      case "file":
        this.displayFileInfo(data.content, data.metadata);
        break;

      default:
        this.cliService.showMessage(`${title}${JSON.stringify(data.content)}`);
    }
  }

  async displayBatch(dataList: DisplayData[]): Promise<void> {
    for (const data of dataList) {
      await this.display(data);
    }
  }
  // Métodos auxiliares para diferentes tipos de display
  private displayTableData(tableData: any[], title?: string): void {
    if (title) {
      console.log(`\n${IconService.format("excel", title)}`);
      console.log(IconService.separator(50));
    }

    if (!Array.isArray(tableData) || tableData.length === 0) {
      this.cliService.showMessage("No hay datos para mostrar");
      return;
    } // Formateo simple de tabla
    const headers = Object.keys(tableData[0]);
    console.log(headers.join(" | "));
    console.log(ControllerUtils.generateDashLine(headers.join(" | ").length));

    tableData.forEach((row) => {
      console.log(
        headers.map((header) => String(row[header] || "")).join(" | ")
      );
    });
  }
  private displayList(listData: any[], title?: string): void {
    if (title) {
      console.log(`\n${IconService.format("bullet", title)}`);
      console.log(IconService.separator(50));
    }

    if (!Array.isArray(listData) || listData.length === 0) {
      this.cliService.showMessage("No hay elementos para mostrar");
      return;
    }

    listData.forEach((item, index) => {
      console.log(
        `${IconService.get("bullet")} ${index + 1}. ${
          typeof item === "object" ? JSON.stringify(item) : item
        }`
      );
    });
  }

  private displayJson(jsonData: any, title?: string): void {
    if (title) {
      console.log(`\n${IconService.format("info", title)}`);
      console.log(IconService.separator(50));
    }
    console.log(JSON.stringify(jsonData, null, 2));
  }

  private displayFileInfo(fileInfo: any, metadata?: Record<string, any>): void {
    console.log(
      `\n${IconService.format(
        "file",
        `Archivo generado: ${fileInfo.path || fileInfo}`
      )}`
    );

    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        console.log(`   ${IconService.get("bullet")} ${key}: ${value}`);
      });
    }
  }

  // Enhanced methods with modern icons and file browser
  async showMessage(message: string): Promise<void> {
    this.cliService.showMessage(message);
  }

  async askQuestion(question: string): Promise<string> {
    return await this.cliService.question(question);
  }

  async selectOption(
    options: SelectOption[],
    showCancelOption: boolean = true
  ): Promise<string> {
    // Convert SelectOption[] to MenuOption[] for compatibility
    const menuOptions = options.map((option) => ({
      key: option.value,
      label: option.label,
      description: option.description,
    }));

    return await this.cliService.showMenu(
      "Selecciona una opción",
      menuOptions,
      showCancelOption
    );
  }

  async confirmAction(question: string): Promise<boolean> {
    return await this.cliService.confirmAction(question);
  }

  async showProgress(message: string): Promise<void> {
    // Use enhanced spinner if available
    if (typeof (this.cliService as any).showProgress === "function") {
      await (this.cliService as any).showProgress(message);
    } else {
      this.cliService.showMessage(IconService.format("loading", message));
    }
  }
  async displayTable(data: any[]): Promise<void> {
    this.displayTableData(data, "Datos");
  }

  /**
   * Enhanced file selection with modern file browser
   */
  async selectFiles(options: {
    title: string;
    fileTypes?: string[];
    allowMultiple?: boolean;
    startPath?: string;
  }): Promise<string[]> {
    await this.showMessage(`\n${IconService.format("search", options.title)}`);

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
      {
        value: "CANCEL",
        label: IconService.format("cancel", "Cancelar"),
        description: "Volver al menú anterior",
      },
    ];

    const choice = await this.selectOption(choices);

    switch (choice) {
      case "BROWSE":
        return await this.browseFiles(options);

      case "SEARCH":
        return await this.searchFiles(options);

      case "MANUAL":
        return await this.enterPathManually(options);

      default:
        return [];
    }
  }

  /**
   * Enhanced directory selection
   */
  async selectDirectory(options: {
    title: string;
    startPath?: string;
  }): Promise<string> {
    await this.showMessage(`\n${IconService.format("folder", options.title)}`);

    const selected = await this.fileBrowser.browseAndSelect({
      startPath: options.startPath,
      allowMultiSelect: false,
      showHidden: false,
      mode: "directory",
    });

    return selected[0] || "";
  }

  /**
   * Browse files using enhanced file browser
   */
  private async browseFiles(options: {
    fileTypes?: string[];
    allowMultiple?: boolean;
    startPath?: string;
  }): Promise<string[]> {
    return await this.fileBrowser.browseAndSelect({
      startPath: options.startPath,
      fileTypes: options.fileTypes,
      allowMultiSelect: options.allowMultiple || false,
      showHidden: false,
      mode: "file",
      maxDepth: 10,
    });
  }

  /**
   * Search files using enhanced search
   */
  private async searchFiles(options: {
    fileTypes?: string[];
    allowMultiple?: boolean;
    startPath?: string;
  }): Promise<string[]> {
    const pattern = await this.askQuestion(
      "Ingresa el patrón de búsqueda (nombre del archivo):"
    );

    if (!pattern.trim()) {
      await this.showMessage(
        StatusIconService.error("El patrón de búsqueda no puede estar vacío")
      );
      return [];
    }

    return await this.fileBrowser.quickSearch(pattern, {
      startPath: options.startPath,
      fileTypes: options.fileTypes,
      allowMultiSelect: false,
      showHidden: false,
      mode: "file",
      maxDepth: 5,
    });
  }

  /**
   * Manual path entry with validation
   */
  private async enterPathManually(options: {
    fileTypes?: string[];
    allowMultiple?: boolean;
  }): Promise<string[]> {
    if (options.allowMultiple) {
      await this.showMessage(
        StatusIconService.info(
          "Ingresa múltiples rutas separadas por punto y coma (;)"
        )
      );
    }

    const input = await this.askQuestion("Ingresa la(s) ruta(s) del archivo:");

    if (!input.trim()) return [];

    const paths = options.allowMultiple
      ? input
          .split(";")
          .map((p) => p.trim())
          .filter((p) => p)
      : [input.trim()];

    // Validate paths
    const validPaths: string[] = [];
    const fs = require("fs").promises;

    for (const filePath of paths) {
      try {
        await fs.access(filePath);
        validPaths.push(filePath);
      } catch {
        await this.showMessage(
          StatusIconService.error(`Archivo no encontrado: ${filePath}`)
        );
      }
    }

    return validPaths;
  }

  // Getters para componentes opcionales
  getProgressReporter(): ProgressReporter | undefined {
    return this.progressReporter;
  }

  getNavigationController(): NavigationController | undefined {
    return this.navigationController;
  }
}
