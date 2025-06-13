/**
 * Universal Input Service - Simplified Version
 * No depende de CLI específica, trabaja con UserInterface abstracta
 * Versión simplificada sin dependencias Oracle complejas
 */
import { UserInterface } from "../interfaces/user-interface.interface";

export class UniversalInputService {
  constructor(private readonly userInterface: UserInterface) {}
  /**
   * Solicita entrada de texto simple
   */
  async requestText(
    message: string,
    defaultValue?: string
  ): Promise<string | null> {
    const response = await this.userInterface.requestInput<string>({
      type: "text",
      message,
    });

    return response.success ? response.value || null : null;
  }

  /**
   * Solicita confirmación sí/no
   */
  async requestConfirmation(message: string): Promise<boolean> {
    const response = await this.userInterface.requestInput<string>({
      type: "choice",
      message,
      options: [
        { key: "yes", label: "Sí" },
        { key: "no", label: "No" },
      ],
    });

    return response.success && response.value === "yes";
  }

  /**
   * Solicita selección de una opción
   */
  async requestChoice(
    message: string,
    options: Array<{ key: string; label: string; description?: string }>
  ): Promise<string | null> {
    const response = await this.userInterface.requestInput<string>({
      type: "choice",
      message,
      options,
    });

    return response.success ? response.value || null : null;
  }

  /**
   * Solicita entrada numérica
   */
  async requestNumber(
    message: string,
    min?: number,
    max?: number
  ): Promise<number | null> {
    const response = await this.userInterface.requestInput<string>({
      type: "text",
      message: `${message} ${min !== undefined ? `(min: ${min})` : ""} ${
        max !== undefined ? `(max: ${max})` : ""
      }`,
    });

    if (!response.success || !response.value) {
      return null;
    }

    const num = parseFloat(response.value);
    if (isNaN(num)) {
      return null;
    }

    if (min !== undefined && num < min) {
      return null;
    }

    if (max !== undefined && num > max) {
      return null;
    }

    return num;
  }

  /**
   * Solicita nombre de archivo
   */
  async requestFileName(
    message: string = "Nombre del archivo",
    extension?: string
  ): Promise<string | null> {
    const response = await this.userInterface.requestInput<string>({
      type: "text",
      message: extension ? `${message} (extensión: ${extension})` : message,
    });

    return response.success ? response.value || null : null;
  }
}
