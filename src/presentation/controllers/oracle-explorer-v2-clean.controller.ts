/**
 * Oracle Explorer Controller - Limpio y simplificado
 * Responsabilidad: Solo mapeo inteligente de archivos
 */
import { CLIInterface } from "../cli/interfaces/cli.interface";
import { OracleSafeDatabaseService } from "../../infrastructure/database/oracle";
import { OracleExplorerService } from "../../domain/services/oracle-explorer.service";

// Presentation Services
import { OracleExplorerMenuService } from "../services/oracle-explorer-menu.service";
import { OracleExplorerInputService } from "../services/oracle-explorer-input.service";
import { UniversalDisplayService } from "../services/universal-display.service";
import { CLIUserInterfaceAdapter } from "../adapters/cli-user-interface.adapter";
import { VisualEffectsService } from "../cli/services/visual-effects.service";
import { NavigationService } from "../services/navigation.service";

export class OracleExplorerControllerV2 {
  private oracleService: OracleSafeDatabaseService | null = null;
  private oracleExplorerService: OracleExplorerService | null = null;
  private menuService: OracleExplorerMenuService;
  private inputService: OracleExplorerInputService;
  private universalDisplayService: UniversalDisplayService;
  private visualEffects: VisualEffectsService;
  private navigationService: NavigationService;

  constructor(
    private readonly cliService: CLIInterface,
    private readonly outputPath: string
  ) {
    this.menuService = new OracleExplorerMenuService(cliService);
    this.inputService = new OracleExplorerInputService(cliService);
    this.visualEffects = VisualEffectsService.getInstance();

    // Create CLIUserInterfaceAdapter for UniversalDisplayService
    const userInterface = new CLIUserInterfaceAdapter(this.cliService);
    this.universalDisplayService = new UniversalDisplayService(userInterface);

    // Create NavigationService for file selection
    const { NavigationServiceImpl } = require("../services/navigation.service");
    this.navigationService = new NavigationServiceImpl(userInterface);
  }

  async start(): Promise<void> {
    try {
      this.showWelcomeMessage();
      await this.connectToOracle();

      while (true) {
        const action = await this.menuService.showMainMenu();

        if (action === "exit") {
          await this.visualEffects.showUnifiedFarewellMessage(
            "¡Gracias por usar Oracle Database Explorer!"
          );
          break;
        }

        await this.executeAction(action);
      }
    } catch (error) {
      this.cliService.showError(`Error en Oracle Explorer: ${error}`);
    } finally {
      await this.disconnectFromOracle();
    }
  }

  private showWelcomeMessage(): void {
    const welcomeHeader = this.visualEffects.createMenuHeader(
      "Oracle Database Explorer - Mapeo Inteligente",
      "Mapeo inteligente de archivos Excel/CSV/TXT a tablas Oracle"
    );
    console.log(welcomeHeader);
  }

  private async connectToOracle(): Promise<void> {
    try {
      const spinner = this.visualEffects.createGradientSpinner(
        "🔌 Conectando a Oracle Database..."
      );
      spinner.start();

      // Get the Oracle service instance from dependency container
      const { DependencyContainer } = await import(
        "../../application/container/dependency-container"
      );
      const container = DependencyContainer.getInstance();
      this.oracleService = container.resolve<OracleSafeDatabaseService>(
        "OracleSafeDatabaseService"
      );

      // Get the Oracle Explorer service instance
      this.oracleExplorerService = container.resolve<OracleExplorerService>(
        "OracleExplorerService"
      );

      await this.oracleService.initialize();
      spinner.succeed("✅ Conectado a Oracle en modo solo lectura");
    } catch (error) {
      this.cliService.showError(`❌ Error conectando a Oracle: ${error}`);
      throw error;
    }
  }

  private async disconnectFromOracle(): Promise<void> {
    if (this.oracleService) {
      try {
        await this.oracleService.close();
        this.cliService.showMessage("🔌 Desconectado de Oracle");
      } catch (error) {
        console.error("Error desconectando de Oracle:", error);
      }
    }
  }

  private async executeAction(action: string): Promise<void> {
    if (!this.oracleService) {
      this.cliService.showError("No hay conexión a Oracle");
      return;
    }

    try {
      switch (action) {
        case "intelligent-file-mapping":
          await this.handleIntelligentFileMapping();
          break;
        default:
          this.cliService.showWarning(`Acción no implementada: ${action}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "OPERATION_CANCELLED") {
        this.cliService.showMessage(
          "🚪 Operación cancelada. Volviendo al menú principal..."
        );
        return;
      }
      this.cliService.showError(`Error ejecutando acción: ${error}`);
    }
  }

  // ===================================================================
  // HANDLER PARA MAPEO INTELIGENTE (ÚNICA FUNCIONALIDAD)
  // ===================================================================
  private async handleIntelligentFileMapping(): Promise<void> {
    try {
      console.log(`\n🎯 MAPEO INTELIGENTE DE ARCHIVOS`);
      console.log(`════════════════════════════════════════`);
      console.log(
        `✨ Flujo completo con detección automática y mapeo interactivo`
      );

      // 1. Solicitar nombre de tabla Oracle
      const tableName = await this.inputService.getTableName(true);
      if (!tableName) {
        console.log("❌ Proceso cancelado: No se especificó tabla");
        return;
      }

      // 2. Seleccionar archivos usando NavigationService
      const selectedFiles = await this.navigationService.selectFiles({
        startPath: process.cwd(),
        extensions: [".xlsx", ".xls", ".xlsm", ".csv", ".txt"],
        message: "Seleccione los archivos para mapeo inteligente:",
        allowMultiple: true,
      });

      if (selectedFiles.length === 0) {
        console.log("❌ Proceso cancelado: No se seleccionaron archivos");
        return;
      }

      console.log(`✅ ${selectedFiles.length} archivo(s) seleccionado(s)`);

      // 3. Detectar tipos de archivos y extraer información
      const { FileTypeDetectionService } = await import(
        "../../domain/services/file-type-detection.service"
      );
      const fileInfos = [];

      console.log("\n🔍 ANALIZANDO ARCHIVOS...");
      for (const filePath of selectedFiles) {
        try {
          const fileInfo = await FileTypeDetectionService.detectFileType(
            filePath
          );
          fileInfos.push(fileInfo);
          console.log(
            `   ✅ ${
              fileInfo.fileName
            } (${fileInfo.detectedType.toUpperCase()})`
          );
        } catch (error) {
          console.log(`   ❌ Error analizando ${filePath}: ${error}`);
        }
      }

      if (fileInfos.length === 0) {
        console.log("❌ No se pudieron analizar los archivos seleccionados");
        return;
      }

      // 4. Usar InteractiveMappingService para el mapeo completo
      const { InteractiveMappingService } = await import(
        "../../domain/services/interactive-mapping.service"
      );

      const userInterface = new CLIUserInterfaceAdapter(this.cliService);
      const interactiveMappingService = new InteractiveMappingService(
        userInterface,
        this.oracleExplorerService!
      );

      console.log("\n🎯 INICIANDO MAPEO INTERACTIVO...");
      const mappingResult =
        await interactiveMappingService.createInteractiveMapping(
          fileInfos,
          tableName
        );

      console.log("\n✅ MAPEO COMPLETADO:");
      console.log(`   📊 Headers procesados: ${mappingResult.totalHeaders}`);
      console.log(`   ✅ Headers mapeados: ${mappingResult.mappedHeaders}`);
      console.log(
        `   ⚪ Headers sin mapear: ${mappingResult.unmappedHeaders.length}`
      );
      console.log(`   🎯 Tipo de mapeo: ${mappingResult.mappingType}`);

      // 5. Opción de procesar archivos con el mapeo creado
      const shouldProcess = await this.cliService.confirmAction(
        "¿Desea procesar los archivos ahora y generar los INSERT de Oracle?"
      );

      if (shouldProcess) {
        console.log("\n🚀 PROCESANDO ARCHIVOS CON MAPEO CONFIGURADO...");
        console.log("═".repeat(60));        // Ejecutar el procesamiento con el mapeo configurado
        const options = {
          tableName,
          filePatterns: selectedFiles,
          processingMode: "multiple-files" as const,
          sheetMode: "all-sheets" as const,
          fileTypes: ["xlsx", "csv", "txt"] as ("xlsx" | "csv" | "txt")[],
          predefinedMapping: mappingResult.columnMapping,
          valueFormatOptions: mappingResult.valueFormatOptions,
        };

        const result =
          await this.oracleExplorerService!.bulkProcessFilesWithMapping(
            options
          );

        console.log("\n🎉 PROCESAMIENTO COMPLETADO:");
        console.log(
          `   📁 Archivos procesados: ${result.processedFiles}/${result.totalFiles}`
        );
        console.log(
          `   📄 Filas válidas: ${result.validRows}/${result.totalRows}`
        );
        console.log(
          `   📝 Archivos SQL generados: ${result.outputFiles.length}`
        );

        await this.universalDisplayService.displayBulkProcessResult(result);
      } else {
        console.log("\n💾 Mapeo completado y guardado.");
        console.log("   ✅ Puede ejecutar el procesamiento más tarde");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "OPERATION_CANCELLED") {
        this.cliService.showMessage(
          "🚪 Operación cancelada. Volviendo al menú principal..."
        );
        return;
      }
      this.cliService.showError(
        `Error en mapeo inteligente: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }
}
