/**
 * Oracle Explorer Menu Service
 * Responsabilidad: Gestionar menús y opciones de navegación
 */
import { CLIInterface } from "../cli/interfaces/cli.interface";
import { ControllerUtils } from "../utils/controller.utils";

export interface MenuOption {
  key: string;
  label: string;
  description: string;
  category?: string;
}

export interface MenuConfig {
  title: string;
  options: MenuOption[];
  showExit?: boolean;
}

export class OracleExplorerMenuService {
  constructor(private readonly cliService: CLIInterface) {}
  async showMainMenu(): Promise<string> {
    const menuConfig: MenuConfig = {
      title: "Oracle Database Explorer - Mapeo Inteligente",
      options: [
        {
          key: "intelligent-file-mapping",
          label: "🎯 Mapeo inteligente de archivos",
          description:
            "Funcionalidad principal: Detección automática + Mapeo interactivo",
          category: "main",
        },
      ],
      showExit: true,
    };

    return this.showMenu(menuConfig);
  }

  private async showMenu(config: MenuConfig): Promise<string> {
    const options = [...config.options];

    if (config.showExit) {
      options.push({
        key: "exit",
        label: "🚪 Volver al menú principal",
        description: "Regresar al menú principal",
      });
    }

    return this.cliService.showMenu(config.title, options);
  }
  showMenuCategories(options: MenuOption[]): void {
    console.log("\n" + ControllerUtils.generateEqualsLine());
    console.log(`🎯 Oracle Database Explorer - Mapeo Inteligente`);
    console.log(
      `Funcionalidad única: Mapeo interactivo de archivos a tablas Oracle`
    );
    ControllerUtils.printEqualsLine();

    console.log(`\n📁 Funcionalidad Principal:`);
    ControllerUtils.printDashLine(50);

    options.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option.label}`);
      console.log(`     ${option.description}`);
    });

    console.log("\n" + ControllerUtils.generateEqualsLine());
  }

  private groupOptionsByCategory(
    options: MenuOption[]
  ): Record<string, MenuOption[]> {
    return options.reduce((groups, option) => {
      const category = option.category || "other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(option);
      return groups;
    }, {} as Record<string, MenuOption[]>);
  }

  private getCategoryDisplayName(category: string): string {
    const categoryNames: Record<string, string> = {
      exploration: "Exploración de Base de Datos",
      generation: "Generación de Archivos",
      excel: "Operaciones con Excel",
      advanced: "Funciones Avanzadas",
      other: "Otras Opciones",
    };

    return categoryNames[category] || category;
  }
}
