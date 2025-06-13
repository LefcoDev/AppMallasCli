import { TableDisplayConfig } from "../value-objects/table-display.value-object";

export interface TableDisplayService {
  displayTable<T>(data: T[], config: TableDisplayConfig): void;
  displayKeyValuePairs(data: Record<string, any>, title?: string): void;
  displayStatistics(
    stats: Record<string, number | string>,
    title?: string
  ): void;
  displayList(items: string[], title?: string): void;
}
