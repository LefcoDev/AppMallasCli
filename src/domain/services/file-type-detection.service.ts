import { promises as fs } from "fs";
import path from "path";

/**
 * Enhanced File Type Detection Service
 * Detects file types and extracts metadata automatically
 */
export class FileTypeDetectionService {
  
  /**
   * Detecta el tipo de archivo basado en extensión y contenido
   */
  static async detectFileType(filePath: string): Promise<FileTypeInfo> {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();
    
    let detectedType = this.getTypeByExtension(ext);
    
    // Verificación adicional por contenido si es necesario
    if (detectedType === 'unknown') {
      detectedType = await this.detectByContent(filePath);
    }

    const stats = await fs.stat(filePath);
    
    return {
      filePath,
      fileName,
      extension: ext,
      detectedType,
      size: stats.size,
      lastModified: stats.mtime,
      isSupported: this.isSupportedType(detectedType),
      confidence: this.getConfidenceLevel(ext, detectedType)
    };
  }

  /**
   * Detecta múltiples archivos
   */
  static async detectMultipleFiles(filePaths: string[]): Promise<FileTypeInfo[]> {
    const results: FileTypeInfo[] = [];
    
    for (const filePath of filePaths) {
      try {
        const info = await this.detectFileType(filePath);
        results.push(info);
      } catch (error) {
        results.push({
          filePath,
          fileName: path.basename(filePath),
          extension: path.extname(filePath).toLowerCase(),
          detectedType: 'error',
          size: 0,
          lastModified: new Date(),
          isSupported: false,          confidence: 0,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return results;
  }

  /**
   * Extrae headers automáticamente según el tipo de archivo
   */
  static async extractHeaders(fileInfo: FileTypeInfo): Promise<string[]> {
    if (!fileInfo.isSupported) {
      throw new Error(`Tipo de archivo no soportado: ${fileInfo.detectedType}`);
    }

    switch (fileInfo.detectedType) {
      case 'excel':
        return await this.extractExcelHeaders(fileInfo.filePath);
      case 'csv':
        return await this.extractCsvHeaders(fileInfo.filePath);
      case 'txt':
      case 'tsv':
        return await this.extractTxtHeaders(fileInfo.filePath);
      default:
        throw new Error(`No hay extractor para tipo: ${fileInfo.detectedType}`);
    }
  }

  /**
   * Extrae muestra de datos para análisis
   */
  static async extractDataSample(fileInfo: FileTypeInfo, maxRows: number = 5): Promise<DataSample> {
    const headers = await this.extractHeaders(fileInfo);
    
    switch (fileInfo.detectedType) {
      case 'excel':
        return await this.extractExcelSample(fileInfo.filePath, headers, maxRows);
      case 'csv':
        return await this.extractCsvSample(fileInfo.filePath, headers, maxRows);
      case 'txt':
      case 'tsv':
        return await this.extractTxtSample(fileInfo.filePath, headers, maxRows);
      default:
        return { headers, rows: [], totalRows: 0 };
    }
  }

  private static getTypeByExtension(ext: string): FileType {
    const typeMap: { [key: string]: FileType } = {
      '.xlsx': 'excel',
      '.xls': 'excel', 
      '.xlsm': 'excel',
      '.csv': 'csv',
      '.txt': 'txt',
      '.tab': 'tsv',
      '.tsv': 'tsv',
      '.data': 'txt',
      '.log': 'txt'
    };

    return typeMap[ext] || 'unknown';
  }

  private static async detectByContent(filePath: string): Promise<FileType> {
    try {
      const buffer = await fs.readFile(filePath, { encoding: null });
      const content = buffer.slice(0, 1024).toString('utf-8');
      
      // Detectar separadores comunes
      if (content.includes('\t')) return 'tsv';
      if (content.includes(',')) return 'csv';
      if (content.includes('|')) return 'txt';
      
      return 'txt';
    } catch {
      return 'unknown';
    }
  }

  private static isSupportedType(type: FileType): boolean {
    return ['excel', 'csv', 'txt', 'tsv'].includes(type);
  }

  private static getConfidenceLevel(ext: string, detectedType: FileType): number {
    if (detectedType === 'unknown') return 0;
    if (detectedType === 'error') return 0;
    
    // Mayor confianza para extensiones conocidas
    const knownExtensions = ['.xlsx', '.xls', '.xlsm', '.csv'];
    if (knownExtensions.includes(ext)) return 0.95;
    
    return 0.7;
  }

  private static async extractExcelHeaders(filePath: string): Promise<string[]> {
    const XLSX = require('xlsx');
    
    try {
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      
      if (!firstSheetName) return [];
      
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '',
        blankrows: false 
      });
      
      return data.length > 0 ? data[0].filter((h: any) => h && h.toString().trim()) : [];    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error leyendo Excel: ${errorMessage}`);
    }
  }

  private static async extractCsvHeaders(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) return [];
      
      const firstLine = lines[0];
      const delimiter = this.detectCsvDelimiter(firstLine);
      
      return firstLine
        .split(delimiter)
        .map(h => h.trim().replace(/^["']|["']$/g, ''))
        .filter(h => h);    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error leyendo CSV: ${errorMessage}`);
    }
  }

  private static async extractTxtHeaders(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) return [];
      
      const firstLine = lines[0];
      const delimiter = this.detectTxtDelimiter(firstLine);
      
      return firstLine
        .split(delimiter)
        .map(h => h.trim())
        .filter(h => h);    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error leyendo TXT: ${errorMessage}`);
    }
  }

  private static detectCsvDelimiter(line: string): string {
    const delimiters = [',', ';', '|'];
    let bestDelimiter = ',';
    let maxCount = 0;
    
    for (const delimiter of delimiters) {
      const count = (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  }

  private static detectTxtDelimiter(line: string): string {
    if (line.includes('\t')) return '\t';
    if (line.includes('|')) return '|';
    if (line.includes(';')) return ';';
    return '\t';
  }

  private static async extractExcelSample(
    filePath: string, 
    headers: string[], 
    maxRows: number
  ): Promise<DataSample> {
    const XLSX = require('xlsx');
    
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: false
    });
    
    const dataRows = data.slice(1, maxRows + 1); // Skip header row
    const totalRows = Math.max(0, data.length - 1); // Total data rows
    
    return {
      headers,
      rows: dataRows,
      totalRows
    };
  }

  private static async extractCsvSample(
    filePath: string,
    headers: string[],
    maxRows: number
  ): Promise<DataSample> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) {
      return { headers, rows: [], totalRows: 0 };
    }
    
    const delimiter = this.detectCsvDelimiter(lines[0]);
    const dataLines = lines.slice(1, maxRows + 1);
    const totalRows = Math.max(0, lines.length - 1);
    
    const rows = dataLines.map(line => 
      line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
    );
    
    return {
      headers,
      rows,
      totalRows
    };
  }

  private static async extractTxtSample(
    filePath: string,
    headers: string[],
    maxRows: number
  ): Promise<DataSample> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) {
      return { headers, rows: [], totalRows: 0 };
    }
    
    const delimiter = this.detectTxtDelimiter(lines[0]);
    const dataLines = lines.slice(1, maxRows + 1);
    const totalRows = Math.max(0, lines.length - 1);
    
    const rows = dataLines.map(line => 
      line.split(delimiter).map(cell => cell.trim())
    );
    
    return {
      headers,
      rows,
      totalRows
    };
  }

  /**
   * Valida la estructura del archivo
   */
  static async validateFileStructure(fileInfo: FileTypeInfo): Promise<ValidationResult> {
    try {
      const sample = await this.extractDataSample(fileInfo, 3);
      
      const issues: string[] = [];
      const warnings: string[] = [];
      
      // Validaciones básicas
      if (sample.headers.length === 0) {
        issues.push("No se encontraron headers");
      }
      
      if (sample.totalRows === 0) {
        warnings.push("El archivo no contiene datos");
      }
      
      // Validar consistencia de columnas
      const headerCount = sample.headers.length;
      for (let i = 0; i < sample.rows.length; i++) {
        const row = sample.rows[i];
        if (row.length !== headerCount) {
          warnings.push(`Fila ${i + 2}: ${row.length} columnas, esperadas ${headerCount}`);
        }
      }
      
      // Detectar headers duplicados
      const duplicateHeaders = sample.headers.filter(
        (header, index) => sample.headers.indexOf(header) !== index
      );
      
      if (duplicateHeaders.length > 0) {
        issues.push(`Headers duplicados: ${duplicateHeaders.join(', ')}`);
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        warnings,
        sample
      };
        } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isValid: false,
        issues: [`Error validando archivo: ${errorMessage}`],
        warnings: [],
        sample: { headers: [], rows: [], totalRows: 0 }
      };
    }
  }
}

// Interfaces
export interface FileTypeInfo {
  filePath: string;
  fileName: string;
  extension: string;
  detectedType: FileType;
  size: number;
  lastModified: Date;
  isSupported: boolean;
  confidence: number;
  error?: string;
}

export type FileType = 'excel' | 'csv' | 'txt' | 'tsv' | 'unknown' | 'error';

export interface DataSample {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  sample: DataSample;
}
