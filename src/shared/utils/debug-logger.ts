/**
 * Debug Logger Service
 * Maneja el logging detallado del proceso de mapeo
 */
import * as fs from "fs/promises";
import * as path from "path";

export class DebugLogger {
  private static instance: DebugLogger;
  private debugFilePath: string;
  private isEnabled: boolean = true;

  private constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.debugFilePath = path.join(
      process.cwd(),
      `debug_mapeo_${timestamp}.log`
    );
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  public async log(message: string): Promise<void> {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    try {
      await fs.appendFile(this.debugFilePath, logEntry, "utf8");
      // También mostrar en consola para feedback inmediato
      console.log(message);
    } catch (error) {
      console.error(`Error escribiendo al archivo de debug: ${error}`);
    }
  }

  public async logSection(title: string): Promise<void> {
    const separator = "=".repeat(80);
    await this.log(`\n${separator}`);
    await this.log(`${title}`);
    await this.log(separator);
  }

  public async logSubSection(title: string): Promise<void> {
    const separator = "-".repeat(60);
    await this.log(`\n${separator}`);
    await this.log(`${title}`);
    await this.log(separator);
  }

  public async logObject(title: string, obj: any): Promise<void> {
    await this.log(`${title}:`);
    await this.log(JSON.stringify(obj, null, 2));
  }

  public getLogFilePath(): string {
    return this.debugFilePath;
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }
}
