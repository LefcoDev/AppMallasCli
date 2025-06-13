/**
 * Interfaz abstracta para la interacción con el usuario
 * Permite diferentes implementaciones: CLI, Web, Desktop, etc.
 */

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface UserInputRequest {
  type: "text" | "choice" | "confirm" | "multiSelect" | "file" | "password";
  message: string;
  options?: Array<{ key: string; label: string; description?: string }>;
  required?: boolean;
  default?: any;
  validate?: (input: any) => boolean | string;
}

export interface UserInputResponse<T = any> {
  success: boolean;
  value?: T;
  cancelled?: boolean;
  error?: string;
}

export interface DisplayData {
  type:
    | "message"
    | "error"
    | "warning"
    | "success"
    | "table"
    | "list"
    | "json"
    | "file";
  content: any;
  title?: string;
  metadata?: Record<string, any>;
}

/**
 * Interfaz principal para interactuar con el usuario
 * Abstrae completamente la implementación de la UI
 */
export interface UserInterface {
  /**
   * Solicita entrada del usuario
   */
  requestInput<T = any>(
    request: UserInputRequest
  ): Promise<UserInputResponse<T>>;

  /**
   * Muestra información al usuario
   */
  display(data: DisplayData): Promise<void>;

  /**
   * Muestra múltiples elementos de información
   */
  displayBatch(data: DisplayData[]): Promise<void>;

  /**
   * Inicializa la interfaz de usuario
   */
  initialize(): Promise<void>;

  /**
   * Cierra la interfaz de usuario
   */
  close(): Promise<void>;

  /**
   * Verifica si la interfaz está disponible
   */
  isAvailable(): boolean;

  /**
   * Methods for enhanced CLI experience
   */
  showMessage(message: string): Promise<void>;
  askQuestion(question: string): Promise<string>;
  /**
   * Permite seleccionar una opción entre varias
   * @param options Las opciones disponibles
   * @param showCancelOption Si es false, no se mostrará la opción de cancelar
   */
  selectOption(
    options: SelectOption[],
    showCancelOption?: boolean
  ): Promise<string>;
  confirmAction(question: string): Promise<boolean>;
  showProgress(message: string): Promise<void>;
  displayTable(data: any[]): Promise<void>;
}

/**
 * Interfaz para reportar progreso de operaciones largas
 */
export interface ProgressReporter {
  start(message: string, total?: number): void;
  update(current: number, message?: string): void;
  complete(message?: string): void;
  fail(error: string): void;
}

/**
 * Interfaz para manejar navegación entre pantallas/vistas
 */
export interface NavigationController {
  navigateTo(view: string, params?: Record<string, any>): Promise<void>;
  goBack(): Promise<void>;
  getCurrentView(): string;
  canGoBack(): boolean;
}
