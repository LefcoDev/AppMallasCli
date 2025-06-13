/**
 * Utilidades para banners y efectos visuales de la aplicación
 */
import figlet from "figlet";
import { format } from "date-fns";

export class BannerUtils {
  private static readonly colors = {
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    red: "\x1b[31m",
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    bright: "\x1b[1m",
  };
  /**
   * Muestra el banner principal de la aplicación
   */
  static async showMainBanner(): Promise<void> {
    console.clear();

    const banner = figlet.textSync("NODE APP", {
      font: "Big",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    const oracleBanner = figlet.textSync("ORACLE", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    console.log(this.colors.cyan + banner + this.colors.reset);
    console.log(this.colors.yellow + oracleBanner + this.colors.reset);
    console.log("");
    console.log(this.colors.blue + "═".repeat(70) + this.colors.reset);
    console.log(
      this.colors.bold +
        this.colors.green +
        "🚀 PROCESADOR DE ARCHIVOS SIMPLIFICADO" +
        this.colors.reset
    );
    console.log(this.colors.blue + "═".repeat(70) + this.colors.reset);

    // Usar el nuevo método de información del sistema
    this.showSystemInfo();

    console.log(this.colors.blue + "═".repeat(70) + this.colors.reset);
    console.log(
      this.colors.magenta +
        "✨ FUNCIONALIDADES DISPONIBLES:" +
        this.colors.reset
    );
    console.log(
      this.colors.green +
        "  � Procesamiento ZIP (Sin Oracle)" +
        this.colors.reset
    );
    console.log(
      this.colors.green +
        "  🎯 Mapeo Inteligente de Archivos (Oracle)" +
        this.colors.reset
    );
    console.log(this.colors.blue + "═".repeat(70) + this.colors.reset);
    console.log("");

    // Pausa dramática para mostrar el banner
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Muestra un banner compacto para modo desarrollo
   */
  static showDevBanner(): void {
    console.clear();

    const devBanner = figlet.textSync("DEV MODE", {
      font: "Small",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    console.log(this.colors.magenta + devBanner + this.colors.reset);
    console.log(
      this.colors.yellow + "🔧 MODO DESARROLLO ACTIVO 🔧" + this.colors.reset
    );
    console.log(this.colors.blue + "─".repeat(50) + this.colors.reset);
    console.log(
      this.colors.dim +
        "📅 " +
        format(new Date(), "dd/MM/yyyy HH:mm:ss") +
        this.colors.reset
    );
    console.log(this.colors.blue + "─".repeat(50) + this.colors.reset);
    console.log("");
  }

  /**
   * Muestra el banner de despedida
   */
  static showGoodbyeBanner(): void {
    console.log("\n");
    const goodbyeBanner = figlet.textSync("GOODBYE!", {
      font: "Small",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    console.log(this.colors.magenta + goodbyeBanner + this.colors.reset);
    console.log(this.colors.cyan + "═".repeat(50) + this.colors.reset);
    console.log(
      this.colors.green +
        "✨ Gracias por usar Node App Oracle! ✨" +
        this.colors.reset
    );
    console.log(this.colors.cyan + "═".repeat(50) + this.colors.reset);
    console.log(
      this.colors.dim +
        "📅 Finalizado: " +
        format(new Date(), "dd/MM/yyyy HH:mm:ss") +
        this.colors.reset
    );
    console.log(
      this.colors.yellow + "👋 ¡Hasta la vista! 🚀" + this.colors.reset
    );
  }

  /**
   * Muestra un banner personalizado
   */
  static showCustomBanner(text: string, subtitle?: string): void {
    const customBanner = figlet.textSync(text, {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    console.log(this.colors.cyan + customBanner + this.colors.reset);
    if (subtitle) {
      console.log(this.colors.yellow + subtitle + this.colors.reset);
    }
    console.log(this.colors.blue + "─".repeat(60) + this.colors.reset);
  }

  /**
   * Efecto de carga con puntos animados
   */
  static async showLoading(
    message: string,
    duration: number = 2000
  ): Promise<void> {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;

    const interval = setInterval(() => {
      process.stdout.write(
        `\r${this.colors.cyan}${frames[i % frames.length]} ${message}${
          this.colors.reset
        }`
      );
      i++;
    }, 100);

    await new Promise((resolve) => setTimeout(resolve, duration));
    clearInterval(interval);
    process.stdout.write(
      `\r${this.colors.green}✓ ${message}${this.colors.reset}\n`
    );
  }

  /**
   * Muestra banner para el Oracle Database Explorer
   */
  static showOracleExplorerBanner(): void {
    console.clear();

    const banner = figlet.textSync("ORACLE", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    const subBanner = figlet.textSync("EXPLORER", {
      font: "Small",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    console.log(this.colors.blue + banner + this.colors.reset);
    console.log(this.colors.cyan + subBanner + this.colors.reset);
    console.log("");

    console.log(this.colors.blue + "═".repeat(60) + this.colors.reset);
    console.log(
      this.colors.bold +
        this.colors.green +
        "🔍 ORACLE DATABASE EXPLORER" +
        this.colors.reset
    );
    console.log(this.colors.blue + "═".repeat(60) + this.colors.reset);
    console.log(
      this.colors.dim +
        "Explora estructura de tablas y genera INSERTs manuales" +
        this.colors.reset
    );
    console.log(this.colors.blue + "─".repeat(60) + this.colors.reset);
    console.log("");
  }

  /**
   * Muestra banner para el Excel Mapper
   */
  static showExcelMapperBanner(): void {
    console.clear();

    const banner = figlet.textSync("EXCEL", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    const subBanner = figlet.textSync("MAPPER", {
      font: "Small",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    console.log(this.colors.green + banner + this.colors.reset);
    console.log(this.colors.yellow + subBanner + this.colors.reset);
    console.log("");

    console.log(this.colors.green + "═".repeat(60) + this.colors.reset);
    console.log(
      this.colors.bold +
        this.colors.cyan +
        "📊 EXCEL TO ORACLE MAPPER" +
        this.colors.reset
    );
    console.log(this.colors.green + "═".repeat(60) + this.colors.reset);
    console.log(
      this.colors.dim +
        "Convierte datos de Excel a sentencias INSERT de Oracle" +
        this.colors.reset
    );
    console.log(this.colors.green + "─".repeat(60) + this.colors.reset);
    console.log("");
  }

  /**
   * Muestra banner para el CSV Generator
   */
  static showCsvGeneratorBanner(): void {
    console.clear();

    const banner = figlet.textSync("CSV", {
      font: "Big",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    const subBanner = figlet.textSync("GENERATOR", {
      font: "Small",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    console.log(this.colors.magenta + banner + this.colors.reset);
    console.log(this.colors.yellow + subBanner + this.colors.reset);
    console.log("");

    console.log(this.colors.magenta + "═".repeat(60) + this.colors.reset);
    console.log(
      this.colors.bold +
        this.colors.cyan +
        "📋 CSV TO ORACLE GENERATOR" +
        this.colors.reset
    );
    console.log(this.colors.magenta + "═".repeat(60) + this.colors.reset);
    console.log(
      this.colors.dim +
        "Genera DDL, CTL y scripts de carga desde archivos CSV" +
        this.colors.reset
    );
    console.log(this.colors.magenta + "─".repeat(60) + this.colors.reset);
    console.log("");
  }

  /**
   * Muestra información del sistema con estilo
   */
  static showSystemInfo(): void {
    console.log(this.colors.blue + "═".repeat(70) + this.colors.reset);
    console.log(
      this.colors.bold +
        this.colors.green +
        "💻 INFORMACIÓN DEL SISTEMA" +
        this.colors.reset
    );
    console.log(this.colors.blue + "═".repeat(70) + this.colors.reset);

    console.log(
      this.colors.cyan +
        "🔧 Node.js:" +
        this.colors.reset +
        " " +
        this.colors.yellow +
        process.version +
        this.colors.reset
    );
    console.log(
      this.colors.cyan +
        "💻 Plataforma:" +
        this.colors.reset +
        " " +
        this.colors.yellow +
        process.platform +
        " " +
        process.arch +
        this.colors.reset
    );
    console.log(
      this.colors.cyan +
        "📁 Directorio:" +
        this.colors.reset +
        " " +
        this.colors.dim +
        process.cwd() +
        this.colors.reset
    );
    console.log(
      this.colors.cyan +
        "🕐 Tiempo:" +
        this.colors.reset +
        " " +
        this.colors.yellow +
        format(new Date(), "dd/MM/yyyy HH:mm:ss") +
        this.colors.reset
    );
    console.log(
      this.colors.cyan +
        "🆔 PID:" +
        this.colors.reset +
        " " +
        this.colors.yellow +
        process.pid +
        this.colors.reset
    );
    console.log(
      this.colors.cyan +
        "💾 Memoria:" +
        this.colors.reset +
        " " +
        this.colors.yellow +
        Math.round(process.memoryUsage().heapUsed / 1024 / 1024) +
        " MB" +
        this.colors.reset
    );

    console.log(this.colors.blue + "─".repeat(70) + this.colors.reset);
    console.log("");
  }

  /**
   * Muestra un separador con estilo
   */
  static showSeparator(width: number = 60): void {
    console.log(this.colors.blue + "─".repeat(width) + this.colors.reset);
  }

  /**
   * Muestra un mensaje de éxito con estilo
   */
  static showSuccess(message: string): void {
    console.log(this.colors.green + "✅ " + message + this.colors.reset);
  }

  /**
   * Muestra un mensaje de error con estilo
   */
  static showError(message: string): void {
    console.log(this.colors.red + "❌ " + message + this.colors.reset);
  }

  /**
   * Muestra un mensaje de advertencia con estilo
   */
  static showWarning(message: string): void {
    console.log(this.colors.yellow + "⚠️  " + message + this.colors.reset);
  }

  /**
   * Muestra un mensaje informativo con estilo
   */
  static showInfo(message: string): void {
    console.log(this.colors.cyan + "ℹ️  " + message + this.colors.reset);
  }
}
