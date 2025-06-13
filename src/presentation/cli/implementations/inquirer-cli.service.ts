import inquirer from "inquirer";
import chalk from "chalk";
import * as glob from "glob";
import * as path from "path";
import * as fs from "fs";
import { CLIInterface, MenuOption } from "../interfaces/cli.interface";
import { IconService } from "../services/icon.service";
import { StatusIconService } from "../services/status-icon.service";
import { SpinnerService } from "../services/spinner.service";
import { VisualEffectsService } from "../services/visual-effects.service";

/**
 * Implementación de CLI usando Inquirer.js
 * Proporciona una interfaz mejorada y más rica para interacción con el usuario
 * Integrada con el sistema de iconos moderno y compatible
 */
export class InquirerCLIService implements CLIInterface {
  private spinnerService: SpinnerService;
  private visualEffects: VisualEffectsService;

  constructor() {
    this.spinnerService = SpinnerService.getInstance();
    this.visualEffects = VisualEffectsService.getInstance();
  }
  /**
   * Muestra un menú interactivo usando Inquirer con iconos mejorados y efectos visuales
   * @param title Título del menú
   * @param options Opciones a mostrar
   * @param showCancelOption Si es false, no se mostrará la opción de cancelar
   */
  async showMenu(
    title: string,
    options: MenuOption[],
    showCancelOption: boolean = true
  ): Promise<string> {
    // Usar el nuevo header con efectos visuales
    const menuHeader = this.visualEffects.createMenuHeader(title);
    console.log(menuHeader);

    const choices = options.map((option) => ({
      name: option.description
        ? this.visualEffects.createGradientText(option.label, "menu") +
          chalk.dim(" - " + option.description)
        : this.visualEffects.createGradientText(option.label, "menu"),
      value: option.key,
      short: option.label,
    }));

    // Agregar opción de salida si no existe
    if (
      !choices.find((choice) => choice.value === "exit" || choice.value === "0")
    ) {
      choices.push({
        name: this.visualEffects.createGradientText(
          `${IconService.get("cancel")} Salir - Cerrar la aplicación`,
          "error"
        ),
        value: "exit",
        short: "Salir",
      });
    }

    // Agregar opción de cancelar si no existe y está habilitada
    if (
      showCancelOption &&
      !choices.find((choice) => choice.value === "cancel")
    ) {
      choices.push({
        name: this.visualEffects.createGradientText(
          `${IconService.get("cancel")} Cancelar - Volver al menú anterior`,
          "warning"
        ),
        value: "cancel",
        short: "Cancelar",
      });
    }

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "selection",
        message: this.visualEffects.createGradientText(
          `${IconService.get("pointer")} Selecciona una opción:`,
          "primary"
        ),
        choices,
        pageSize: 15,
        loop: false,
      },
    ]);

    // Verificar cancelación
    if (answer.selection === "cancel") {
      throw new Error("OPERATION_CANCELLED");
    }

    return answer.selection;
  }
  /**
   * Permite seleccionar un archivo navegando los archivos disponibles
   */
  async selectFile(
    message = "Selecciona un archivo",
    extensions = ["*"]
  ): Promise<string> {
    try {
      // Buscar archivos con las extensiones especificadas
      const patterns = extensions.map((ext) =>
        ext === "*" ? "**/*" : `**/*.${ext.replace(".", "")}`
      );

      const allFiles: string[] = [];
      for (const pattern of patterns) {
        const files = glob.sync(pattern, {
          cwd: process.cwd(),
          ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
          nodir: true,
        });
        allFiles.push(...files);
      }
      if (allFiles.length === 0) {
        console.log(StatusIconService.warning("No se encontraron archivos"));
        return await this.question(
          chalk.greenBright(message + " (ruta completa):")
        );
      }

      // Ordenar archivos por directorio y nombre
      const sortedFiles = allFiles.sort((a, b) => {
        const dirA = path.dirname(a);
        const dirB = path.dirname(b);
        if (dirA !== dirB) {
          return dirA.localeCompare(dirB);
        }
        return path.basename(a).localeCompare(path.basename(b));
      });

      // Limitar a los primeros 50 archivos para no sobrecargar la UI
      const filesToShow = sortedFiles.slice(0, 50);
      if (sortedFiles.length > 50) {
        console.log(
          StatusIconService.warning(
            `Mostrando primeros 50 de ${sortedFiles.length} archivos encontrados`
          )
        );
      }

      const choices = filesToShow.map((file) => {
        const fileIcon = IconService.getFileIcon(file);
        return {
          name:
            `${fileIcon} ` +
            chalk.yellowBright(path.basename(file)) +
            chalk.dim(` (${path.dirname(file)})`),
          value: file,
          short: path.basename(file),
        };
      });

      // Agregar opción para escribir ruta manualmente
      choices.unshift({
        name: chalk.magentaBright(
          `${IconService.get("text")} Escribir ruta manualmente`
        ),
        value: "__manual__",
        short: "Manual",
      });
      const answer = await inquirer.prompt([
        {
          type: "list",
          name: "filePath",
          message: chalk.greenBright(`${IconService.get("search")} ${message}`),
          choices,
          pageSize: 15,
          loop: false,
        },
      ]);

      if (answer.filePath === "__manual__") {
        return await this.question(
          chalk.greenBright("Escribe la ruta del archivo:")
        );
      }

      return answer.filePath;
    } catch (error) {
      console.log(
        StatusIconService.warning(
          "Error buscando archivos, usando selección manual"
        )
      );
      return await this.question(
        chalk.greenBright(message + " (ruta completa):")
      );
    }
  }

  /**
   * Permite seleccionar múltiples archivos con filtros
   */
  async selectMultipleFiles(
    message = "Selecciona archivos",
    extensions = ["*"]
  ): Promise<string[]> {
    try {
      const patterns = extensions.map((ext) =>
        ext === "*" ? "**/*" : `**/*.${ext.replace(".", "")}`
      );

      const allFiles: string[] = [];
      for (const pattern of patterns) {
        const files = glob.sync(pattern, {
          cwd: process.cwd(),
          ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
          nodir: true,
        });
        allFiles.push(...files);
      }
      if (allFiles.length === 0) {
        console.log(StatusIconService.warning("No se encontraron archivos"));
        return [];
      }

      const sortedFiles = allFiles.sort((a, b) => {
        const dirA = path.dirname(a);
        const dirB = path.dirname(b);
        if (dirA !== dirB) {
          return dirA.localeCompare(dirB);
        }
        return path.basename(a).localeCompare(path.basename(b));
      });

      const filesToShow = sortedFiles.slice(0, 30);

      if (sortedFiles.length > 30) {
        console.log(
          StatusIconService.warning(
            `Mostrando primeros 30 de ${sortedFiles.length} archivos encontrados`
          )
        );
      }

      const choices = filesToShow.map((file) => {
        const fileIcon = IconService.getFileIcon(file);
        return {
          name:
            `${fileIcon} ` +
            chalk.yellowBright(path.basename(file)) +
            chalk.dim(` (${path.dirname(file)})`),
          value: file,
          checked: false,
        };
      });
      const answer = await inquirer.prompt([
        {
          type: "checkbox",
          name: "files",
          message: chalk.greenBright(`${IconService.get("search")} ${message}`),
          choices,
          pageSize: 15,
          loop: false,
        },
      ]);

      return answer.files;
    } catch (error) {
      console.log(StatusIconService.warning("Error buscando archivos"));
      return [];
    }
  }

  /**
   * Permite seleccionar archivos por tipo específico
   */
  async selectFileByType(
    message = "Selecciona un archivo",
    fileType: "excel" | "csv" | "sql" | "any" = "any"
  ): Promise<string> {
    const extensionMap = {
      excel: ["xlsx", "xls"],
      csv: ["csv"],
      sql: ["sql"],
      any: ["*"],
    };

    const extensions = extensionMap[fileType];
    return await this.selectFile(message, extensions);
  }
  /**
   * Hace una pregunta simple al usuario con estilo mejorado
   */
  async question(message: string): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "response",
        message: this.visualEffects.createGradientText(
          `${IconService.get("pointer")} ${message} (o 'cancelar' para volver)`,
          "primary"
        ),
        validate: (input: string) => {
          // Permitir cancelación
          if (
            input.trim().toLowerCase() === "cancelar" ||
            input.trim().toLowerCase() === "cancel"
          ) {
            return true;
          }
          return (
            input.trim().length > 0 || "Por favor ingresa una respuesta válida"
          );
        },
      },
    ]);

    // Verificar cancelación
    if (
      answer.response.trim().toLowerCase() === "cancelar" ||
      answer.response.trim().toLowerCase() === "cancel"
    ) {
      throw new Error("OPERATION_CANCELLED");
    }

    return answer.response;
  }
  /**
   * Muestra una confirmación (sí/no) al usuario con estilo mejorado
   */
  async confirmAction(message: string): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "confirmed",
        message: this.visualEffects.createGradientText(
          `${IconService.get("pointer")} ${message}`,
          "warning"
        ),
        choices: [
          {
            name: this.visualEffects.createGradientText("✓ Sí", "success"),
            value: true,
          },
          {
            name: this.visualEffects.createGradientText("✗ No", "error"),
            value: false,
          },
          {
            name: this.visualEffects.createGradientText(
              "⇠ Cancelar - Volver al menú anterior",
              "warning"
            ),
            value: "cancel",
          },
        ],
        default: 1, // No por defecto
      },
    ]);

    // Verificar cancelación
    if (answer.confirmed === "cancel") {
      throw new Error("OPERATION_CANCELLED");
    }

    return answer.confirmed;
  }
  /**
   * Cierra la interfaz CLI con efectos de despedida
   */
  async close(): Promise<void> {
    await this.visualEffects.showFarewellBanner();
  }

  /**
   * Muestra un mensaje informativo con efectos visuales
   */
  showMessage(message: string): void {
    const styledMessage = this.visualEffects.createGradientText(
      `${IconService.get("info")} ${message}`,
      "info"
    );
    console.log(styledMessage);
  }

  /**
   * Muestra un mensaje de error con efectos visuales
   */
  showError(message: string): void {
    const styledMessage = this.visualEffects.createGradientText(
      `${IconService.get("error")} ${message}`,
      "error"
    );
    console.log(chalk.bold(styledMessage));
  }

  /**
   * Muestra un mensaje de éxito con efectos visuales
   */
  showSuccess(message: string): void {
    const styledMessage = this.visualEffects.createGradientText(
      `${IconService.get("success")} ${message}`,
      "success"
    );
    console.log(chalk.bold(styledMessage));
  }

  /**
   * Muestra un mensaje de advertencia con efectos visuales
   */
  showWarning(message: string): void {
    const styledMessage = this.visualEffects.createGradientText(
      `${IconService.get("warning")} ${message}`,
      "warning"
    );
    console.log(chalk.bold(styledMessage));
  }
  /**
   * Muestra un menú de selección múltiple (checkbox) mejorado
   */
  async showMultiSelect(
    title: string,
    options: MenuOption[]
  ): Promise<string[]> {
    // Usar el nuevo header con efectos visuales
    const menuHeader = this.visualEffects.createMenuHeader(title);
    console.log(menuHeader);

    const choices = options.map((option) => ({
      name: option.description
        ? this.visualEffects.createGradientText(option.label, "menu") +
          chalk.dim(" - " + option.description)
        : this.visualEffects.createGradientText(option.label, "menu"),
      value: option.key,
      checked: false,
    }));

    const answer = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selections",
        message: this.visualEffects.createGradientText(
          `${IconService.get(
            "selected"
          )} Selecciona las opciones (usa espacio para marcar/desmarcar):`,
          "primary"
        ),
        choices,
        pageSize: 15,
        loop: false,
      },
    ]);

    return answer.selections;
  }
  /**
   * Muestra un input con autocompletado mejorado
   */
  async showAutocomplete(message: string, choices: string[]): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "selection",
        message: chalk.greenBright(`${IconService.get("search")} ${message}`),
        choices: choices.map((choice) => ({
          name: chalk.yellowBright(choice),
          value: choice,
        })),
        pageSize: 15,
        loop: false,
      },
    ]);

    return answer.selection;
  }

  /**
   * Muestra un input de contraseña mejorado
   */
  async askPassword(message: string): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: "password",
        name: "password",
        message: chalk.greenBright(`${IconService.get("pointer")} ${message}`),
        mask: chalk.dim("*"),
      },
    ]);

    return answer.password;
  }

  /**
   * Muestra progreso usando el spinner service
   */
  async showProgress(
    message: string,
    operation?: () => Promise<void>
  ): Promise<void> {
    if (operation) {
      await this.spinnerService.withSpinner(
        operation,
        { text: message, type: "dots" },
        `${message} - Completado`,
        `${message} - Error`
      );
    } else {
      SpinnerService.simpleProgress(message);
    }
  }

  /**
   * Inicia un spinner para operaciones largas
   */
  startSpinner(
    message: string,
    type:
      | "loading"
      | "processing"
      | "generating"
      | "connecting"
      | "searching" = "loading"
  ): void {
    this.spinnerService.startPreset(type, message);
  }

  /**
   * Detiene el spinner con éxito
   */
  stopSpinnerSuccess(message?: string): void {
    this.spinnerService.succeed(message);
  }
  /**
   * Detiene el spinner con error
   */
  stopSpinnerError(message?: string): void {
    this.spinnerService.fail(message);
  }
}
