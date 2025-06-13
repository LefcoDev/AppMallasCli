/**
 * Interfaz abstracta para servicios CLI
 * Permite cambiar fácilmente de implementación (readline, inquirer, etc.)
 */
export interface MenuOption {
  key: string;
  label: string;
  description?: string;
  value?: any;
}

export interface CLIInterface {
  /**
   * Muestra un menú de opciones y retorna la selección del usuario
   * @param title Título del menú
   * @param options Opciones a mostrar
   * @param showCancelOption Si es false, no se mostrará la opción de cancelar
   */
  showMenu(
    title: string,
    options: MenuOption[],
    showCancelOption?: boolean
  ): Promise<string>;

  /**
   * Hace una pregunta simple al usuario
   */
  question(message: string): Promise<string>;

  /**
   * Muestra una confirmación (sí/no) al usuario
   */ confirmAction(message: string): Promise<boolean>;

  /**
   * Cierra la interfaz CLI
   */
  close(): Promise<void>;

  /**
   * Muestra un mensaje al usuario
   */
  showMessage(message: string): void;

  /**
   * Muestra un mensaje de error
   */
  showError(message: string): void;

  /**
   * Muestra un mensaje de éxito
   */
  showSuccess(message: string): void;

  /**
   * Muestra un mensaje de advertencia
   */
  showWarning(message: string): void;

  /**
   * Permite seleccionar un archivo navegando los archivos disponibles
   */
  selectFile?(message?: string, extensions?: string[]): Promise<string>;

  /**
   * Permite seleccionar múltiples archivos
   */
  selectMultipleFiles?(
    message?: string,
    extensions?: string[]
  ): Promise<string[]>;

  /**
   * Permite seleccionar archivos por tipo específico
   */
  selectFileByType?(
    message?: string,
    fileType?: "excel" | "csv" | "sql" | "any"
  ): Promise<string>;
}
