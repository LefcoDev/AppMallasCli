/**
 * @fileoverview Aplicación CLI principal con Inquirer - Modo Interactivo
 * @description Punto de entrada principal para CLI con menú dual integrado
 * @version 2.0.0
 * @author Sistema de Migración de Mallas
 */

import path from "path";
import { promises as fs } from "fs";
import { BannerUtils } from "./shared/utils/banner.utils";
import { DependencyContainer } from "./application/container/dependency-container";
import { DualMenuControllerFactory } from "./presentation/factories/dual-menu-controller.factory";

class ExcelToOracleMapperApp {
  private readonly dataPath = path.join(process.cwd(), "data");
  private readonly outputPath = path.join(process.cwd(), "output");
  private readonly unmappedPath = path.join(this.outputPath, "NO_MAPEADOS");

  async start(): Promise<void> {
    try {
      // Mostrar banner de inicio
      await BannerUtils.showMainBanner();

      // Asegurar que los directorios existen
      await this.ensureDirectories();

      // Configurar container de dependencias
      const container = DependencyContainer.getInstance();
      container.registerDefaults(this.outputPath);

      // Crear el controlador principal dual
      const dualMenuFactory = container.resolve<DualMenuControllerFactory>(
        "DualMenuControllerFactory"
      );
      const dualMenuController = dualMenuFactory.createDualMenuController();

      // Iniciar la aplicación con menú dual interactivo
      await dualMenuController.start();
    } catch (error) {
      console.error("❌ Error de aplicación:", error);
      process.exit(1);
    }
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.dataPath, { recursive: true });
    await fs.mkdir(this.outputPath, { recursive: true });
    await fs.mkdir(this.unmappedPath, { recursive: true });

    console.log(`📁 Directorios preparados:`);
    console.log(`   📂 Datos: ${this.dataPath}`);
    console.log(`   📂 Salida: ${this.outputPath}`);
    console.log(`   📂 No mapeados: ${this.unmappedPath}`);
  }
}

// Manejo de señales
process.on("SIGINT", () => {
  BannerUtils.showGoodbyeBanner();
  process.exit(0);
});

export const app = new ExcelToOracleMapperApp();

if (require.main === module) {
  app.start().catch(console.error);
}
