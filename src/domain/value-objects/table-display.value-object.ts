export interface TableColumn {
  header: string;
  field: string;
  width?: number;
  align?: "left" | "center" | "right";
  formatter?: (value: any) => string;
}

export interface TableDisplayOptions {
  title?: string;
  showIndex?: boolean;
  colors?: boolean;
  compact?: boolean;
  maxWidth?: number;
}

export class TableDisplayConfig {
  constructor(
    public readonly columns: TableColumn[],
    public readonly options: TableDisplayOptions = {}
  ) {}

  static create(
    columns: TableColumn[],
    options: TableDisplayOptions = {}
  ): TableDisplayConfig {
    return new TableDisplayConfig(columns, options);
  }
}
