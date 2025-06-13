import * as readline from "readline";
import { CLIInterface, MenuOption } from "./interfaces/cli.interface";

/**
 * Implementación de CLI usando readline (implementación original)
 * Mantenida como backup y para compatibilidad
 */
export class ReadlineCLIService implements CLIInterface {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async showMenu(title: string, options: MenuOption[]): Promise<string> {
    console.log(`\n📋 ${title}`);
    console.log("═".repeat(50));

    options.forEach((option, index) => {
      const description = option.description ? ` - ${option.description}` : "";
      console.log(`${index + 1}. ${option.label}${description}`);
    });
    console.log("0. Salir");
    console.log("═".repeat(50));

    const answer = await this.question("👉 Selecciona una opción: ");
    const selectedIndex = parseInt(answer) - 1;

    if (answer === "0") {
      return "exit";
    }

    if (selectedIndex >= 0 && selectedIndex < options.length) {
      return options[selectedIndex].key;
    }

    console.log("❌ Opción inválida, por favor intenta de nuevo.");
    return this.showMenu(title, options);
  }

  async question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }
  async confirmAction(message: string): Promise<boolean> {
    const answer = await this.question(`${message} (s/n): `);
    return (
      answer.toLowerCase() === "s" ||
      answer.toLowerCase() === "sí" ||
      answer.toLowerCase() === "si" ||
      answer.toLowerCase() === "yes" ||
      answer.toLowerCase() === "y"
    );
  }

  async close(): Promise<void> {
    this.rl.close();
  }

  showMessage(message: string): void {
    console.log(`ℹ️  ${message}`);
  }

  showError(message: string): void {
    console.log(`❌ ${message}`);
  }

  showSuccess(message: string): void {
    console.log(`✅ ${message}`);
  }

  showWarning(message: string): void {
    console.log(`⚠️  ${message}`);
  }
}
