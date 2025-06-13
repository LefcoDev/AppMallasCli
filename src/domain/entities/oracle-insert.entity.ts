export interface OracleInsertField {
  name: string;
  value: any;
  isString?: boolean;
  isFunction?: boolean; // Para casos como SYSDATE
}

export class OracleInsert {
  constructor(
    public readonly tableName: string,
    public readonly fields: OracleInsertField[],
    public readonly includeCommit: boolean = true,
    private readonly columnOrder?: string[] // Orden correcto de columnas de Oracle
  ) {}

  static create(
    tableName: string,
    fields: OracleInsertField[],
    includeCommit = true,
    columnOrder?: string[]
  ): OracleInsert {
    return new OracleInsert(tableName, fields, includeCommit, columnOrder);
  }

  generateStatement(): string {
    // Si tenemos el orden de columnas Oracle, usarlo; si no, usar el orden actual de fields
    const orderedFields = this.columnOrder
      ? this.orderFieldsByColumnOrder()
      : this.fields;

    const fieldNames = orderedFields.map((field) => field.name).join(", ");
    const fieldValues = orderedFields
      .map((field) => this.formatValue(field))
      .join(", ");

    const insert = `Insert into ${this.tableName} (${fieldNames}) Values (${fieldValues});`;

    return this.includeCommit ? `${insert}\nCOMMIT;` : insert;
  }

  /**
   * Ordena los fields según el orden correcto de columnas de Oracle
   */
  private orderFieldsByColumnOrder(): OracleInsertField[] {
    if (!this.columnOrder) {
      return this.fields;
    }

    const fieldsMap = new Map<string, OracleInsertField>();
    this.fields.forEach((field) => {
      fieldsMap.set(field.name, field);
    });

    const orderedFields: OracleInsertField[] = [];

    // Agregar fields en el orden correcto de Oracle
    for (const columnName of this.columnOrder) {
      const field = fieldsMap.get(columnName);
      if (field) {
        orderedFields.push(field);
        fieldsMap.delete(columnName); // Remover para evitar duplicados
      }
    }

    // Agregar cualquier field restante que no esté en columnOrder
    fieldsMap.forEach((field) => {
      orderedFields.push(field);
    });

    return orderedFields;
  }

  private formatValue(field: OracleInsertField): any {
    if (field.isFunction) {
      return field.value; // SYSDATE, NULL, etc.
    }

    if (field.isString || typeof field.value === "string") {
      return field.value === null || field.value === undefined
        ? "NULL"
        : `'${field.value}'`;
    }

    return field.value === null || field.value === undefined
      ? "NULL"
      : field.value;
  }
}
