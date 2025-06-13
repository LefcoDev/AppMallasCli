import { CLIImplementation } from "../presentation/cli/factories/cli-service.factory";

export interface CLIConfig {
  implementation: CLIImplementation;
  inquirer?: {
    pageSize?: number;
    theme?: string;
  };
  readline?: {
    prompt?: string;
  };
}

/**
 * Configuración para CLI Services
 */
export const cliConfig: CLIConfig = {
  implementation: "inquirer", // Cambiar a 'readline' para usar la implementación original
  inquirer: {
    pageSize: 10,
    theme: "default",
  },
  readline: {
    prompt: "👉 ",
  },
};

/**
 * Función para obtener la configuración CLI desde variables de entorno o archivo
 */
export function getCLIConfig(): CLIConfig {
  // Permitir override desde variable de entorno
  const envImplementation = process.env.CLI_IMPLEMENTATION as CLIImplementation;

  if (
    envImplementation &&
    ["inquirer", "readline"].includes(envImplementation)
  ) {
    return {
      ...cliConfig,
      implementation: envImplementation,
    };
  }

  return cliConfig;
}
