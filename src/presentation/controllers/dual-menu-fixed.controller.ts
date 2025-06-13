/**
 * @fileoverview Controlador principal con menú dual (Oracle vs Sin Oracle)
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

import {
  UserInterface,
  SelectOption,
} from "../interfaces/user-interface.interface";
import { ZipProcessingController } from "./zip-processing.controller";
import { VisualEffectsService } from "../cli/services/visual-effects.service";

export interface DualMenuController {
  /**
   * Inicia la aplicación con menú dual
   */
  start(): Promise<void>;
}

/**
 * Controlador principal que maneja el menú dual
 * Separación clara entre funcionalidades que requieren Oracle y las que no
 */
export class DualMenuControllerImpl implements DualMenuController {
  private visualEffects: VisualEffectsService;

  constructor(
    private readonly userInterface: UserInterface,
    private readonly zipController: ZipProcessingController,
    private readonly outputPath: string
  ) {
    this.visualEffects = VisualEffectsService.getInstance();
  }
  async start(): Promise<void> {
    try {
      await this.showWelcome();

      while (true) {
        const mainChoice = await this.showMainMenu();

        if (mainChoice === "exit") {
          await this.visualEffects.showUnifiedFarewellMessage(
            "¡Gracias por usar el Sistema de Migración de Mallas!"
          );
          break;
        }

        await this.handleMainChoice(mainChoice);

        // Preguntar si desea continuar
        const continueApp = await this.userInterface.confirmAction(
          "¿Deseas realizar otra operación?"
        );
        if (!continueApp) {
          await this.visualEffects.showUnifiedFarewellMessage(
            "¡Gracias por usar el Sistema de Migración de Mallas!"
          );
          break;
        }
      }
    } catch (error) {
      await this.userInterface.showMessage(
        `💥 Error fatal: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }
  private async showWelcome(): Promise<void> {
    console.log("🎯 Sistema de Procesamiento de Archivos");
    console.log("ZIP + Mapeo Inteligente Oracle");
    console.log("=".repeat(50));

    await this.userInterface.showMessage(
      "Bienvenido al sistema de procesamiento de archivos simplificado"
    );
    await this.userInterface.showMessage(
      "Dos funcionalidades principales disponibles:"
    );
  }
  private async showMainMenu(): Promise<string> {
    const choices: SelectOption[] = [
      {
        value: "db_explorer",
        label: "🎯 Mapeo Inteligente de Archivos (Oracle)",
        description:
          "Explorar tablas Oracle, mapeo inteligente de archivos con Oracle DB",
      },
      {
        value: "standalone",
        label: "📦 Procesamiento ZIP (Sin Oracle)",
        description: "Procesamiento de ZIP y organización de archivos TXT",
      },
      {
        value: "exit",
        label: "🚪 Salir",
        description: "Cerrar la aplicación",
      },
    ];

    // Pasamos false para no mostrar la opción de cancelar en el menú principal
    return await this.userInterface.selectOption(choices, false);
  }
  private async handleMainChoice(choice: string): Promise<void> {
    switch (choice) {
      case "db_explorer":
        await this.handleDirectOracleExplorer();
        break;
      case "standalone":
        await this.handleStandaloneMenu();
        break;
      default:
        await this.userInterface.showMessage("❌ Opción no válida");
    }
  }
  private async handleDirectOracleExplorer(): Promise<void> {
    console.log("🎯 Mapeo Inteligente de Archivos con Oracle");
    console.log("Conexión directa a Oracle Database");
    console.log("=".repeat(40));
    try {
      // Ir directamente al OracleExplorerControllerV2 sin menús intermedios
      const { ControllerUtils } = await import("../utils/controller.utils");
      await ControllerUtils.startOracleExplorer(this.outputPath);
    } catch (error) {
      await this.userInterface.showMessage(
        `❌ Error en funcionalidad Oracle: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }
  private async handleStandaloneMenu(): Promise<void> {
    console.log("📦 Procesamiento ZIP (Sin Oracle)");
    console.log("Procesamiento de archivos sin base de datos");
    console.log("=".repeat(40));

    const standaloneChoices: SelectOption[] = [
      {
        value: "zip_processing",
        label: "🗜️  Procesador de Archivos ZIP",
        description: "Extraer y mapear archivos TXT desde ZIP",
      },
      {
        value: "back",
        label: "⬅️  Volver al menú principal",
        description: "Regresar al menú principal",
      },
    ];

    const standaloneChoice = await this.userInterface.selectOption(
      standaloneChoices
    );

    if (standaloneChoice === "back") {
      return;
    }

    await this.delegateToStandaloneController(standaloneChoice);
  }
  private async delegateToStandaloneController(choice: string): Promise<void> {
    try {
      switch (choice) {
        case "zip_processing":
          await this.zipController.startZipProcessing();
          break;
        default:
          await this.userInterface.showMessage("❌ Opción no implementada");
      }
    } catch (error) {
      await this.userInterface.showMessage(
        `❌ Error en funcionalidad standalone: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }
}
