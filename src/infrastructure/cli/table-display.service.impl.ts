import Table from "cli-table3";
import chalk from "chalk";
import { TableDisplayService } from "../../domain/services/table-display.service";
import {
  TableDisplayConfig,
  TableColumn,
} from "../../domain/value-objects/table-display.value-object";

export class CliTable3DisplayService implements TableDisplayService {
  displayTable<T>(data: T[], config: TableDisplayConfig): void {
    if (!data || data.length === 0) {
      console.log(chalk.yellow("📋 No data to display"));
      return;
    }

    // Preparar headers
    const headers = config.options.showIndex
      ? ["#", ...config.columns.map((col) => col.header)]
      : config.columns.map((col) => col.header); // Crear tabla con headers en la configuración
    const colWidths = config.columns.map((col) => col.width || 20);
    if (config.options.showIndex) {
      colWidths.unshift(5);
    }

    const tableConfig: any = {
      head: headers.map((h) => chalk.cyan(h)),
      style: {
        head: ["cyan"],
        border: ["gray"],
        compact: config.options.compact || false,
      },
      wordWrap: true,
      wrapOnWordBoundary: false,
    };

    // Solo agregar colWidths si no hay maxWidth definido
    if (!config.options.maxWidth) {
      tableConfig.colWidths = colWidths;
    }

    const table = new Table(tableConfig) as any;

    // Add data rows
    data.forEach((item, index) => {
      const row = config.columns.map((col) => this.formatCellValue(item, col));

      if (config.options.showIndex) {
        row.unshift((index + 1).toString());
      }

      table.push(row);
    });

    if (config.options.title) {
      console.log(chalk.bold.cyan(`\n📊 ${config.options.title}`));
    }

    console.log(table.toString());
  }
  displayKeyValuePairs(data: Record<string, any>, title?: string): void {
    const table = new Table({
      head: [chalk.cyan("Property"), chalk.cyan("Value")],
      colWidths: [25, 50],
      style: {
        head: ["cyan"],
        border: ["gray"],
        compact: true,
      },
    }) as any;

    Object.entries(data).forEach(([key, value]) => {
      table.push([chalk.bold(key), this.formatValue(value)]);
    });

    if (title) {
      console.log(chalk.bold.cyan(`\n🔍 ${title}`));
    }

    console.log(table.toString());
  }
  displayStatistics(
    stats: Record<string, number | string>,
    title?: string
  ): void {
    const table = new Table({
      head: [chalk.cyan("Metric"), chalk.cyan("Value"), chalk.cyan("Status")],
      colWidths: [25, 15, 10],
      style: {
        head: ["cyan"],
        border: ["gray"],
      },
    }) as any;

    Object.entries(stats).forEach(([key, value]) => {
      const status = this.getStatusIcon(key, value);
      table.push([chalk.bold(key), this.formatValue(value), status]);
    });

    if (title) {
      console.log(chalk.bold.cyan(`\n📈 ${title}`));
    }

    console.log(table.toString());
  }
  displayList(items: string[], title?: string): void {
    const table = new Table({
      head: [chalk.cyan("#"), chalk.cyan("Item")],
      colWidths: [5, 50],
      style: {
        head: ["cyan"],
        border: ["gray"],
        compact: true,
      },
    }) as any;

    items.forEach((item, index) => {
      table.push([chalk.dim((index + 1).toString()), item]);
    });

    if (title) {
      console.log(chalk.bold.cyan(`\n📝 ${title}`));
    }

    console.log(table.toString());
  }
  private createTable(config: TableDisplayConfig): any {
    const colWidths = config.columns.map((col) => col.width || 20);

    if (config.options.showIndex) {
      colWidths.unshift(5);
    }

    return new Table({
      style: {
        head: ["cyan"],
        border: ["gray"],
        compact: config.options.compact || false,
      },
      colWidths: config.options.maxWidth ? undefined : colWidths,
      wordWrap: true,
      wrapOnWordBoundary: false,
    }) as any;
  }

  private formatCellValue<T>(item: T, column: TableColumn): string {
    const value = this.getNestedValue(item, column.field);

    if (column.formatter) {
      return column.formatter(value);
    }

    return this.formatValue(value);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return chalk.gray("N/A");
    }

    if (typeof value === "boolean") {
      return value ? chalk.green("✅ Yes") : chalk.red("❌ No");
    }

    if (typeof value === "number") {
      return value.toLocaleString();
    }

    if (typeof value === "string" && value.length > 40) {
      return value.substring(0, 37) + "...";
    }

    return String(value);
  }

  private getStatusIcon(key: string, value: any): string {
    const lowerKey = key.toLowerCase();

    if (
      lowerKey.includes("error") ||
      lowerKey.includes("invalid") ||
      lowerKey.includes("failed")
    ) {
      return Number(value) > 0 ? chalk.red("❌") : chalk.green("✅");
    }

    if (
      lowerKey.includes("success") ||
      lowerKey.includes("valid") ||
      lowerKey.includes("completed")
    ) {
      return Number(value) > 0 ? chalk.green("✅") : chalk.yellow("⚠️");
    }

    if (lowerKey.includes("warning") || lowerKey.includes("pending")) {
      return Number(value) > 0 ? chalk.yellow("⚠️") : chalk.green("✅");
    }

    return chalk.blue("ℹ️");
  }
}
