/**
 * @fileoverview Aplicación Universal - Punto de entrada para cualquier frontend
 * @description Arquitectura desacoplada que puede ser utilizada por CLI, Web, Desktop, API, etc.
 * @version 2.0.0
 * @author Sistema de Migración de Mallas
 */

import path from "path";
import { promises as fs } from "fs";
import { BannerUtils } from "./shared/utils/banner.utils";
import { DependencyContainer } from "./application/container/dependency-container";
import { DualMenuControllerFactory } from "./presentation/factories/dual-menu-controller.factory";

export class UniversalMigrationApp {
  private readonly dataPath = path.join(process.cwd(), "data");
  private readonly outputPath = path.join(process.cwd(), "output");
  private readonly unmappedPath = path.join(this.outputPath, "NO_MAPEADOS");
  /**
   * Inicia la aplicación con interfaz CLI simplificada
   */
  async startCLI(): Promise<void> {
    return this.startDualMenu();
  }

  /**
   * Inicia la aplicación con menú dual integrado
   */
  async startDualMenu(): Promise<void> {
    try {
      await BannerUtils.showMainBanner();
      await this.ensureDirectories();

      const container = DependencyContainer.getInstance();
      container.registerDefaults(this.outputPath);

      const dualMenuFactory = container.resolve<DualMenuControllerFactory>(
        "DualMenuControllerFactory"
      );
      const dualMenuController = dualMenuFactory.createDualMenuController();

      await dualMenuController.start();
    } catch (error) {
      console.error("❌ Error en aplicación dual universal:", error);
      process.exit(1);
    }
  }

  /**
   * Obtiene instancia del container de dependencias configurado
   * Para uso en frontends externos (Web, Desktop, API)
   */
  getConfiguredContainer(): DependencyContainer {
    const container = DependencyContainer.getInstance();
    container.registerDefaults(this.outputPath);
    return container;
  }

  /**
   * Prepara los directorios necesarios
   */
  async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.dataPath, { recursive: true });
    await fs.mkdir(this.outputPath, { recursive: true });
    await fs.mkdir(this.unmappedPath, { recursive: true });
  }

  /**
   * Obtiene las rutas configuradas
   */
  getPaths() {
    return {
      dataPath: this.dataPath,
      outputPath: this.outputPath,
      unmappedPath: this.unmappedPath,
    };
  }
}

// Manejo de señales para CLI
process.on("SIGINT", () => {
  BannerUtils.showGoodbyeBanner();
  process.exit(0);
});

// Instancia por defecto para compatibilidad
export const universalApp = new UniversalMigrationApp();

// Cuando se ejecuta directamente como CLI, usar menú dual
if (require.main === module) {
  universalApp.startDualMenu().catch(console.error);
}
