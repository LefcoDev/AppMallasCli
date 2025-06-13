/**
 * Icon Service for CLI Interface
 * Provides consistent and compatible icons across different terminal environments
 * Uses figures and log-symbols with Unicode fallbacks
 */

import figures from "figures";
import logSymbols from "log-symbols";

export interface IconMap {
  // Navigation Icons
  folder: string;
  file: string;
  excel: string;
  csv: string;
  text: string;
  upDirectory: string;
  currentDirectory: string;

  // File type icons
  document: string;
  pdf: string;
  image: string;
  video: string;
  audio: string;
  archive: string;
  code: string;
  json: string;
  xml: string;
  sql: string;

  // Status Icons
  success: string;
  error: string;
  warning: string;
  info: string;

  // Action Icons
  search: string;
  loading: string;
  pointer: string;
  selected: string;
  cancel: string;

  // Process Icons
  processing: string;
  completed: string;
  failed: string;

  // Navigation Icons
  previous: string;
  next: string;

  // Special Icons
  separator: string;
  bullet: string;
  arrow: string;
}

export class IconService {
  /**
   * Icon mapping with fallbacks for different terminal capabilities
   */ static readonly icons: IconMap = {
    // Navigation - using figures with Unicode fallbacks
    folder: figures.home || "📁",
    file: figures.bullet || "📄",
    excel: "📊", // Excel specific - Unicode emoji
    csv: "📋", // CSV specific - Unicode emoji
    text: "📝", // Text files - Unicode emoji
    upDirectory: figures.arrowUp || "⬆️",
    currentDirectory: figures.home || "📁",

    // File types
    document: "📄", // Word documents, etc.
    pdf: "📄", // PDF files
    image: "🖼️", // Image files
    video: "🎬", // Video files
    audio: "🎵", // Audio files
    archive: "📦", // ZIP, RAR, etc.
    code: "💻", // Code files
    json: "📋", // JSON files
    xml: "📋", // XML files
    sql: "🗃️", // SQL files

    // Status - using log-symbols with fallbacks
    success: logSymbols.success || "✅",
    error: logSymbols.error || "❌",
    warning: logSymbols.warning || "⚠️",
    info: logSymbols.info || "ℹ️",
    // Actions - using figures with fallbacks
    search: figures.circleQuestionMark || "🔍",
    loading: figures.ellipsis || "⏳",
    pointer: figures.pointer || "❯",
    selected: figures.tick || "✓",
    cancel: figures.cross || "✖",

    // Process status
    processing: figures.ellipsis || "🔄",
    completed: figures.tick || "✅",
    failed: figures.cross || "❌",

    // Navigation
    previous: figures.arrowLeft || "←",
    next: figures.arrowRight || "→",

    // Special
    separator: figures.line || "─",
    bullet: figures.bullet || "•",
    arrow: figures.arrowRight || "→",
  };
  /**
   * Get an icon by name
   * @param iconName - The name of the icon to retrieve
   * @returns The icon string
   */
  static get(iconName: keyof IconMap): string {
    const icon = IconService.icons[iconName];
    return icon || "•"; // Fallback to bullet point if icon is undefined
  }

  /**
   * Create a formatted message with icon
   * @param iconName - The icon to use
   * @param message - The message text
   * @returns Formatted string with icon and message
   */
  static format(iconName: keyof IconMap, message: string): string {
    return `${IconService.get(iconName)} ${message}`;
  }

  /**
   * Create a separator line
   * @param length - Length of the separator (default: 50)
   * @returns Separator string
   */
  static separator(length: number = 50): string {
    return IconService.get("separator").repeat(length);
  }
  /**
   * Get file type icon based on extension
   * @param fileName - The file name or path
   * @returns Appropriate icon for the file type
   */
  static getFileIcon(fileName: string): string {
    if (!fileName || typeof fileName !== "string") {
      return IconService.get("file");
    }

    const ext = fileName.toLowerCase().split(".").pop() || "";

    switch (ext) {
      // Excel files
      case "xlsx":
      case "xls":
      case "xlsm":
      case "xlsb":
        return IconService.get("excel");

      // CSV and data files
      case "csv":
      case "tsv":
        return IconService.get("csv");

      // Text files
      case "txt":
      case "log":
      case "md":
      case "readme":
        return IconService.get("text");

      // Document files
      case "doc":
      case "docx":
      case "odt":
      case "rtf":
        return IconService.get("document");

      // PDF files
      case "pdf":
        return IconService.get("pdf");

      // Image files
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "bmp":
      case "svg":
      case "webp":
      case "ico":
      case "tiff":
        return IconService.get("image");

      // Video files
      case "mp4":
      case "avi":
      case "mov":
      case "wmv":
      case "flv":
      case "webm":
      case "mkv":
        return IconService.get("video");

      // Audio files
      case "mp3":
      case "wav":
      case "flac":
      case "aac":
      case "ogg":
      case "wma":
        return IconService.get("audio");

      // Archive files
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
      case "bz2":
        return IconService.get("archive");

      // Code files
      case "js":
      case "ts":
      case "jsx":
      case "tsx":
      case "py":
      case "java":
      case "c":
      case "cpp":
      case "cs":
      case "php":
      case "rb":
      case "go":
      case "rs":
      case "swift":
      case "kt":
        return IconService.get("code");

      // Configuration and data files
      case "json":
      case "jsonl":
        return IconService.get("json");

      case "xml":
      case "xsd":
      case "xsl":
        return IconService.get("xml");

      case "sql":
      case "ddl":
      case "dml":
        return IconService.get("sql");

      // Configuration files
      case "yml":
      case "yaml":
      case "ini":
      case "cfg":
      case "conf":
      case "config":
      case "env":
        return IconService.get("text");

      // Default for unknown files
      default:
        return IconService.get("file");
    }
  }

  /**
   * Get directory navigation icon
   * @param isParent - Whether this is a parent directory (..)
   * @returns Appropriate navigation icon
   */
  static getDirectoryIcon(isParent: boolean = false): string {
    return isParent
      ? IconService.get("upDirectory")
      : IconService.get("folder");
  }

  /**
   * Check if terminal supports Unicode (basic check)
   * @returns Boolean indicating Unicode support
   */
  static supportsUnicode(): boolean {
    const term = process.env.TERM || "";
    const colorTerm = process.env.COLORTERM || "";

    // Basic heuristic for Unicode support
    return !!(
      process.env.CI ||
      colorTerm === "truecolor" ||
      term.includes("256") ||
      term.includes("color") ||
      process.platform === "win32"
    );
  }

  /**
   * Get appropriate icons based on terminal capabilities
   * @returns Icon set optimized for current terminal
   */
  static getCompatibleIcons(): IconMap {
    if (IconService.supportsUnicode()) {
      return IconService.icons;
    }

    // Fallback to ASCII-safe icons for limited terminals
    return {
      ...IconService.icons,
      folder: "[DIR]",
      file: "[FILE]",
      excel: "[XLS]",
      csv: "[CSV]",
      text: "[TXT]",
      upDirectory: "^",
      success: "[OK]",
      error: "[ERR]",
      warning: "[WARN]",
      info: "[INFO]",
      search: "[FIND]",
      loading: "...",
      pointer: ">",
      selected: "*",
      cancel: "X",
    } as IconMap;
  }
}
