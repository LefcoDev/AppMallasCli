/**
 * Spinner Service for CLI Interface
 * Provides loading indicators and progress feedback
 * Uses ora and cli-spinners for enhanced user experience
 */

import ora, { Ora } from "ora";
import cliSpinners from "cli-spinners";
import { IconService } from "./icon.service";
import { StatusIconService } from "./status-icon.service.js";

export type SpinnerType = keyof typeof cliSpinners;

export interface SpinnerOptions {
  text: string;
  type?: SpinnerType;
  color?:
    | "black"
    | "red"
    | "green"
    | "yellow"
    | "blue"
    | "magenta"
    | "cyan"
    | "white"
    | "gray";
  hideCursor?: boolean;
}

export class SpinnerService {
  private spinner: Ora | null = null;
  private static instance: SpinnerService | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): SpinnerService {
    if (!SpinnerService.instance) {
      SpinnerService.instance = new SpinnerService();
    }
    return SpinnerService.instance;
  }

  /**
   * Start a spinner with message
   * @param options - Spinner configuration options
   */
  start(options: SpinnerOptions): void {
    this.stop(); // Stop any existing spinner

    const spinnerConfig: any = {
      text: options.text,
      spinner: cliSpinners[options.type || "dots"],
      color: options.color || "cyan",
      hideCursor: options.hideCursor !== false,
    };

    this.spinner = ora(spinnerConfig).start();
  }

  /**
   * Update spinner text
   * @param text - New text for the spinner
   */
  updateText(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  /**
   * Stop spinner with success message
   * @param message - Success message (optional)
   */
  succeed(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message || this.spinner.text);
      this.spinner = null;
    }
  }

  /**
   * Stop spinner with error message
   * @param message - Error message (optional)
   */
  fail(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message || this.spinner.text);
      this.spinner = null;
    }
  }

  /**
   * Stop spinner with warning message
   * @param message - Warning message (optional)
   */
  warn(message?: string): void {
    if (this.spinner) {
      this.spinner.warn(message || this.spinner.text);
      this.spinner = null;
    }
  }

  /**
   * Stop spinner with info message
   * @param message - Info message (optional)
   */
  info(message?: string): void {
    if (this.spinner) {
      this.spinner.info(message || this.spinner.text);
      this.spinner = null;
    }
  }

  /**
   * Stop spinner without any message
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Check if spinner is currently running
   */
  isSpinning(): boolean {
    return this.spinner !== null && this.spinner.isSpinning;
  }

  /**
   * Create a simple progress indicator without ora (fallback)
   * @param message - Progress message
   */
  static simpleProgress(message: string): void {
    process.stdout.write(`${IconService.get("loading")} ${message}\n`);
  }

  /**
   * Predefined spinner configurations for common operations
   */
  static readonly presets = {
    loading: {
      text: "Loading...",
      type: "dots" as SpinnerType,
      color: "cyan" as const,
    },
    processing: {
      text: "Processing files...",
      type: "arc" as SpinnerType,
      color: "blue" as const,
    },
    generating: {
      text: "Generating SQL...",
      type: "bouncingBar" as SpinnerType,
      color: "green" as const,
    },
    connecting: {
      text: "Connecting to database...",
      type: "dots12" as SpinnerType,
      color: "yellow" as const,
    },
    searching: {
      text: "Searching files...",
      type: "runner" as SpinnerType,
      color: "magenta" as const,
    },
  };

  /**
   * Start a preset spinner
   * @param preset - Preset name
   * @param customText - Optional custom text override
   */
  startPreset(
    preset: keyof typeof SpinnerService.presets,
    customText?: string
  ): void {
    const config = SpinnerService.presets[preset];
    this.start({
      ...config,
      text: customText || config.text,
    });
  }

  /**
   * Utility method for async operations with spinner
   * @param operation - Async operation to perform
   * @param options - Spinner options
   * @param successMessage - Message on success
   * @param errorMessage - Message on error
   */
  async withSpinner<T>(
    operation: () => Promise<T>,
    options: SpinnerOptions,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T> {
    this.start(options);

    try {
      const result = await operation();
      this.succeed(successMessage);
      return result;
    } catch (error) {
      this.fail(
        errorMessage ||
          `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
}
