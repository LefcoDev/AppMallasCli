/**
 * Status Icon Service for CLI Interface
 * Provides status-specific icons and formatting utilities
 * Extends the base IconService with status-focused functionality
 */

import logSymbols from "log-symbols";
import { IconService } from "./icon.service";

export type StatusType = "success" | "error" | "warning" | "info";

export interface StatusMessage {
  type: StatusType;
  message: string;
  icon: string;
  formatted: string;
}

export class StatusIconService {
  /**
   * Status symbols from log-symbols with fallbacks
   */
  static readonly status = {
    success: logSymbols.success || "✅",
    error: logSymbols.error || "❌",
    warning: logSymbols.warning || "⚠️",
    info: logSymbols.info || "ℹ️",
  };

  /**
   * Create a success message with icon
   * @param message - The success message
   * @returns Formatted success message
   */
  static success(message: string): string {
    return `${StatusIconService.status.success} ${message}`;
  }

  /**
   * Create an error message with icon
   * @param message - The error message
   * @returns Formatted error message
   */
  static error(message: string): string {
    return `${StatusIconService.status.error} ${message}`;
  }

  /**
   * Create a warning message with icon
   * @param message - The warning message
   * @returns Formatted warning message
   */
  static warning(message: string): string {
    return `${StatusIconService.status.warning} ${message}`;
  }

  /**
   * Create an info message with icon
   * @param message - The info message
   * @returns Formatted info message
   */
  static info(message: string): string {
    return `${StatusIconService.status.info} ${message}`;
  }

  /**
   * Create a status message object
   * @param type - The status type
   * @param message - The message text
   * @returns StatusMessage object with all formatting
   */
  static createStatusMessage(type: StatusType, message: string): StatusMessage {
    const icon = StatusIconService.status[type];
    const formatted = `${icon} ${message}`;

    return {
      type,
      message,
      icon,
      formatted,
    };
  }

  /**
   * Format multiple status messages
   * @param messages - Array of status messages
   * @returns Array of formatted status strings
   */
  static formatMultiple(
    messages: Array<{ type: StatusType; message: string }>
  ): string[] {
    return messages.map(
      ({ type, message }) =>
        StatusIconService.createStatusMessage(type, message).formatted
    );
  }

  /**
   * Get status icon by type
   * @param type - The status type
   * @returns The appropriate status icon
   */
  static getStatusIcon(type: StatusType): string {
    return StatusIconService.status[type] || StatusIconService.status.info;
  }

  /**
   * Check if a message type is an error or warning
   * @param type - The status type to check
   * @returns Boolean indicating if this is an error/warning status
   */
  static isErrorOrWarning(type: StatusType): boolean {
    return type === "error" || type === "warning";
  }

  /**
   * Create a formatted summary with counts
   * @param results - Object with status counts
   * @returns Formatted summary string
   */
  static createSummary(results: {
    success?: number;
    error?: number;
    warning?: number;
    info?: number;
  }): string {
    const parts: string[] = [];

    if (results.success) {
      parts.push(StatusIconService.success(`${results.success} successful`));
    }
    if (results.error) {
      parts.push(StatusIconService.error(`${results.error} errors`));
    }
    if (results.warning) {
      parts.push(StatusIconService.warning(`${results.warning} warnings`));
    }
    if (results.info) {
      parts.push(StatusIconService.info(`${results.info} notices`));
    }

    return parts.join(" | ");
  }
}
