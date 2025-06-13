/**
 * Application Configuration
 * Central configuration for dependency injection and application settings
 */

import { DependencyContainer } from "../application/container/dependency-container";
import path from "path";

export class AppConfig {
  private static instance: AppConfig;
  private container: DependencyContainer;

  private constructor() {
    this.container = DependencyContainer.getInstance();
    this.initializeConfiguration();
  }

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  private initializeConfiguration(): void {
    const outputPath = path.join(process.cwd(), "output");
    this.container.registerDefaults(outputPath);
  }

  getDependencyContainer(): DependencyContainer {
    return this.container;
  }

  getOutputPath(): string {
    return path.join(process.cwd(), "output");
  }

  getDataPath(): string {
    return path.join(process.cwd(), "data");
  }
}

export const appConfig = AppConfig.getInstance();
