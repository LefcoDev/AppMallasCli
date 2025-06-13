/**
 * Visual Effects Service
 * Servicio centralizado para efectos visuales mejorados de la CLI
 */
import gradient from "gradient-string";
import * as cliProgress from "cli-progress";
import figlet from "figlet";
import chalk from "chalk";
import { IconService } from "./icon.service";

export class VisualEffectsService {
  private static instance: VisualEffectsService;

  // Definir gradientes personalizados
  public static readonly gradients = {
    primary: gradient("#FF6B6B", "#4ECDC4", "#45B7D1"),
    success: gradient("#56FFA4", "#59BC86"),
    warning: gradient("#FFD93D", "#FF8C42"),
    error: gradient("#FF6B6B", "#FF8E53"),
    info: gradient("#74B9FF", "#6C5CE7"),
    menu: gradient("#A8E6CF", "#FFD93D", "#FFB6C1"),
    farewell: gradient("#667eea", "#764ba2", "#f093fb"),
    title: gradient("#fc466b", "#3f5efb"),
    oracle: gradient("#1e3c72", "#2a5298", "#74b9ff"),
    processing: gradient("#00c9ff", "#92fe9d"),
  };

  // Configuraciones de barras de progreso
  public static readonly progressBarConfigs = {
    default: {
      format:
        chalk.cyan("{bar}") +
        " | {percentage}% | {value}/{total} | ETA: {eta}s",
      barCompleteChar: "█",
      barIncompleteChar: "░",
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true,
    },
    processing: {
      format:
        gradient("#00c9ff", "#92fe9d")("{bar}") +
        " | {percentage}% | {msg} | {value}/{total}",
      barCompleteChar: "▓",
      barIncompleteChar: "░",
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true,
    },
    download: {
      format: chalk.yellow("{bar}") + " | {percentage}% | {speed} | {filename}",
      barCompleteChar: "■",
      barIncompleteChar: "□",
      hideCursor: true,
    },
  };

  private constructor() {}

  public static getInstance(): VisualEffectsService {
    if (!VisualEffectsService.instance) {
      VisualEffectsService.instance = new VisualEffectsService();
    }
    return VisualEffectsService.instance;
  }

  /**
   * Crear texto con gradiente
   */
  public createGradientText(
    text: string,
    gradientName: keyof typeof VisualEffectsService.gradients = "primary"
  ): string {
    const gradientFunc = VisualEffectsService.gradients[gradientName];
    return gradientFunc(text);
  }

  /**
   * Crear banner con figlet y gradiente
   */
  public async createGradientBanner(
    text: string,
    gradientName: keyof typeof VisualEffectsService.gradients = "title",
    font: figlet.Fonts = "Big"
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      figlet.text(text, { font }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        const gradientFunc = VisualEffectsService.gradients[gradientName];
        resolve(gradientFunc(data || ""));
      });
    });
  }

  /**
   * Crear barra de progreso
   */
  public createProgressBar(
    total: number,
    configName: keyof typeof VisualEffectsService.progressBarConfigs = "default"
  ): cliProgress.SingleBar {
    const config = VisualEffectsService.progressBarConfigs[configName];
    return new cliProgress.SingleBar(config, cliProgress.Presets.rect);
  }

  /**
   * Crear múltiples barras de progreso
   */
  public createMultiProgressBar(): cliProgress.MultiBar {
    return new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format:
          gradient("#00c9ff", "#92fe9d")("{bar}") +
          " | {name} | {percentage}% | {value}/{total}",
      },
      cliProgress.Presets.shades_grey
    );
  }

  /**
   * Mostrar mensaje de bienvenida con efectos
   */
  public async showWelcomeBanner(): Promise<void> {
    console.clear();
    const banner = await this.createGradientBanner(
      "ORACLE MAPPER",
      "title",
      "Big"
    );
    console.log(banner);

    const subtitle = this.createGradientText(
      "Sistema de Migración de Mallas Académicas",
      "menu"
    );
    console.log("\n" + " ".repeat(15) + subtitle);

    const separator = this.createGradientText("═".repeat(80), "primary");
    console.log("\n" + separator + "\n");
  }
  /**
   * Mostrar mensaje de despedida con efectos
   */
  public async showFarewellBanner(): Promise<void> {
    console.log("\n");
    const farewell = await this.createGradientBanner(
      "GOODBYE!",
      "farewell",
      "Slant"
    );
    console.log(farewell);

    const messages = [
      "¡Gracias por usar Oracle Mapper!",
      "Sistema de Migración de Mallas Académicas",
      "¡Hasta la próxima! 👋",
    ];

    messages.forEach((message, index) => {
      setTimeout(() => {
        const gradientMessage = this.createGradientText(message, "farewell");
        console.log(" ".repeat(10) + gradientMessage);
      }, index * 800);
    });

    // Esperar a que se muestren todos los mensajes
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  /**
   * Método unificado de despedida para todos los menús
   * Este método debe ser llamado cuando cualquier controlador termine
   */
  public async showUnifiedFarewellMessage(
    customMessage?: string,
    skipDelay = false
  ): Promise<void> {
    console.clear();
    console.log("\n");

    // Banner principal con figlet
    const farewellBanner = await this.createGradientBanner(
      "GOODBYE!",
      "farewell",
      "Big"
    );
    console.log(farewellBanner);

    // Separador decorativo
    const separator = this.createGradientText("═".repeat(80), "farewell");
    console.log(separator);

    // Mensajes de despedida
    const messages = [
      customMessage || "¡Gracias por usar Oracle Mapper!",
      "Sistema de Migración de Mallas Académicas",
    ];

    if (skipDelay) {
      // Mostrar todos los mensajes inmediatamente
      messages.forEach((message) => {
        const gradientMessage = this.createGradientText(message, "farewell");
        console.log(" ".repeat(15) + gradientMessage);
      });
    } else {
      // Mostrar con efecto de escritura temporal
      for (let i = 0; i < messages.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const gradientMessage = this.createGradientText(
          messages[i],
          "farewell"
        );
        console.log(" ".repeat(15) + gradientMessage);
      }
    }

    console.log("\n" + separator);

    // Pausa final para que el usuario pueda ver el mensaje
    if (!skipDelay) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  /**
   * Crear encabezado de menú con efectos
   */
  public createMenuHeader(title: string, description?: string): string {
    const headerTitle = this.createGradientText(
      ` ${IconService.get("pointer")} ${title.toUpperCase()} `,
      "menu"
    );
    const separator = this.createGradientText(
      "═".repeat(title.length + 25),
      "primary"
    );

    let header = "\n" + headerTitle + "\n" + separator;

    if (description) {
      const desc = chalk.dim.italic(" ".repeat(5) + description);
      header += "\n" + desc;
    }

    return header + "\n";
  }

  /**
   * Crear separador decorativo
   */
  public createSeparator(
    length: number = 80,
    gradientName: keyof typeof VisualEffectsService.gradients = "primary"
  ): string {
    return this.createGradientText("─".repeat(length), gradientName);
  }

  /**
   * Crear caja de información con bordes decorativos
   */
  public createInfoBox(
    title: string,
    content: string[],
    gradientName: keyof typeof VisualEffectsService.gradients = "info"
  ): string {
    const maxLength =
      Math.max(title.length, ...content.map((line) => line.length)) + 4;

    const topBorder = this.createGradientText(
      "╭" + "─".repeat(maxLength) + "╮",
      gradientName
    );
    const bottomBorder = this.createGradientText(
      "╰" + "─".repeat(maxLength) + "╯",
      gradientName
    );

    let box = topBorder + "\n";

    // Título
    const titleLine = `│ ${this.createGradientText(
      title,
      gradientName
    )} ${" ".repeat(maxLength - title.length - 1)}│`;
    box += titleLine + "\n";

    // Separador
    const separatorLine = this.createGradientText(
      "├" + "─".repeat(maxLength) + "┤",
      gradientName
    );
    box += separatorLine + "\n";

    // Contenido
    content.forEach((line) => {
      const contentLine = `│ ${line}${" ".repeat(
        maxLength - line.length - 1
      )}│`;
      box += this.createGradientText(contentLine, gradientName) + "\n";
    });

    box += bottomBorder;

    return box;
  }

  /**
   * Simular efecto de escritura (typing effect)
   */
  public async typeEffect(text: string, speed: number = 50): Promise<void> {
    for (const char of text) {
      process.stdout.write(char);
      await new Promise((resolve) => setTimeout(resolve, speed));
    }
    console.log();
  }

  /**
   * Mostrar spinner personalizado con gradiente
   */
  public createGradientSpinner(message: string): {
    start: () => void;
    stop: () => void;
    succeed: (msg?: string) => void;
    fail: (msg?: string) => void;
  } {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let frameIndex = 0;
    let interval: NodeJS.Timeout;

    return {
      start: () => {
        process.stdout.write("\x1B[?25l"); // Hide cursor
        interval = setInterval(() => {
          const frame = this.createGradientText(
            frames[frameIndex],
            "processing"
          );
          process.stdout.write(`\r${frame} ${message}`);
          frameIndex = (frameIndex + 1) % frames.length;
        }, 100);
      },
      stop: () => {
        if (interval) clearInterval(interval);
        process.stdout.write("\x1B[?25h"); // Show cursor
        process.stdout.write("\r" + " ".repeat(message.length + 10) + "\r");
      },
      succeed: (msg?: string) => {
        if (interval) clearInterval(interval);
        process.stdout.write("\x1B[?25h");
        const successIcon = this.createGradientText("✓", "success");
        console.log(`\r${successIcon} ${msg || message}`);
      },
      fail: (msg?: string) => {
        if (interval) clearInterval(interval);
        process.stdout.write("\x1B[?25h");
        const errorIcon = this.createGradientText("✗", "error");
        console.log(`\r${errorIcon} ${msg || message}`);
      },
    };
  }
}
