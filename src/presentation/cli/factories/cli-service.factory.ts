import { CLIInterface } from "../interfaces/cli.interface";
import { InquirerCLIService } from "../implementations/inquirer-cli.service";
import { ReadlineCLIService } from "../cli-interface.service";

export type CLIImplementation = "inquirer" | "readline";

/**
 * Factory para crear instancias de CLI Services
 * Permite cambiar fácilmente entre implementaciones sin modificar el código cliente
 */
export class CLIServiceFactory {
  private static defaultImplementation: CLIImplementation = "inquirer";

  /**
   * Crea una instancia del servicio CLI especificado
   */
  static create(implementation?: CLIImplementation): CLIInterface {
    const impl = implementation || this.defaultImplementation;

    switch (impl) {
      case "inquirer":
        return new InquirerCLIService();
      case "readline":
        return new ReadlineCLIService();
      default:
        throw new Error(`Implementación CLI no soportada: ${impl}`);
    }
  }

  /**
   * Cambia la implementación por defecto
   */
  static setDefaultImplementation(implementation: CLIImplementation): void {
    this.defaultImplementation = implementation;
  }

  /**
   * Obtiene la implementación por defecto actual
   */
  static getDefaultImplementation(): CLIImplementation {
    return this.defaultImplementation;
  }

  /**
   * Lista todas las implementaciones disponibles
   */
  static getAvailableImplementations(): CLIImplementation[] {
    return ["inquirer", "readline"];
  }
}
