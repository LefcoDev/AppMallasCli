/**
 * Servicio de Menú Universal
 * No depende de CLI específica, trabaja con UserInterface abstracta
 * Integrado con sistema de iconos moderno
 */
import {
  UserInterface,
  SelectOption,
} from "../interfaces/user-interface.interface";
import { IconService } from "../cli/services/icon.service";

export interface MenuOption {
  key: string;
  label: string;
  description?: string;
  category?: string;
}

export interface MenuConfig {
  title: string;
  options: MenuOption[];
  allowExit?: boolean;
  exitLabel?: string;
  groupByCategory?: boolean;
}

export class UniversalMenuService {
  constructor(private readonly userInterface: UserInterface) {}
  async showMainMenu(): Promise<string> {
    const menuConfig: MenuConfig = {
      title: "Oracle Database Explorer",
      options: [
        {
          key: "explore-table",
          label: IconService.format("search", "Explorar estructura de tabla"),
          description: "Ver columnas y propiedades (soporta ESQUEMA.TABLA)",
          category: "exploration",
        },
        {
          key: "list-tables",
          label: IconService.format("excel", "Listar todas las tablas"),
          description: "Ver todas las tablas disponibles en el esquema actual",
          category: "exploration",
        },
        {
          key: "search-tables",
          label: IconService.format("search", "Buscar tablas"),
          description: "Buscar tablas por nombre o patrón en esquema actual",
          category: "exploration",
        },
        {
          key: "list-schemas",
          label: IconService.format("folder", "Listar esquemas disponibles"),
          description: "Ver todos los esquemas accesibles",
          category: "exploration",
        },
        {
          key: "search-schema-tables",
          label: "🔍 Buscar tablas por esquema",
          description: "Buscar tablas en un esquema específico",
          category: "exploration",
        },
        {
          key: "generate-inserts",
          label: "📝 Generar archivo de INSERTs",
          description: "Crear archivo INSERT (soporta ESQUEMA.TABLA)",
          category: "generation",
        },
        {
          key: "generate-sample-insert",
          label: "💡 Generar INSERT de ejemplo",
          description: "Crear INSERT basado en el primer registro de la tabla",
          category: "generation",
        },
        {
          key: "generate-ctl-file",
          label: "📄 Generar archivo CTL (SQL*Loader)",
          description: "Crear control file para carga masiva de datos CSV",
          category: "generation",
        },
        {
          key: "generate-excel-template",
          label: "📋 Generar plantilla Excel",
          description:
            "Crear archivo Excel con validaciones basado en estructura de tabla",
          category: "generation",
        },
        {
          key: "validate-excel-file",
          label: "🔍 Validar archivo Excel",
          description:
            "Validar archivo Excel contra estructura de tabla Oracle",
          category: "validation",
        },
        {
          key: "bulk-process-excel",
          label: "🚀 Procesamiento masivo Excel",
          description: "Procesar múltiples archivos Excel de forma masiva",
          category: "validation",
        },
        {
          key: "generate-table-from-csv",
          label: "📊 Generar tabla desde CSV",
          description:
            "Crear DDL y CTL para tabla Oracle basada en archivo CSV",
          category: "generation",
        },
      ],
      allowExit: true,
      exitLabel: "🚪 Volver al menú principal",
    };

    return this.showMenu(menuConfig);
  }

  async showMenu(config: MenuConfig): Promise<string> {
    let options = config.options;

    // Agrupar por categoría si se solicita
    if (config.groupByCategory) {
      options = this.groupOptionsByCategory(options);
    }

    // Agregar opción de salida si se permite
    if (config.allowExit !== false) {
      options.push({
        key: "exit",
        label: config.exitLabel || "🚪 Salir",
        description: "Cerrar la aplicación o volver atrás",
      });
    }

    const response = await this.userInterface.requestInput<string>({
      type: "choice",
      message: config.title,
      options: options.map((opt) => ({
        key: opt.key,
        label: opt.label,
        description: opt.description,
      })),
    });

    return response.success ? response.value || "exit" : "exit";
  }

  async showSimpleMenu(
    title: string,
    options: Array<{ key: string; label: string; description?: string }>
  ): Promise<string> {
    const response = await this.userInterface.requestInput<string>({
      type: "choice",
      message: title,
      options,
    });

    return response.success ? response.value || "exit" : "exit";
  }

  async showConfirmationMenu(
    title: string,
    message: string,
    yesLabel: string = "Sí",
    noLabel: string = "No"
  ): Promise<boolean> {
    const choice = await this.showSimpleMenu(title, [
      { key: "yes", label: yesLabel },
      { key: "no", label: noLabel },
    ]);

    return choice === "yes";
  }

  async showMultiSelectMenu(
    title: string,
    options: Array<{ key: string; label: string; description?: string }>
  ): Promise<string[]> {
    const response = await this.userInterface.requestInput<string[]>({
      type: "multiSelect",
      message: title,
      options,
    });

    return response.success ? response.value || [] : [];
  }
  /**
   * Enhanced file selection using modern file browser
   */
  async selectExcelFiles(
    title: string = "Seleccionar archivos Excel"
  ): Promise<string[]> {
    const enhancedMenu = new (
      await import("../cli/services/enhanced-menu.service")
    ).EnhancedMenuService(this.userInterface);

    return await enhancedMenu.selectFiles({
      title,
      fileTypes: [".xlsx", ".xls", ".xlsm"],
      allowMultiple: true,
      startPath: "./data",
    });
  }
  /**
   * Enhanced directory selection
   */
  async selectOutputDirectory(
    title: string = "Seleccionar directorio de salida"
  ): Promise<string> {
    const enhancedMenu = new (
      await import("../cli/services/enhanced-menu.service")
    ).EnhancedMenuService(this.userInterface);

    return await enhancedMenu.selectDirectory({
      title,
      startPath: "./output",
    });
  }

  /**
   * Select any type of data file with enhanced browser
   */
  async selectDataFiles(
    title: string = "Seleccionar archivos de datos"
  ): Promise<string[]> {
    const enhancedMenu = new (
      await import("../cli/services/enhanced-menu.service")
    ).EnhancedMenuService(this.userInterface);

    return await enhancedMenu.selectFiles({
      title,
      fileTypes: [".xlsx", ".xls", ".xlsm", ".csv", ".txt"],
      allowMultiple: true,
      startPath: "./data",
    });
  }

  /**
   * Show selection summary and confirm operation
   */
  async confirmFileOperation(
    files: string[],
    operation: string
  ): Promise<boolean> {
    if (files.length === 0) {
      await this.userInterface.showMessage(
        IconService.format("warning", "No se seleccionaron archivos.")
      );
      return false;
    }

    await this.userInterface.showMessage(
      IconService.format("info", `${files.length} archivo(s) para ${operation}`)
    );
    return await this.userInterface.confirmAction(
      `¿Proceder con ${operation} de ${files.length} archivo(s)?`
    );
  }

  private groupOptionsByCategory(options: MenuOption[]): MenuOption[] {
    const grouped: { [category: string]: MenuOption[] } = {};
    const uncategorized: MenuOption[] = [];

    // Agrupar opciones por categoría
    options.forEach((option) => {
      if (option.category) {
        if (!grouped[option.category]) {
          grouped[option.category] = [];
        }
        grouped[option.category].push(option);
      } else {
        uncategorized.push(option);
      }
    });

    // Reorganizar opciones con separadores de categoría
    const result: MenuOption[] = [];

    Object.entries(grouped).forEach(([category, categoryOptions]) => {
      // Agregar separador de categoría (visual)
      result.push({
        key: `category-${category}`,
        label: `── ${category.toUpperCase()} ──`,
        description: "",
        category: "separator",
      });

      result.push(...categoryOptions);
    });

    // Agregar opciones sin categoría al final
    if (uncategorized.length > 0) {
      result.push({
        key: "category-other",
        label: "── OTRAS ──",
        description: "",
        category: "separator",
      });
      result.push(...uncategorized);
    }

    return result;
  }
}
