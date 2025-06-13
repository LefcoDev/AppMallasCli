/**
 * Oracle Explorer Controller Factory
 * Factory simplificado para el controlador de mapeo inteligente
 */
import { DependencyContainer } from "../../application/container/dependency-container";
import { OracleExplorerControllerV2 } from "../controllers/oracle-explorer-v2.controller";
import { CLIInterface } from "../cli/interfaces/cli.interface";

export class OracleExplorerControllerFactory {
  static create(outputPath: string): OracleExplorerControllerV2 {
    // Configurar el contenedor de dependencias
    const container = DependencyContainer.getInstance();
    container.registerDefaults(outputPath);

    // Resolver dependencias (solo CLI service)
    const cliService = container.resolve<CLIInterface>("CLIService");

    // Crear y retornar el controlador simplificado
    return new OracleExplorerControllerV2(cliService, outputPath);
  }
}
