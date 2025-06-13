/**
 * Application Service Implementation for Oracle Explorer
 */
import {
  OracleExplorerService,
  TableExplorationResult,
  SchemaInfo,
  TableInfo,
  InsertRecord,
  ExcelValidationResult,
  BulkProcessResult,
  BulkProcessOptions,
  BulkProcessWithMappingResult,
  ColumnMapping,
  FileProcessingResult,
  SheetProcessingResult,
  DataFileInfo,
} from "../../domain/services/oracle-explorer.service";
import {
  OracleRepository,
  TableColumn,
} from "../../domain/repositories/oracle.repository";
import { promises as fs } from "fs";
import path from "path";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import inquirer from "inquirer";
import { glob } from "glob";
import { ControllerUtils } from "../../presentation/utils/controller.utils";
import { DebugLogger } from "../../shared/utils/debug-logger";
import { ValueFormatOptions } from "../../domain/services/interactive-mapping.service";

export class OracleExplorerServiceImpl implements OracleExplorerService {
  private static sequenceCounters: { [key: string]: number } = {};

  constructor(
    private readonly oracleRepository: OracleRepository,
    private readonly outputPath: string
  ) {}

  async exploreTableStructure(
    tableName: string
  ): Promise<TableExplorationResult> {
    const upperTableName = tableName.toUpperCase().trim();
    const { schema, table, fullName } = this.parseTableName(upperTableName);

    const exists = await this.tableExistsWithSchema(upperTableName);
    if (!exists) {
      throw new Error(`La tabla '${fullName}' no existe`);
    }

    const columns = await this.getTableStructureWithSchema(upperTableName);
    if (columns.length === 0) {
      throw new Error(`No se pudieron obtener las columnas de '${fullName}'`);
    }

    return {
      tableName: fullName,
      columns,
      sampleData: await this.oracleRepository.getTableSample(upperTableName, 5),
    };
  }

  async listAllTables(): Promise<string[]> {
    return this.oracleRepository.getAllTables();
  }

  async searchTables(pattern: string): Promise<string[]> {
    const allTables = await this.oracleRepository.getAllTables();
    const searchPattern = pattern.toUpperCase().trim();

    return allTables.filter((table) => {
      if (searchPattern.includes("%")) {
        const regex = new RegExp(searchPattern.replace(/%/g, ".*"), "i");
        return regex.test(table);
      } else {
        return table.includes(searchPattern);
      }
    });
  }

  async listAvailableSchemas(): Promise<SchemaInfo[]> {
    const query = `
      SELECT DISTINCT OWNER as SCHEMA_NAME, COUNT(*) as TABLE_COUNT
      FROM ALL_TABLES 
      WHERE OWNER NOT IN ('SYS', 'SYSTEM', 'CTXSYS', 'MDSYS', 'OLAPSYS', 'ORDSYS', 'OUTLN', 'WMSYS', 'XDB', 'APEX_030200', 'FLOWS_FILES')
      GROUP BY OWNER
      ORDER BY OWNER
    `;

    const result = await this.oracleRepository.executeReadOnlyQuery(query);

    return (
      result.rows?.map((row) => ({
        schemaName: row.SCHEMA_NAME || row[0],
        tableCount: row.TABLE_COUNT || row[1] || 0,
      })) || []
    );
  }

  async searchTablesBySchema(
    schemaName: string,
    pattern?: string
  ): Promise<TableInfo[]> {
    let query = `
      SELECT TABLE_NAME, NUM_ROWS, TABLESPACE_NAME
      FROM ALL_TABLES 
      WHERE OWNER = :1
    `;

    const params = [schemaName.toUpperCase()];

    if (pattern && pattern.trim()) {
      query += ` AND TABLE_NAME LIKE :2`;
      params.push(pattern.toUpperCase().replace("*", "%"));
    }

    query += ` ORDER BY TABLE_NAME`;

    const result = await this.oracleRepository.executeReadOnlyQuery(
      query,
      params
    );

    return (
      result.rows?.map((row) => ({
        tableName: row.TABLE_NAME || row[0] || "",
        numRows: row.NUM_ROWS || row[1],
        tablespace: row.TABLESPACE_NAME || row[2],
      })) || []
    );
  }
  async generateInsertFile(
    tableName: string,
    records: InsertRecord[]
  ): Promise<string> {
    const timestamp = ControllerUtils.generateFileTimestamp();
    const fileName = `insert_${tableName.replace(".", "_")}_${timestamp}.sql`;
    const tableOutputPath = path.join(this.outputPath, tableName);
    const filePath = path.join(tableOutputPath, fileName);

    await fs.mkdir(tableOutputPath, { recursive: true });
    let content = `-- Archivo de INSERTs generado automáticamente\n`;
    content += `-- Tabla: ${tableName}\n`;
    content += `-- Fecha: ${ControllerUtils.generateReadableDateTime()}\n`;
    content += `-- Registros: ${records.length}\n\n`;

    for (const record of records) {
      content += (await this.generateSingleInsert(tableName, record)) + "\n";
    }

    content += `\n-- Fin del archivo\n`;
    content += `-- COMMIT;\n`;

    await fs.writeFile(filePath, content, "utf8");
    return filePath;
  }

  async generateSampleInsert(tableName: string): Promise<string> {
    // Implementation here - get first record from table and generate INSERT
    const sampleData = await this.oracleRepository.getTableSample(tableName, 1);
    if (sampleData.length === 0) {
      throw new Error(`La tabla '${tableName}' está vacía`);
    }
    const timestamp = ControllerUtils.generateFileTimestamp();
    const fileName = `insert_${tableName.replace(
      ".",
      "_"
    )}_sample_${timestamp}.sql`;
    const tableOutputPath = path.join(this.outputPath, tableName);
    const filePath = path.join(tableOutputPath, fileName);
    await fs.mkdir(tableOutputPath, { recursive: true });

    const insertStatement = await this.generateSingleInsert(
      tableName,
      sampleData[0]
    );
    let content = `-- INSERT de ejemplo generado automáticamente\n`;
    content += `-- Tabla: ${tableName}\n`;
    content += `-- Fecha: ${ControllerUtils.generateReadableDateTime()}\n`;
    content += `-- Basado en el primer registro existente en la tabla\n\n`;
    content += insertStatement + "\n";
    content += `\n-- COMMIT;\n`;

    await fs.writeFile(filePath, content, "utf8");
    return filePath;
  }
  async generateCtlFile(tableName: string): Promise<string> {
    const columns = await this.oracleRepository.getTableColumns(tableName);
    const timestamp = ControllerUtils.generateFileTimestamp();
    const fileName = `load_${tableName.replace(".", "_")}_${timestamp}.ctl`;
    const tableOutputPath = path.join(this.outputPath, tableName, "ctl");
    const filePath = path.join(tableOutputPath, fileName);

    await fs.mkdir(tableOutputPath, { recursive: true });

    let content = `-- SQL*Loader Control File\n`;
    content += `-- Tabla: ${tableName}\n`;
    content += `-- Fecha: ${ControllerUtils.generateReadableDateTime()}\n\n`;
    content += `LOAD DATA\n`;
    content += `INFILE '${tableName.toLowerCase()}.csv'\n`;
    content += `INTO TABLE ${tableName}\n`;
    content += `FIELDS TERMINATED BY ','\n`;
    content += `OPTIONALLY ENCLOSED BY '"'\n`;
    content += `TRAILING NULLCOLS\n`;
    content += `(\n`;

    const columnDefinitions = columns.map((col, index) => {
      let definition = `  ${col.columnName}`;

      if (col.dataType.includes("DATE")) {
        definition += ` DATE "DD/MM/YYYY"`;
      } else if (col.dataType.includes("TIMESTAMP")) {
        definition += ` TIMESTAMP "DD/MM/YYYY HH24:MI:SS"`;
      }

      return definition + (index < columns.length - 1 ? "," : "");
    });

    content += columnDefinitions.join("\n") + "\n";
    content += `)\n`;

    await fs.writeFile(filePath, content, "utf8");
    return filePath;
  }
  async generateExcelTemplate(tableName: string): Promise<string> {
    const columns = await this.oracleRepository.getTableColumns(tableName);
    const timestamp = ControllerUtils.generateFileTimestamp();
    const fileName = `template_${tableName.replace(
      ".",
      "_"
    )}_${timestamp}.xlsx`;
    const tableOutputPath = path.join(this.outputPath, tableName);
    const filePath = path.join(tableOutputPath, fileName);

    await fs.mkdir(tableOutputPath, { recursive: true });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create headers
    const headers = columns.map((col) => col.columnName);
    const wsData = [headers];

    // Add sample row with data types as comments
    const sampleRow = columns.map((col) => {
      switch (col.dataType) {
        case "VARCHAR2":
        case "CHAR":
          return `${col.dataType}(${col.dataLength || "N/A"})`;
        case "NUMBER":
          return col.dataPrecision
            ? `NUMBER(${col.dataPrecision},${col.dataScale || 0})`
            : "NUMBER";
        case "DATE":
          return "DD/MM/YYYY";
        case "TIMESTAMP":
          return "DD/MM/YYYY HH:MM:SS";
        default:
          return col.dataType;
      }
    });
    wsData.push(sampleRow);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    XLSX.writeFile(wb, filePath);
    return filePath;
  }

  async validateExcelFile(
    filePath: string,
    tableName: string
  ): Promise<ExcelValidationResult> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      throw new Error("El archivo Excel está vacío");
    }

    const headers = data[0] as string[];
    const dataRows = data.slice(1);
    const columns = await this.oracleRepository.getTableColumns(tableName);

    const errors: any[] = [];
    const warnings: any[] = [];
    let validRows = 0; // Validate each row
    dataRows.forEach((row: unknown, rowIndex) => {
      const rowArray = row as unknown[];
      let rowHasErrors = false;

      headers.forEach((header, colIndex) => {
        const value = rowArray[colIndex];
        const column = columns.find(
          (col) => col.columnName.toUpperCase() === header.toUpperCase()
        );

        if (!column) {
          errors.push({
            row: rowIndex + 2,
            column: header,
            value,
            error: `Columna '${header}' no existe en la tabla`,
            severity: "error",
          });
          rowHasErrors = true;
          return;
        }

        // Validate null values
        if (
          (value === null || value === undefined || value === "") &&
          column.nullable === "N"
        ) {
          errors.push({
            row: rowIndex + 2,
            column: header,
            value,
            error: `La columna '${header}' no puede ser nula`,
            severity: "error",
          });
          rowHasErrors = true;
        } // Validate data types and lengths
        if (value !== null && value !== undefined && value !== "") {
          if (column.dataType === "VARCHAR2" || column.dataType === "CHAR") {
            const strValue = String(value);
            if (column.dataLength && strValue.length > column.dataLength) {
              errors.push({
                row: rowIndex + 2,
                column: header,
                value,
                error: `Valor demasiado largo. Máximo: ${column.dataLength} caracteres`,
                severity: "error",
              });
              rowHasErrors = true;
            }
          }
        }
      });

      if (!rowHasErrors) {
        validRows++;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRows: dataRows.length,
        validRows,
        errorRows: dataRows.length - validRows,
        warningRows: warnings.length,
      },
    };
  }
  async bulkProcessExcelFiles(
    filePatterns: string[]
  ): Promise<BulkProcessResult> {
    console.log(`\n🚀 Procesamiento masivo simplificado (modo compatibilidad)`);
    console.log(`📁 Procesando ${filePatterns.length} patrones de archivos`);

    let totalFiles = 0;
    let processedFiles = 0;
    let failedFiles = 0;
    let totalRows = 0;
    let validRows = 0;
    let errorRows = 0;
    const outputFiles: string[] = [];

    for (const pattern of filePatterns) {
      try {
        // Buscar archivos que coincidan con el patrón
        const matchedFiles = await glob(pattern);

        if (matchedFiles.length === 0) {
          console.warn(
            `⚠️ No se encontraron archivos para el patrón: ${pattern}`
          );
          continue;
        }

        for (const filePath of matchedFiles) {
          totalFiles++;

          try {
            // Determinar el tipo de archivo
            const fileType = this.getFileType(path.basename(filePath));

            if (fileType === "xlsx") {
              // Procesar archivo Excel
              const result = await this.processExcelFileSimple(filePath);

              totalRows += result.totalRows;
              validRows += result.validRows;
              errorRows += result.errorRows;

              if (result.success) {
                outputFiles.push(...result.outputFiles);
                processedFiles++;
              } else {
                failedFiles++;
              }
            } else {
              console.warn(
                `⚠️ Tipo de archivo no soportado en modo simple: ${fileType}`
              );
              failedFiles++;
            }
          } catch (error) {
            console.error(`❌ Error procesando archivo ${filePath}:`, error);
            failedFiles++;
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando patrón ${pattern}:`, error);
        failedFiles++;
      }
    }

    return {
      totalFiles,
      processedFiles,
      failedFiles,
      totalRows,
      validRows,
      errorRows,
      outputFiles,
      summary: `Procesados: ${processedFiles}/${totalFiles} archivos. Filas válidas: ${validRows}/${totalRows}`,
    };
  }

  private async processExcelFileSimple(filePath: string): Promise<{
    success: boolean;
    totalRows: number;
    validRows: number;
    errorRows: number;
    outputFiles: string[];
  }> {
    // Extraer nombre de tabla del nombre del archivo
    const tableName = path
      .basename(filePath, path.extname(filePath))
      .toUpperCase();

    console.log(
      `📄 Procesando ${path.basename(filePath)} → Tabla: ${tableName}`
    );

    try {
      // Verificar que la tabla existe
      const tableExists = await this.tableExistsWithSchema(tableName);
      if (!tableExists) {
        console.warn(`⚠️ Tabla ${tableName} no existe. Saltando archivo.`);
        return {
          success: false,
          totalRows: 0,
          validRows: 0,
          errorRows: 0,
          outputFiles: [],
        };
      }

      // Leer archivo Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName]
      ) as InsertRecord[];

      if (data.length === 0) {
        console.warn(`⚠️ Archivo ${path.basename(filePath)} está vacío`);
        return {
          success: false,
          totalRows: 0,
          validRows: 0,
          errorRows: 0,
          outputFiles: [],
        };
      }

      // Generar archivo INSERT
      const insertFilePath = await this.generateInsertFile(tableName, data);

      console.log(
        `✅ Generado: ${path.basename(insertFilePath)} (${
          data.length
        } registros)`
      );

      return {
        success: true,
        totalRows: data.length,
        validRows: data.length,
        errorRows: 0,
        outputFiles: [insertFilePath],
      };
    } catch (error) {
      console.error(`❌ Error procesando ${path.basename(filePath)}:`, error);
      return {
        success: false,
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        outputFiles: [],
      };
    }
  }
  async bulkProcessFilesWithMapping(
    options: BulkProcessOptions
  ): Promise<BulkProcessWithMappingResult> {
    // Inicializar debug logger
    const debugLogger = DebugLogger.getInstance();
    await debugLogger.logSection("INICIO DEL PROCESAMIENTO MASIVO CON MAPEO");
    await debugLogger.log(`Tabla destino: ${options.tableName}`);
    await debugLogger.log(
      `Archivos a procesar: ${options.filePatterns.length}`
    );

    console.log(`\n🚀 Iniciando procesamiento masivo con mapeo interactivo`);
    console.log(`📋 Tabla destino: ${options.tableName}`);
    console.log(`📁 Archivos a procesar: ${options.filePatterns.length}`);
    console.log(`\n� ========================================`);
    console.log(`�📁 DEBUG DETALLADO GUARDÁNDOSE EN:`);
    console.log(`📁 ${debugLogger.getLogFilePath()}`);
    console.log(`📋 ========================================\n`);

    await debugLogger.log(
      `📁 Archivo de debug iniciado en: ${debugLogger.getLogFilePath()}`
    );

    // 1. Obtener estructura de la tabla Oracle
    const tableStructure = await this.getTableStructureWithSchema(
      options.tableName
    );
    if (tableStructure.length === 0) {
      throw new Error(
        `No se pudo obtener la estructura de la tabla '${options.tableName}'`
      );
    }

    console.log(`\n📊 Estructura de tabla '${options.tableName}':`);
    tableStructure.forEach((col, index) => {
      console.log(
        `  ${index + 1}. ${col.columnName} (${col.dataType}${
          col.dataLength ? `(${col.dataLength})` : ""
        }${col.nullable === "N" ? " NOT NULL" : ""})`
      );
    });

    // 2. Encontrar archivos que coincidan con los patrones
    const dataFiles = await this.findDataFiles(
      options.filePatterns,
      options.fileTypes
    );
    console.log(`\n📂 Archivos encontrados: ${dataFiles.length}`);

    if (dataFiles.length === 0) {
      throw new Error(
        "No se encontraron archivos que coincidan con los patrones especificados"
      );
    } // 3. Los headers ya fueron analizados por InteractiveMappingService
    // No necesitamos analizarlos nuevamente aquí// 4. Usar mapeo predefinido (OBLIGATORIO - debe venir desde InteractiveMappingService)
    if (!options.predefinedMapping) {
      throw new Error(
        "Este método requiere un mapeo predefinido. Use InteractiveMappingService primero para crear el mapeo."
      );
    }

    const globalColumnMapping = options.predefinedMapping;

    console.log("\n🎯 Usando mapeo predefinido del mapeo inteligente");
    console.log("\n" + "=".repeat(80));
    console.log("🔍 DEBUG: MAPEO RECIBIDO DESDE INTERACTIVE MAPPING SERVICE");
    console.log("=".repeat(80));
    console.log(
      `📊 Total de entradas en mapping: ${
        Object.keys(globalColumnMapping).length
      }`
    );

    // Debug detallado del mapping
    Object.entries(globalColumnMapping).forEach(([key, value]) => {
      if (key.startsWith("__SPECIAL_")) {
        console.log(`  🔧 ESPECIAL: ${key} → ${value}`);
      } else if (key.includes("__MULTIPLE_")) {
        console.log(`  🔄 MÚLTIPLE: ${key} → ${value}`);
      } else if (value) {
        console.log(`  📋 NORMAL: ${key} → ${value}`);
      } else {
        console.log(`  ⚪ SIN USAR: ${key} → ${value}`);
      }
    });
    console.log("=".repeat(80));

    console.log(`\n📋 Mapeo de columnas configurado (vista simplificada):`);
    Object.entries(globalColumnMapping).forEach(([header, column]) => {
      if (column && !header.startsWith("__SPECIAL_")) {
        console.log(`  ${header} → ${column}`);
      }
    });
    console.log("=".repeat(80));

    // 5. Procesar archivos con el mapeo definido
    const result: BulkProcessWithMappingResult = {
      tableName: options.tableName,
      tableStructure,
      totalFiles: dataFiles.length,
      processedFiles: 0,
      failedFiles: 0,
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      outputFiles: [],
      fileResults: [],
      globalColumnMapping,
      summary: "",
    };

    for (const fileInfo of dataFiles) {
      console.log(`\n📄 Procesando: ${fileInfo.fileName}`);

      try {
        const fileResult = await this.processDataFileWithMapping(
          fileInfo,
          options,
          globalColumnMapping,
          tableStructure
        );

        result.fileResults.push(fileResult);
        if (fileResult.success) {
          result.processedFiles++;
          result.totalRows += fileResult.sheets.reduce(
            (sum, sheet) => sum + sheet.totalRows,
            0
          );
          result.validRows += fileResult.sheets.reduce(
            (sum, sheet) => sum + sheet.processedRows,
            0
          );

          // NO generar archivo SQL individual para cada archivo
          // Solo acumular datos para el archivo consolidado
        } else {
          result.failedFiles++;
          result.errorRows += fileResult.sheets.reduce(
            (sum, sheet) => sum + sheet.totalRows,
            0
          );
        }
      } catch (error) {
        console.error(`❌ Error procesando ${fileInfo.fileName}:`, error);
        result.failedFiles++;
        result.fileResults.push({
          fileName: fileInfo.fileName,
          filePath: fileInfo.filePath,
          fileType: fileInfo.fileType,
          sheets: [],
          success: false,
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    } // 6. Generar ÚNICAMENTE archivo SQL consolidado
    const successfulFiles = result.fileResults.filter((f) => f.success);
    if (successfulFiles.length > 0) {
      const consolidatedSQLFile = await this.generateConsolidatedSQLFile(
        successfulFiles,
        options.tableName,
        globalColumnMapping
      );
      result.outputFiles.push(consolidatedSQLFile);

      console.log(
        `\n📄 Archivo SQL consolidado generado: ${path.basename(
          consolidatedSQLFile
        )}`
      );
    }
    result.summary = this.generateProcessingSummary(result);

    // Finalizar debug logging
    await debugLogger.logSection("PROCESAMIENTO MASIVO COMPLETADO");
    await debugLogger.log("✅ Todos los archivos han sido procesados");
    await debugLogger.log(`📊 Resumen: ${result.summary}`);

    console.log(`\n🎉 Procesamiento completado!`);
    console.log(result.summary);
    console.log(`\n📋 ========================================`);
    console.log(`📁 DEBUG COMPLETO GUARDADO EN:`);
    console.log(`📁 ${debugLogger.getLogFilePath()}`);
    console.log(`📋 ========================================\n`);

    return result;
  }
  // Private helper methods
  private parseTableName(tableName: string): {
    schema: string;
    table: string;
    fullName: string;
  } {
    const parts = tableName.split(".");
    if (parts.length === 2) {
      return {
        schema: parts[0],
        table: parts[1],
        fullName: tableName,
      };
    } else {
      // Si no hay esquema, usar el esquema actual
      return {
        schema: "USER", // Placeholder - should get current schema
        table: tableName,
        fullName: tableName,
      };
    }
  }

  private async tableExistsWithSchema(tableName: string): Promise<boolean> {
    return this.oracleRepository.tableExists(tableName);
  }

  private async getTableStructureWithSchema(tableName: string) {
    return this.oracleRepository.getTableColumns(tableName);
  }
  private async generateSingleInsert(
    tableName: string,
    record: Record<string, any>
  ): Promise<string> {
    // Obtener el orden correcto de TODAS las columnas de Oracle
    const tableColumns = await this.oracleRepository.getTableColumns(tableName);
    const allOracleColumns = tableColumns.map((col) => col.columnName);

    // ✅ CORRECCIÓN CRÍTICA: Usar TODAS las columnas Oracle en el orden correcto
    // No filtrar por las disponibles en record, sino completar con NULL las faltantes
    const values = allOracleColumns.map((col) => {
      const value = record[col];
      return this.formatValueForSQL(value);
    });

    return `INSERT INTO ${tableName} (${allOracleColumns.join(
      ", "
    )}) VALUES (${values.join(", ")});`;
  }

  // Nuevos métodos auxiliares para la funcionalidad mejorada
  private async findDataFiles(
    filePatterns: string[],
    fileTypes: ("xlsx" | "csv" | "txt")[]
  ): Promise<DataFileInfo[]> {
    const dataFiles: DataFileInfo[] = [];

    for (const pattern of filePatterns) {
      try {
        let files: string[] = [];

        // Si el patrón es un directorio, buscar archivos
        if (await this.isDirectory(pattern)) {
          const extensions = fileTypes.map((type) =>
            type === "xlsx" ? "**/*.{xlsx,xls,xlsm}" : `**/*.${type}`
          );

          for (const ext of extensions) {
            const globPattern = path.join(pattern, ext);
            const matchedFiles = await glob(globPattern);
            files.push(...matchedFiles);
          }
        } else {
          // Tratar como patrón de archivo directo
          const matchedFiles = await glob(pattern);
          files.push(...matchedFiles);
        }

        for (const filePath of files) {
          const fileName = path.basename(filePath);
          const fileType = this.getFileType(fileName);

          if (fileTypes.includes(fileType)) {
            const fileInfo: DataFileInfo = {
              filePath,
              fileName,
              fileType,
            };

            // Para Excel, obtener hojas disponibles
            if (fileType === "xlsx") {
              try {
                const workbook = XLSX.readFile(filePath);
                fileInfo.sheets = workbook.SheetNames;
              } catch (error) {
                console.warn(`⚠️ No se pudieron leer las hojas de ${fileName}`);
                fileInfo.sheets = [];
              }
            }

            dataFiles.push(fileInfo);
          }
        }
      } catch (error) {
        console.error(
          `❌ Error buscando archivos con patrón "${pattern}":`,
          error
        );
      }
    }

    return dataFiles;
  }

  private async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
  private getFileType(fileName: string): "xlsx" | "csv" | "txt" {
    const detectedType = ControllerUtils.detectFileType(fileName);

    // Map ControllerUtils types to expected types
    switch (detectedType) {
      case "excel":
        return "xlsx";
      case "csv":
        return "csv";
      case "txt":
      case "unknown":
      default:
        return "txt";
    }
  }
  private async processDataFileWithMapping(
    fileInfo: DataFileInfo,
    options: BulkProcessOptions,
    columnMapping: ColumnMapping,
    tableStructure: TableColumn[]
  ): Promise<FileProcessingResult> {
    const result: FileProcessingResult = {
      fileName: fileInfo.fileName,
      filePath: fileInfo.filePath,
      fileType: fileInfo.fileType,
      sheets: [],
      success: true,
      error: undefined,
    };

    try {
      switch (fileInfo.fileType) {
        case "xlsx":
          await this.processExcelFile(
            fileInfo,
            options,
            columnMapping,
            tableStructure,
            result
          );
          break;
        case "csv":
          await this.processCsvFile(
            fileInfo,
            columnMapping,
            tableStructure,
            result
          );
          break;
        case "txt":
          await this.processTxtFile(
            fileInfo,
            columnMapping,
            tableStructure,
            result
          );
          break;
      }
    } catch (error) {
      result.success = false;
      result.error =
        error instanceof Error ? error.message : "Error desconocido";
    }

    return result;
  }

  private async processExcelFile(
    fileInfo: DataFileInfo,
    options: BulkProcessOptions,
    columnMapping: ColumnMapping,
    tableStructure: TableColumn[],
    result: FileProcessingResult
  ): Promise<void> {
    const workbook = XLSX.readFile(fileInfo.filePath);
    const sheetsToProcess =
      options.sheetMode === "all-sheets"
        ? workbook.SheetNames
        : options.selectedSheets || [workbook.SheetNames[0]];

    for (const sheetName of sheetsToProcess) {
      if (!workbook.SheetNames.includes(sheetName)) {
        console.warn(
          `⚠️ Hoja "${sheetName}" no encontrada en ${fileInfo.fileName}`
        );
        continue;
      }
      const sheetResult = await this.processExcelSheet(
        workbook,
        sheetName,
        columnMapping,
        tableStructure,
        options.valueFormatOptions
      );
      result.sheets.push(sheetResult);
    }
  }
  private async processExcelSheet(
    workbook: XLSX.WorkBook,
    sheetName: string,
    columnMapping: ColumnMapping,
    tableStructure: TableColumn[],
    valueFormatOptions?: ValueFormatOptions
  ): Promise<SheetProcessingResult> {
    const worksheet = workbook.Sheets[sheetName];
    // ✅ MEJORAR LECTURA DE EXCEL: mejor manejo de celdas vacías
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "", // Valor por defecto para celdas vacías
      raw: false, // Convertir todo a string para consistencia
      blankrows: false, // Omitir filas completamente vacías
    });

    if (data.length === 0) {
      return {
        sheetName,
        headers: [],
        totalRows: 0,
        processedRows: 0,
        insertStatements: 0,
        errors: ["Hoja vacía"],
        warnings: [],
        columnMapping,
        processedData: [],
      };
    }

    const headers = (data[0] as string[]).map((h) =>
      h ? h.toString().trim() : ""
    );
    const dataRows = data.slice(1).filter((row) => {
      // ✅ FILTRAR FILAS VACÍAS: solo procesar filas con al menos un valor
      const rowArray = row as any[];
      return rowArray.some(
        (cell) => cell !== null && cell !== undefined && cell !== ""
      );
    });

    const errors: string[] = [];
    const warnings: string[] = [];
    const processedData: InsertRecord[] = [];
    let processedRows = 0;
    let insertStatements = 0;

    console.log(
      `📊 Procesando hoja "${sheetName}": ${dataRows.length} filas con datos`
    );

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[];

      // ✅ VALIDACIÓN ADICIONAL: normalizar celdas vacías
      const normalizedRow = row.map((cell) => {
        if (cell === null || cell === undefined || cell === "") {
          return "";
        }
        return cell.toString().trim();
      });

      try {
        const mappedRecord = await this.mapRowToRecordWithDebug(
          normalizedRow,
          headers,
          columnMapping,
          tableStructure,
          valueFormatOptions
        );
        if (mappedRecord && Object.keys(mappedRecord).length > 0) {
          processedData.push(mappedRecord);
          insertStatements++;
          processedRows++;
        } else {
          warnings.push(`Fila ${i + 2}: Omitida por datos insuficientes`);
        }
      } catch (error) {
        errors.push(
          `Fila ${i + 2}: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`
        );
      }
    }

    console.log(
      `✅ Hoja "${sheetName}": ${insertStatements} INSERTs válidos generados`
    );

    return {
      sheetName,
      headers,
      totalRows: dataRows.length,
      processedRows,
      insertStatements,
      errors,
      warnings,
      columnMapping,
      processedData,
    };
  }
  private async processCsvFile(
    fileInfo: DataFileInfo,
    columnMapping: ColumnMapping,
    tableStructure: TableColumn[],
    result: FileProcessingResult
  ): Promise<void> {
    const content = await fs.readFile(fileInfo.filePath, "utf8");
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0); // ✅ Filtrar líneas vacías

    if (lines.length === 0) {
      result.sheets.push({
        sheetName: "CSV",
        headers: [],
        totalRows: 0,
        processedRows: 0,
        insertStatements: 0,
        errors: ["Archivo vacío"],
        warnings: [],
        columnMapping,
        processedData: [],
      });
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const dataRows = lines.slice(1).filter((line) => {
      // ✅ FILTRAR FILAS VACÍAS: solo procesar líneas con datos reales
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      return values.some((value) => value !== "");
    });

    const errors: string[] = [];
    const warnings: string[] = [];
    const processedData: InsertRecord[] = [];
    let processedRows = 0;
    let insertStatements = 0;

    console.log(
      `📊 Procesando archivo CSV: ${dataRows.length} filas con datos`
    );

    for (let i = 0; i < dataRows.length; i++) {
      const values = dataRows[i]
        .split(",")
        .map((v) => v.trim().replace(/"/g, ""));

      try {
        const mappedRecord = this.mapRowToRecord(
          values,
          headers,
          columnMapping,
          tableStructure
        );
        if (mappedRecord && Object.keys(mappedRecord).length > 0) {
          processedData.push(mappedRecord);
          insertStatements++;
          processedRows++;
        } else {
          warnings.push(`Fila ${i + 2}: Omitida por datos insuficientes`);
        }
      } catch (error) {
        errors.push(
          `Fila ${i + 2}: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`
        );
      }
    }

    console.log(
      `✅ Archivo CSV: ${insertStatements} INSERTs válidos generados`
    );

    result.sheets.push({
      sheetName: "CSV",
      headers,
      totalRows: dataRows.length,
      processedRows,
      insertStatements,
      errors,
      warnings,
      columnMapping,
      processedData,
    });
  }
  private async processTxtFile(
    fileInfo: DataFileInfo,
    columnMapping: ColumnMapping,
    tableStructure: TableColumn[],
    result: FileProcessingResult
  ): Promise<void> {
    const content = await fs.readFile(fileInfo.filePath, "utf8");
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0); // ✅ Filtrar líneas vacías

    if (lines.length === 0) {
      result.sheets.push({
        sheetName: "TXT",
        headers: [],
        totalRows: 0,
        processedRows: 0,
        insertStatements: 0,
        errors: ["Archivo vacío"],
        warnings: [],
        columnMapping,
        processedData: [],
      });
      return;
    }

    const headers = lines[0].split("\t").map((h) => h.trim());
    const dataRows = lines.slice(1).filter((line) => {
      // ✅ FILTRAR FILAS VACÍAS: solo procesar líneas con datos reales
      const values = line.split("\t").map((v) => v.trim());
      return values.some((value) => value !== "");
    });

    const errors: string[] = [];
    const warnings: string[] = [];
    const processedData: InsertRecord[] = [];
    let processedRows = 0;
    let insertStatements = 0;

    console.log(
      `📊 Procesando archivo TXT: ${dataRows.length} filas con datos`
    );

    for (let i = 0; i < dataRows.length; i++) {
      const values = dataRows[i].split("\t").map((v) => v.trim());

      try {
        const mappedRecord = this.mapRowToRecord(
          values,
          headers,
          columnMapping,
          tableStructure
        );
        if (mappedRecord && Object.keys(mappedRecord).length > 0) {
          processedData.push(mappedRecord);
          insertStatements++;
          processedRows++;
        } else {
          warnings.push(`Fila ${i + 2}: Omitida por datos insuficientes`);
        }
      } catch (error) {
        errors.push(
          `Fila ${i + 2}: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`
        );
      }
    }

    console.log(
      `✅ Archivo TXT: ${insertStatements} INSERTs válidos generados`
    );

    result.sheets.push({
      sheetName: "TXT",
      headers,
      totalRows: dataRows.length,
      processedRows,
      insertStatements,
      errors,
      warnings,
      columnMapping,
      processedData,
    });
  }
  private mapRowToRecord(
    row: any[],
    headers: string[],
    columnMapping: ColumnMapping,
    tableStructure: TableColumn[]
  ): Record<string, any> | null {
    const record: Record<string, any> = {};
    let hasValidData = false; // ✅ FLUJO ÚNICO: Extraer reverseMapping
    let reverseMapping: { [oracleColumn: string]: string } = {};

    if (columnMapping["__REVERSE_MAPPING__"]) {
      try {
        reverseMapping = JSON.parse(
          columnMapping["__REVERSE_MAPPING__"] as string
        );
        console.log("🔍 DEBUG: ReverseMapping extraído:", reverseMapping);
      } catch (error) {
        console.error("❌ Error parseando reverseMapping");
        return null;
      }
    } else {
      console.error("❌ No se encontró reverseMapping");
      return null;
    }

    console.log(
      `🔍 DEBUG: Procesando fila con headers: [${headers.join(", ")}]`
    );
    console.log(`🔍 DEBUG: Datos de la fila: [${row.join(", ")}]`);

    // Mapear usando reverseMapping (Oracle Column ← Source)
    Object.keys(reverseMapping).forEach((oracleColumn) => {
      const source = reverseMapping[oracleColumn];
      console.log(`🔗 Procesando ${oracleColumn} ← ${source}`);

      if (source === "NULL") {
        record[oracleColumn] = null;
        console.log(`   ✅ ${oracleColumn} = NULL`);
      } else if (source === "SYSDATE") {
        record[oracleColumn] = "SYSDATE";
        hasValidData = true;
        console.log(`   ✅ ${oracleColumn} = SYSDATE`);
      } else if (source.startsWith("CUSTOM:")) {
        const customValue = source.replace("CUSTOM:", "");
        record[oracleColumn] = customValue;
        if (customValue.trim() !== "") hasValidData = true;
        console.log(`   ✅ ${oracleColumn} = CUSTOM:${customValue}`);
      } else if (source.startsWith("SEQUENCE:")) {
        const processedValue = this.processSpecialValue(source);
        record[oracleColumn] = processedValue;
        hasValidData = true;
        console.log(`   ✅ ${oracleColumn} = SEQUENCE:${processedValue}`);
      } else {
        // Es un header del archivo
        const headerIndex = headers.findIndex((h) => h === source);
        console.log(
          `   🔍 Buscando header "${source}" en posición ${headerIndex}`
        );

        if (headerIndex >= 0 && headerIndex < row.length) {
          const value = row[headerIndex];
          console.log(
            `   📋 Valor encontrado en posición [${headerIndex}]: "${value}"`
          );
          const column = tableStructure.find(
            (col) => col.columnName === oracleColumn
          );

          if (column) {
            console.log(`   📊 Información de columna ${oracleColumn}:`);
            console.log(`      Tipo: ${column.dataType}`);
            console.log(`      Longitud: ${column.dataLength || "N/A"}`);
            console.log(`      Nullable: ${column.nullable}`);
            console.log(
              `      Valor a procesar: "${value}" (tipo: ${typeof value})`
            );

            const processedValue = this.processValueForColumn(value, column);
            record[oracleColumn] = processedValue;

            console.log(
              `      Valor procesado: "${processedValue}" (tipo: ${typeof processedValue})`
            );

            if (
              processedValue !== null &&
              processedValue !== undefined &&
              processedValue !== ""
            ) {
              hasValidData = true;
            }
            console.log(
              `   ✅ ${oracleColumn} = "${processedValue}" (desde header "${source}")`
            );
          } else {
            console.log(
              `   ❌ No se encontró columna ${oracleColumn} en tableStructure`
            );
          }
        } else {
          console.log(
            `   ❌ Header "${source}" no encontrado o fuera de rango`
          );
          record[oracleColumn] = null;
        }
      }
    });

    // Completar con NULL las columnas no mapeadas
    tableStructure.forEach((column) => {
      if (!(column.columnName in record)) {
        record[column.columnName] = null;
      }
    }); // Validación final
    if (!hasValidData) {
      console.log(`⚠️ Fila omitida: sin datos válidos`);
      return null;
    }

    const allValuesNull = Object.values(record).every(
      (value) => value === null || value === undefined || value === ""
    );

    if (allValuesNull) {
      console.log(`⚠️ Fila omitida: todos los valores NULL`);
      return null;
    }

    console.log(`\n✅ REGISTRO FINAL GENERADO:`);
    Object.entries(record).forEach(([col, val]) => {
      console.log(`   ${col}: ${val}`);
    });
    console.log(`─`.repeat(60));

    return record;
  }
  private processSpecialValue(specialValue: string): any {
    if (specialValue === "NULL") {
      return null;
    }

    if (specialValue === "SYSDATE") {
      return "SYSDATE"; // Se mantendrá como función en el formatValueForSQL
    }

    if (specialValue.startsWith("CUSTOM:")) {
      const customValue = specialValue.replace("CUSTOM:", "");
      return customValue;
    }

    if (specialValue.startsWith("SEQUENCE:")) {
      const startValue = parseInt(specialValue.replace("SEQUENCE:", ""));
      const key = specialValue; // Usar la configuración completa como clave

      // Inicializar el contador si no existe
      if (!(key in OracleExplorerServiceImpl.sequenceCounters)) {
        OracleExplorerServiceImpl.sequenceCounters[key] = startValue;
      }

      // Obtener el valor actual y incrementar para la siguiente vez
      const currentValue = OracleExplorerServiceImpl.sequenceCounters[key];
      OracleExplorerServiceImpl.sequenceCounters[key]++;

      return currentValue;
    }

    return specialValue;
  }
  private async processValueForColumnWithDebug(
    value: any,
    column: TableColumn,
    debugLogger: DebugLogger,
    formatOptions?: { format: "string" | "number" | "auto" }
  ): Promise<any> {
    await debugLogger.log(
      `🔧 processValueForColumn: entrada="${value}", tipo="${typeof value}", columna="${
        column.columnName
      }", dataType="${column.dataType}"`
    );

    if (formatOptions) {
      await debugLogger.log(`🎯 Formato especificado: ${formatOptions.format}`);
    }

    if (value === null || value === undefined || value === "") {
      await debugLogger.log(`🔧 Valor vacío detectado, retornando null`);
      return null;
    }

    // 🎯 NUEVA LÓGICA: Aplicar formato especificado por el usuario
    if (formatOptions && formatOptions.format !== "auto") {
      if (formatOptions.format === "string") {
        const forcedString = String(value);
        await debugLogger.log(
          `🎯 FORZADO COMO STRING: "${forcedString}" (formato: ${formatOptions.format})`
        );
        return forcedString;
      } else if (formatOptions.format === "number") {
        const numValue = Number(value);
        const forcedNumber = isNaN(numValue) ? null : numValue;
        await debugLogger.log(
          `🎯 FORZADO COMO NUMBER: ${forcedNumber} (formato: ${formatOptions.format}, original: "${value}")`
        );
        return forcedNumber;
      }
    }

    // Procesar según el tipo de columna Oracle (comportamiento automático)
    switch (column.dataType.toUpperCase()) {
      case "VARCHAR2":
      case "CHAR":
      case "CLOB":
        const stringResult = String(value);
        await debugLogger.log(`🔧 Procesado como STRING: "${stringResult}"`);
        return stringResult;

      case "NUMBER":
        const numValue = Number(value);
        const numberResult = isNaN(numValue) ? null : numValue;
        await debugLogger.log(
          `🔧 Procesado como NUMBER: "${numberResult}" (original: "${value}", convertido: ${numValue}, esNaN: ${isNaN(
            numValue
          )})`
        );
        return numberResult;

      case "DATE":
      case "TIMESTAMP":
        try {
          const dateValue = new Date(value);
          const dateResult = isNaN(dateValue.getTime()) ? null : dateValue;
          await debugLogger.log(`🔧 Procesado como DATE: "${dateResult}"`);
          return dateResult;
        } catch (error) {
          await debugLogger.log(`🔧 Error procesando fecha: ${error}`);
          return null;
        }

      default:
        const defaultResult = String(value);
        await debugLogger.log(
          `🔧 Procesado como DEFAULT/STRING: "${defaultResult}"`
        );
        return defaultResult;
    }
  }

  private processValueForColumn(value: any, column: TableColumn): any {
    console.log(
      `      🔧 processValueForColumn: entrada="${value}", tipo="${typeof value}", columna="${
        column.columnName
      }", dataType="${column.dataType}"`
    );

    if (value === null || value === undefined || value === "") {
      console.log(`      🔧 Valor vacío detectado, retornando null`);
      return null;
    }

    switch (column.dataType.toUpperCase()) {
      case "VARCHAR2":
      case "CHAR":
      case "CLOB":
        const stringResult = String(value);
        console.log(`      🔧 Procesado como STRING: "${stringResult}"`);
        return stringResult;

      case "NUMBER":
        const numValue = Number(value);
        const numberResult = isNaN(numValue) ? null : numValue;
        console.log(
          `      🔧 Procesado como NUMBER: "${numberResult}" (original: "${value}", convertido: ${numValue}, esNaN: ${isNaN(
            numValue
          )})`
        );
        return numberResult;

      case "DATE":
      case "TIMESTAMP":
        try {
          const dateValue = new Date(value);
          const dateResult = isNaN(dateValue.getTime()) ? null : dateValue;
          console.log(`      🔧 Procesado como DATE: "${dateResult}"`);
          return dateResult;
        } catch (error) {
          console.log(`      🔧 Error procesando fecha: ${error}`);
          return null;
        }

      default:
        const defaultResult = String(value);
        console.log(
          `      🔧 Procesado como DEFAULT/STRING: "${defaultResult}"`
        );
        return defaultResult;
    }
  }
  private async generateConsolidatedSQLFile(
    successfulFiles: FileProcessingResult[],
    tableName: string,
    columnMapping: ColumnMapping
  ): Promise<string> {
    const timestamp = ControllerUtils.generateFileTimestamp();
    const fileName = `insert_${tableName.replace(
      ".",
      "_"
    )}_CONSOLIDATED_${timestamp}.sql`;
    const tableOutputPath = path.join(
      this.outputPath,
      tableName,
      "bulk_process"
    );
    const filePath = path.join(tableOutputPath, fileName);

    await fs.mkdir(tableOutputPath, { recursive: true });
    let content = `-- Archivo CONSOLIDADO de INSERTs\n`;
    content += `-- Tabla: ${tableName}\n`;
    content += `-- Fecha: ${ControllerUtils.generateReadableDateTime()}\n`;
    content += `-- Archivos procesados: ${successfulFiles.length}\n\n`;

    // Mapeo de columnas usado
    content += `-- MAPEO DE COLUMNAS UTILIZADO:\n`;
    Object.entries(columnMapping).forEach(([header, column]) => {
      content += `-- ${header} → ${column || "NULL"}\n`;
    });
    content += `\n`;

    // Estadísticas consolidadas
    const totalFiles = successfulFiles.length;
    const totalSheets = successfulFiles.reduce(
      (sum, file) => sum + file.sheets.length,
      0
    );
    const totalRows = successfulFiles.reduce(
      (sum, file) =>
        sum +
        file.sheets.reduce((sheetSum, sheet) => sheetSum + sheet.totalRows, 0),
      0
    );
    const totalInserts = successfulFiles.reduce(
      (sum, file) =>
        sum +
        file.sheets.reduce(
          (sheetSum, sheet) => sheetSum + sheet.insertStatements,
          0
        ),
      0
    );

    content += `-- ESTADÍSTICAS CONSOLIDADAS:\n`;
    content += `-- Archivos procesados: ${totalFiles}\n`;
    content += `-- Hojas/secciones procesadas: ${totalSheets}\n`;
    content += `-- Total de filas leídas: ${totalRows}\n`;
    content += `-- Total de INSERTs generados: ${totalInserts}\n\n`;

    content += `-- =============================================\n`;
    content += `-- INICIO DE SENTENCIAS INSERT\n`;
    content += `-- =============================================\n\n`; // Generar todos los INSERTs consolidados
    let insertCount = 0;

    // Obtener el orden correcto de TODAS las columnas de Oracle
    const tableColumns = await this.oracleRepository.getTableColumns(tableName);
    const allOracleColumns = tableColumns.map((col) => col.columnName);

    const insertBase = `INSERT INTO ${tableName} (${allOracleColumns.join(
      ", "
    )}) VALUES `;

    for (const fileResult of successfulFiles) {
      content += `-- ==========================================\n`;
      content += `-- Datos del archivo: ${fileResult.fileName}\n`;
      content += `-- ==========================================\n`;

      for (const sheet of fileResult.sheets) {
        if (sheet.processedData.length > 0) {
          content += `-- Hoja/Sección: ${sheet.sheetName}\n`;

          for (const record of sheet.processedData) {
            // Los registros ya fueron validados en mapRowToRecord
            const completeRecord: Record<string, any> = {};
            allOracleColumns.forEach((col) => {
              completeRecord[col] = record[col] ?? null;
            });

            const values = allOracleColumns.map((col) =>
              this.formatValueForSQL(completeRecord[col])
            );
            content += `${insertBase}(${values.join(", ")});\n`;
            insertCount++;

            // Agregar commit cada 1000 registros para mejorar performance
            if (insertCount % 1000 === 0) {
              content += `COMMIT;\n\n`;
            }
          }
          content += `\n`;
        }
      }
    }

    content += `\n-- =============================================\n`;
    content += `-- FIN DE SENTENCIAS INSERT\n`;
    content += `-- Total de sentencias generadas: ${insertCount}\n`;
    content += `-- =============================================\n\n`;

    content += `COMMIT;\n`;

    await fs.writeFile(filePath, content, "utf8");
    return filePath;
  }

  private generateProcessingSummary(
    result: BulkProcessWithMappingResult
  ): string {
    return `📊 RESUMEN DEL PROCESAMIENTO MASIVO:
📋 Tabla destino: ${result.tableName}
📁 Archivos procesados: ${result.processedFiles}/${result.totalFiles}
❌ Archivos fallidos: ${result.failedFiles}
📊 Filas totales: ${result.totalRows}
✅ Filas válidas: ${result.validRows}
❌ Filas con errores: ${result.errorRows}
📄 Archivos SQL generados: ${result.outputFiles.length}`;
  }
  private formatValueForSQL(value: any): string {
    if (value === null || value === undefined) {
      return "NULL";
    }

    // Manejar valores especiales que deben ir sin comillas
    if (typeof value === "string") {
      if (value === "SYSDATE") {
        return "SYSDATE";
      }

      // Para strings normales, escapar comillas simples y envolver en comillas
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (value instanceof Date) {
      // Formatear fecha para Oracle
      return `TO_DATE('${format(
        value,
        "dd/MM/yyyy HH:mm:ss"
      )}', 'DD/MM/YYYY HH24:MI:SS')`;
    }

    if (typeof value === "boolean") {
      return value ? "1" : "0";
    }

    // Para cualquier otro tipo, convertir a string y escapar
    return `'${String(value).replace(/'/g, "''")}'`;
  }
  private async mapRowToRecordWithDebug(
    row: any[],
    headers: string[],
    columnMapping: ColumnMapping,
    tableStructure: TableColumn[],
    valueFormatOptions?: ValueFormatOptions
  ): Promise<Record<string, any> | null> {
    const debugLogger = DebugLogger.getInstance();
    const record: Record<string, any> = {};
    let hasValidData = false;
    await debugLogger.logSection(`PROCESANDO NUEVA FILA`);

    // 🔍 DEBUG: Mostrar opciones de formato disponibles
    if (valueFormatOptions) {
      await debugLogger.log(`📋 Opciones de formato disponibles:`);
      Object.entries(valueFormatOptions).forEach(async ([column, option]) => {
        await debugLogger.log(
          `   ${column}: source="${option.source}", format="${option.format}"`
        );
      });
    } else {
      await debugLogger.log(`⚠️ No hay opciones de formato disponibles`);
    }

    // ✅ FLUJO ÚNICO: Extraer reverseMapping
    let reverseMapping: { [oracleColumn: string]: string } = {};

    if (columnMapping["__REVERSE_MAPPING__"]) {
      try {
        reverseMapping = JSON.parse(
          columnMapping["__REVERSE_MAPPING__"] as string
        );
        await debugLogger.logObject("ReverseMapping extraído", reverseMapping);
      } catch (error) {
        await debugLogger.log("❌ Error parseando reverseMapping");
        return null;
      }
    } else {
      await debugLogger.log("❌ No se encontró reverseMapping");
      return null;
    }

    await debugLogger.log(`Headers: [${headers.join(", ")}]`);
    await debugLogger.log(`Datos: [${row.join(", ")}]`);

    // Mapear usando reverseMapping (Oracle Column ← Source)
    for (const oracleColumn of Object.keys(reverseMapping)) {
      const source = reverseMapping[oracleColumn];
      await debugLogger.logSubSection(`Procesando ${oracleColumn} ← ${source}`);
      if (source === "NULL") {
        // Obtener opciones de formato para NULL
        const formatOptions = valueFormatOptions?.[oracleColumn];
        const column = tableStructure.find(
          (col) => col.columnName === oracleColumn
        );

        if (column) {
          const processedValue = await this.processValueForColumnWithDebug(
            null,
            column,
            debugLogger,
            formatOptions
          );
          record[oracleColumn] = processedValue;
          await debugLogger.log(
            `✅ ${oracleColumn} = NULL (procesado como: ${processedValue})`
          );
        } else {
          record[oracleColumn] = null;
          await debugLogger.log(`✅ ${oracleColumn} = NULL`);
        }
      } else if (source === "SYSDATE") {
        // SYSDATE no necesita formato especial
        record[oracleColumn] = "SYSDATE";
        hasValidData = true;
        await debugLogger.log(`✅ ${oracleColumn} = SYSDATE`);
      } else if (source.startsWith("CUSTOM:")) {
        const customValue = source.replace("CUSTOM:", "");
        const formatOptions = valueFormatOptions?.[oracleColumn];
        const column = tableStructure.find(
          (col) => col.columnName === oracleColumn
        );

        if (column) {
          const processedValue = await this.processValueForColumnWithDebug(
            customValue,
            column,
            debugLogger,
            formatOptions
          );
          record[oracleColumn] = processedValue;
          if (
            processedValue !== null &&
            processedValue !== undefined &&
            processedValue !== ""
          )
            hasValidData = true;
          await debugLogger.log(
            `✅ ${oracleColumn} = CUSTOM:${processedValue} (formato aplicado)`
          );
        } else {
          record[oracleColumn] = customValue;
          if (customValue.trim() !== "") hasValidData = true;
          await debugLogger.log(`✅ ${oracleColumn} = CUSTOM:${customValue}`);
        }
      } else if (source.startsWith("SEQUENCE:")) {
        const sequenceValue = this.processSpecialValue(source);
        const formatOptions = valueFormatOptions?.[oracleColumn];
        const column = tableStructure.find(
          (col) => col.columnName === oracleColumn
        );

        if (column) {
          const processedValue = await this.processValueForColumnWithDebug(
            sequenceValue,
            column,
            debugLogger,
            formatOptions
          );
          record[oracleColumn] = processedValue;
          hasValidData = true;
          await debugLogger.log(
            `✅ ${oracleColumn} = SEQUENCE:${processedValue} (formato aplicado desde: ${sequenceValue})`
          );
        } else {
          record[oracleColumn] = sequenceValue;
          hasValidData = true;
          await debugLogger.log(
            `✅ ${oracleColumn} = SEQUENCE:${sequenceValue}`
          );
        }
      } else {
        // Es un header del archivo
        const headerIndex = headers.findIndex((h) => h === source);
        await debugLogger.log(
          `Buscando header "${source}" en posición ${headerIndex}`
        );

        if (headerIndex >= 0 && headerIndex < row.length) {
          const value = row[headerIndex];
          await debugLogger.log(
            `Valor encontrado en posición [${headerIndex}]: "${value}"`
          );

          const column = tableStructure.find(
            (col) => col.columnName === oracleColumn
          );

          if (column) {
            await debugLogger.log(`Información de columna ${oracleColumn}:`);
            await debugLogger.log(`  Tipo: ${column.dataType}`);
            await debugLogger.log(`  Longitud: ${column.dataLength || "N/A"}`);
            await debugLogger.log(`  Nullable: ${column.nullable}`);
            await debugLogger.log(
              `  Valor a procesar: "${value}" (tipo: ${typeof value})`
            ); // Obtener opciones de formato si están disponibles
            const formatOptions = valueFormatOptions?.[oracleColumn];

            const processedValue = await this.processValueForColumnWithDebug(
              value,
              column,
              debugLogger,
              formatOptions
            );
            record[oracleColumn] = processedValue;

            await debugLogger.log(
              `  Valor procesado final: "${processedValue}" (tipo: ${typeof processedValue})`
            );

            if (
              processedValue !== null &&
              processedValue !== undefined &&
              processedValue !== ""
            ) {
              hasValidData = true;
            }
            await debugLogger.log(
              `✅ ${oracleColumn} = "${processedValue}" (desde header "${source}")`
            );
          } else {
            await debugLogger.log(
              `❌ No se encontró columna ${oracleColumn} en tableStructure`
            );
          }
        } else {
          await debugLogger.log(
            `❌ Header "${source}" no encontrado o fuera de rango`
          );
          record[oracleColumn] = null;
        }
      }
    }

    // Completar con NULL las columnas no mapeadas
    tableStructure.forEach((column) => {
      if (!(column.columnName in record)) {
        record[column.columnName] = null;
      }
    });

    // Validación final
    if (!hasValidData) {
      await debugLogger.log(`⚠️ Fila omitida: sin datos válidos`);
      return null;
    }

    const allValuesNull = Object.values(record).every(
      (value) => value === null || value === undefined || value === ""
    );

    if (allValuesNull) {
      await debugLogger.log(`⚠️ Fila omitida: todos los valores NULL`);
      return null;
    }

    await debugLogger.logSubSection("REGISTRO FINAL GENERADO");
    for (const [col, val] of Object.entries(record)) {
      await debugLogger.log(`${col}: ${val}`);
    }

    await debugLogger.log(
      `\n📁 Archivo de debug: ${debugLogger.getLogFilePath()}`
    );

    return record;
  }
}
