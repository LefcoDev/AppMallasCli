export class ExcelFile {
  constructor(
    public readonly filePath: string,
    public readonly fileName: string,
    public readonly sheetNames: string[],
    public readonly createdAt: Date = new Date()
  ) {}

  static create(
    filePath: string,
    fileName: string,
    sheetNames: string[]
  ): ExcelFile {
    return new ExcelFile(filePath, fileName, sheetNames);
  }

  hasSheet(sheetName: string): boolean {
    return this.sheetNames.includes(sheetName);
  }
}
