import { CLIUserInterfaceAdapter } from "../../presentation/adapters/cli-user-interface.adapter";
import { SelectOption } from "../../presentation/interfaces/user-interface.interface";
import { OracleExplorerService } from "./oracle-explorer.service";
import {
  FileTypeDetectionService,
  FileTypeInfo,
  DataSample,
} from "./file-type-detection.service";

/**
 * Interactive Mapping Service
 * Maneja el mapeo inteligente entre archivos Excel/CSV/TXT y tablas Oracle
 * Integra con OracleExplorerService para obtener información de tablas
 */
export class InteractiveMappingService {
  constructor(
    private readonly userInterface: CLIUserInterfaceAdapter,
    private readonly oracleService: OracleExplorerService
  ) {}

  /**
   * Crea un mapeo interactivo entre headers de archivo y columnas de tabla
   */
  async createInteractiveMapping(
    fileInfos: FileTypeInfo[],
    tableName: string
  ): Promise<InteractiveMappingResult> {
    console.log("\n🎯 MAPEO INTERACTIVO DE COLUMNAS");
    console.log("═".repeat(60)); // 1. Obtener estructura de la tabla Oracle
    const tableExploration = await this.oracleService.exploreTableStructure(
      tableName
    );

    if (
      !tableExploration ||
      !tableExploration.columns ||
      tableExploration.columns.length === 0
    ) {
      throw new Error(
        `No se pudo obtener la estructura de la tabla ${tableName}`
      );
    }

    const tableStructure = tableExploration.columns;

    // 2. Extraer headers únicos de todos los archivos
    const allHeaders = await this.extractUniqueHeaders(fileInfos);

    if (allHeaders.length === 0) {
      throw new Error("No se encontraron headers en los archivos");
    }

    console.log(`📊 Archivos analizados: ${fileInfos.length}`);
    console.log(`📋 Headers únicos encontrados: ${allHeaders.length}`);
    console.log(`🗄️ Columnas en tabla ${tableName}: ${tableStructure.length}`);

    // 3. Mostrar preview de los datos
    await this.showDataPreview(fileInfos, allHeaders);

    // 4. Seleccionar tipo de mapeo
    const mappingType = await this.selectMappingType();    // 5. Crear mapeo según el tipo seleccionado
    let columnMapping: ColumnMapping = {};
    let valueFormatOptions: ValueFormatOptions = {};

    switch (mappingType) {
      case "automatic":
        const autoResult = await this.createAutomaticMapping(
          allHeaders,
          tableStructure
        );
        columnMapping = autoResult.columnMapping;
        valueFormatOptions = autoResult.valueFormatOptions;
        break;
      case "manual":
        const manualResult = await this.createManualMapping(
          allHeaders,
          tableStructure
        );
        columnMapping = manualResult.columnMapping;
        valueFormatOptions = manualResult.valueFormatOptions;
        break;
      case "mixed":
        const mixedResult = await this.createMixedMapping(
          allHeaders,
          tableStructure
        );
        columnMapping = mixedResult.columnMapping;
        valueFormatOptions = mixedResult.valueFormatOptions;
        break;
    }

    // 6. Confirmar mapeo
    const confirmed = await this.confirmMapping(columnMapping, tableStructure);

    if (!confirmed) {
      throw new Error("Mapeo cancelado por el usuario");
    }    return {
      columnMapping,
      valueFormatOptions,
      tableStructure,
      mappingType,
      totalHeaders: allHeaders.length,
      mappedHeaders: Object.keys(columnMapping).filter((k) => columnMapping[k])
        .length,
      unmappedHeaders: allHeaders.filter(
        (h) => !columnMapping[h] || !columnMapping[h]
      ),
    };
  }

  /**
   * Extrae headers únicos de múltiples archivos
   */
  private async extractUniqueHeaders(
    fileInfos: FileTypeInfo[]
  ): Promise<string[]> {
    const allHeadersSet = new Set<string>();

    for (const fileInfo of fileInfos) {
      if (!fileInfo.isSupported) continue;

      try {
        const headers = await FileTypeDetectionService.extractHeaders(fileInfo);
        headers.forEach((h) => {
          if (h && h.trim()) {
            allHeadersSet.add(h.trim());
          }
        });
      } catch (error) {
        console.log(
          `⚠️ Warning: No se pudieron extraer headers de ${fileInfo.fileName}`
        );
      }
    }

    return Array.from(allHeadersSet).sort();
  }
  /**
   * Muestra preview de los datos de los archivos con headers detallados
   */
  private async showDataPreview(
    fileInfos: FileTypeInfo[],
    headers: string[]
  ): Promise<void> {
    console.log("\n📖 PREVIEW DE DATOS DE ARCHIVOS");
    console.log("═".repeat(60));

    // Mostrar hasta 3 archivos como muestra
    const sampleFiles = fileInfos.slice(0, 3);

    for (const fileInfo of sampleFiles) {
      if (!fileInfo.isSupported) continue;

      try {
        const sample = await FileTypeDetectionService.extractDataSample(
          fileInfo,
          5
        );

        console.log(
          `\n📁 ${fileInfo.fileName} (${fileInfo.detectedType.toUpperCase()})`
        );
        console.log(
          `📊 Total de filas: ${sample.totalRows} | Headers encontrados: ${sample.headers.length}`
        );

        // Mostrar headers en formato tabla
        console.log("\n📋 Headers del archivo:");
        sample.headers.forEach((header, idx) => {
          console.log(`   ${String(idx + 1).padStart(2, "0")}. "${header}"`);
        });

        if (sample.rows.length > 0) {
          console.log("\n📝 Muestra de datos (primeras 3 filas):");
          console.log("   " + "─".repeat(50));

          // Mostrar hasta 5 columnas por simplicidad
          const maxCols = Math.min(5, sample.headers.length);
          const displayHeaders = sample.headers.slice(0, maxCols);

          // Header de la tabla
          console.log(
            `   ${displayHeaders.map((h) => h.padEnd(12)).join(" | ")}`
          );
          console.log("   " + "─".repeat(50));

          // Datos
          sample.rows.slice(0, 3).forEach((row, idx) => {
            const displayRow = row.slice(0, maxCols).map((cell) =>
              String(cell || "")
                .substring(0, 12)
                .padEnd(12)
            );
            console.log(`   ${displayRow.join(" | ")}`);
          });

          if (sample.headers.length > 5) {
            console.log(`   ... y ${sample.headers.length - 5} columnas más`);
          }
        }
      } catch (error) {
        console.log(`❌ Error leyendo ${fileInfo.fileName}: ${error}`);
      }
    }

    if (fileInfos.length > 3) {
      console.log(`\n... y ${fileInfos.length - 3} archivo(s) más`);
    }
  }
  /**
   * Permite al usuario seleccionar el tipo de mapeo
   */
  private async selectMappingType(): Promise<MappingType> {
    console.log("\n🔧 TIPO DE MAPEO");
    console.log("─".repeat(30));

    const result = await this.userInterface.selectOption([
      {
        value: "automatic",
        label: "🤖 Automático",
        description: "Detecta automáticamente coincidencias por nombre",
      },
      {
        value: "manual",
        label: "👤 Manual",
        description: "Mapear cada columna manualmente",
      },
      {
        value: "mixed",
        label: "🔀 Mixto",
        description: "Automático + revisión manual de conflictos",
      },
    ]);

    return result as MappingType;
  }
  /**
   * Crea mapeo automático basado en similitud de nombres con información detallada
   */  private async createAutomaticMapping(
    headers: string[],
    tableStructure: TableColumn[]
  ): Promise<MappingResult> {    console.log("\n🤖 MAPEO AUTOMÁTICO POR SIMILITUD");
    console.log("═".repeat(60));

    const mapping: ColumnMapping = {};
    const valueFormatOptions: ValueFormatOptions = {};
    const matchLog: Array<{
      header: string;
      column?: string;
      score?: number;
      reason: string;
    }> = [];

    for (const header of headers) {
      let bestMatch: { column: string; score: number } | null = null;

      // Buscar coincidencias exactas primero
      for (const col of tableStructure) {
        if (header.toLowerCase() === col.columnName.toLowerCase()) {
          bestMatch = { column: col.columnName, score: 1.0 };
          matchLog.push({
            header,
            column: col.columnName,
            score: 1.0,
            reason: "Coincidencia exacta (ignorando mayúsculas)",
          });
          break;
        }
      }

      // Si no hay coincidencia exacta, buscar por similitud
      if (!bestMatch) {
        for (const col of tableStructure) {
          const score = this.calculateSimilarity(header, col.columnName);
          if (score > 0.7) {
            // Umbral de similitud
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = { column: col.columnName, score };
            }
          }
        }

        if (bestMatch) {
          matchLog.push({
            header,
            column: bestMatch.column,
            score: bestMatch.score,
            reason: `Similitud alta (${Math.round(bestMatch.score * 100)}%)`,
          });
        } else {
          matchLog.push({
            header,
            reason: "Sin coincidencias suficientes (< 70%)",
          });
        }
      }

      mapping[header] = bestMatch ? bestMatch.column : null;
      
      // Configurar formato automático para el mapping
      if (bestMatch) {
        const column = tableStructure.find(col => col.columnName === bestMatch.column);
        if (column) {
          valueFormatOptions[bestMatch.column] = {
            source: header,
            format: 'auto'
          };
        }
      }
    }

    // Mostrar resultados del mapeo automático
    console.log("\n📊 RESULTADOS DEL MAPEO AUTOMÁTICO:");
    console.log("   " + "─".repeat(80));
    console.log(
      "   " +
        "HEADER ARCHIVO".padEnd(25) +
        "COLUMNA ORACLE".padEnd(20) +
        "SCORE".padEnd(10) +
        "MOTIVO"
    );
    console.log("   " + "─".repeat(80));

    matchLog.forEach((match) => {
      const headerPart = `"${match.header}"`.padEnd(25);
      const columnPart = (match.column || "SIN MAPEAR").padEnd(20);
      const scorePart = (
        match.score ? `${Math.round(match.score * 100)}%` : "-"
      ).padEnd(10);
      const reasonPart = match.reason;

      const icon = match.column ? "✅" : "⚪";
      console.log(
        `${icon} ${headerPart}${columnPart}${scorePart}${reasonPart}`
      );
    });

    const mappedCount = Object.values(mapping).filter((v) => v !== null).length;
    const totalCount = headers.length;

    console.log("\n📈 ESTADÍSTICAS:");
    console.log(`   • Headers procesados: ${totalCount}`);
    console.log(
      `   • Mapeados automáticamente: ${mappedCount} (${Math.round(
        (mappedCount / totalCount) * 100
      )}%)`
    );    console.log(`   • Sin mapear: ${totalCount - mappedCount}`);

    return {
      columnMapping: mapping,
      valueFormatOptions
    };
  }
  /**
   * Crea mapeo manual columna por columna - NUEVA LÓGICA INVERTIDA
   * Mapea cada columna Oracle a un source (header del archivo o valor constante)
   */  private async createManualMapping(
    headers: string[],
    tableStructure: TableColumn[]
  ): Promise<MappingResult> {
    console.log("\n👤 MAPEO MANUAL INTERACTIVO - COLUMNA POR COLUMNA");
    console.log("═".repeat(70));
    console.log(
      "🎯 Para cada columna Oracle, elige de dónde obtener el valor:"
    );
    console.log("   📋 Desde header del archivo");
    console.log("   🔧 Valor constante (NULL, SYSDATE, valor fijo)");
    console.log("\n✅ IMPORTANTE: Headers pueden reutilizarse SIN RESTRICCIÓN");
    console.log(
      "   🔄 Un mismo header puede mapear a MÚLTIPLES columnas Oracle"
    );
    console.log(
      "   📊 Ejemplo: 'CODIGO' puede ir a STVADVR_CODE y STVADVR_DESC"
    );
    console.log("   🎯 ¡No hay límite en la reutilización de headers!");

    // Mostrar información de headers disponibles
    console.log("\n📋 HEADERS DISPONIBLES EN ARCHIVO(S):");
    console.log("   " + "─".repeat(50));
    headers.forEach((header, idx) => {
      console.log(`   ${String(idx + 1).padStart(2, "0")}. "${header}"`);
    });    const mapping: ColumnMapping = {};
    const valueFormatOptions: ValueFormatOptions = {};
    const reverseMapping: { [oracleColumn: string]: string } = {}; // Oracle column -> source

    console.log(`\n🔄 Configurando ${tableStructure.length} columnas Oracle:`);

    for (let i = 0; i < tableStructure.length; i++) {
      const column = tableStructure[i];

      console.log("\n" + "═".repeat(70));
      console.log(
        `🗄️ Columna Oracle ${i + 1}/${tableStructure.length}: ${
          column.columnName
        }`
      );
      console.log(
        `   📊 Tipo: ${column.dataType}${
          column.dataLength ? ` (${column.dataLength})` : ""
        }`
      );
      console.log(
        `   ${column.nullable === "N" ? "⚠️ REQUERIDO" : "✅ Opcional"}`
      );
      console.log("─".repeat(40));
      const choices: SelectOption[] = [
        {
          value: "exit",
          label: "🚪 Salir al menú principal",
          description: "Cancelar operación y volver al menú principal",
        },
        {
          value: "skip",
          label: "⏭️ Omitir columna",
          description:
            "No incluir esta columna en el INSERT (solo si es opcional)",
        },
        {
          value: "null",
          label: "🔴 NULL",
          description: "Insertar valor NULL (solo si la columna lo permite)",
        },
        {
          value: "sysdate",
          label: "📅 SYSDATE",
          description:
            "Fecha/hora actual del sistema Oracle (para columnas DATE)",
        },
        {
          value: "sequence",
          label: "🔢 Secuencia automática",
          description: "Generar números secuenciales (1, 2, 3, 4...)",
        },
        {
          value: "custom",
          label: "✏️ Valor personalizado",
          description: "Escribir un valor fijo para todos los registros",
        },
      ];

      // Agregar headers del archivo como opciones
      headers.forEach((header) => {
        const alreadyUsed = Object.values(reverseMapping).includes(header)
          ? " [YA USADO]"
          : "";
        choices.push({
          value: `header:${header}`,
          label: `📋 Del archivo: "${header}"${alreadyUsed}`,
          description: "Tomar valor desde esta columna del archivo",
        });
      });
      const selectedSource = await this.userInterface.selectOption(choices);

      // Manejar opción de salir
      if (selectedSource === "exit") {
        console.log("\n🚪 Operación cancelada. Volviendo al menú principal...");
        throw new Error("OPERATION_CANCELLED");
      }

      if (selectedSource === "skip") {
        if (column.nullable === "N") {
          console.log(
            `⚠️ ADVERTENCIA: Omitir columna REQUERIDA (${column.columnName})`
          );
          console.log(
            `   Esto es válido si la columna tiene secuencia, trigger o valor por defecto.`
          );
          const confirm = await this.userInterface.confirmAction(
            "¿Confirmar omitir esta columna requerida?"
          );
          if (!confirm) {
            i--; // Volver a preguntar
            continue;
          }
        }
        console.log(
          `⏭️ OMITIDA: ${column.columnName} no se incluirá en el INSERT`
        );
        continue;
      } else if (selectedSource === "null") {
        if (column.nullable === "N") {
          console.log(
            `⚠️ ADVERTENCIA: NULL en columna REQUERIDA (${column.columnName})`
          );
          console.log(
            `   Esto es válido si la columna tiene secuencia, trigger o valor por defecto.`
          );
          const confirm = await this.userInterface.confirmAction(
            "¿Confirmar NULL en esta columna requerida?"
          );
          if (!confirm) {
            i--; // Volver a preguntar
            continue;
          }
        }
        reverseMapping[column.columnName] = "NULL";
        console.log(`🔴 VALOR NULL: ${column.columnName} = NULL`);
      } else if (selectedSource === "sysdate") {
        if (!column.dataType.toUpperCase().includes("DATE")) {
          console.log(
            `⚠️ ADVERTENCIA: SYSDATE se asigna a columna no-DATE (${column.dataType})`
          );
          const confirm = await this.userInterface.confirmAction(
            "¿Continuar de todos modos?"
          );
          if (!confirm) {
            i--; // Volver a preguntar
            continue;
          }
        }
        reverseMapping[column.columnName] = "SYSDATE";
        console.log(`📅 FECHA SISTEMA: ${column.columnName} = SYSDATE`);
      } else if (selectedSource === "sequence") {
        const startValue = await this.userInterface.askQuestion(
          "Ingresa el valor inicial de la secuencia (ej: 1):"
        );
        const startNumber = parseInt(startValue);
        if (isNaN(startNumber)) {
          console.log(`❌ Valor inválido, intentar de nuevo...`);
          i--; // Volver a preguntar
          continue;
        }
        reverseMapping[column.columnName] = `SEQUENCE:${startNumber}`;
        console.log(
          `🔢 SECUENCIA: ${column.columnName} = ${startNumber}, ${
            startNumber + 1
          }, ${startNumber + 2}...`
        );
      } else if (selectedSource === "custom") {
        const customValue = await this.userInterface.askQuestion(
          "Ingresa el valor personalizado (se usará tal como lo escribas):"
        );
        if (customValue && customValue.trim()) {
          reverseMapping[column.columnName] = `CUSTOM:${customValue.trim()}`;
          console.log(
            `✏️ VALOR PERSONALIZADO: ${
              column.columnName
            } = "${customValue.trim()}"`
          );
        } else {
          console.log(`❌ Valor vacío, intentar de nuevo...`);
          i--; // Volver a preguntar
          continue;
        }
      } else if (selectedSource?.startsWith("header:")) {
        const headerName = selectedSource.replace("header:", ""); // ✅ PERMITIR REUTILIZACIÓN DE HEADERS SIN RESTRICCIÓN
        const alreadyUsedByColumn = Object.keys(reverseMapping).find(
          (col) => reverseMapping[col] === headerName
        );
        if (alreadyUsedByColumn) {
          console.log(
            `ℹ️ El header "${headerName}" ya está asignado a ${alreadyUsedByColumn}`
          );
          console.log(`🔄 REUTILIZACIÓN PERMITIDA: se permite mapeo múltiple`);
          console.log(`✅ Este mismo valor se usará para ambas columnas`);
          // NO pedir confirmación, permitir directamente
        }        reverseMapping[column.columnName] = headerName;
        console.log(`📋 DESDE ARCHIVO: ${column.columnName} ← "${headerName}"`);

        // 🎯 NUEVA FUNCIONALIDAD: Elegir formato de valor (string vs number)
        await this.selectValueFormat(column, headerName, valueFormatOptions);

        // DEBUG: Mostrar estado actual del reverseMapping
        console.log(`🔍 Estado actual del reverseMapping:`);
        Object.keys(reverseMapping).forEach((oracleCol) => {
          console.log(`   ${oracleCol} ← ${reverseMapping[oracleCol]}`);
        });
      }
    }

    // ✅ FLUJO ÚNICO Y LIMPIO - Solo usar reverseMapping
    mapping["__REVERSE_MAPPING__"] = JSON.stringify(reverseMapping);    console.log("\n🔍 MAPEO FINAL:");
    Object.keys(reverseMapping).forEach((oracleCol) => {
      console.log(`   ${oracleCol} ← ${reverseMapping[oracleCol]}`);
    });

    return {
      columnMapping: mapping,
      valueFormatOptions
    };
  }
  /**
   * Crea mapeo mixto (automático + manual para conflictos) con información detallada
   */  private async createMixedMapping(
    headers: string[],
    tableStructure: TableColumn[]
  ): Promise<MappingResult> {
    console.log("\n🔀 MAPEO MIXTO (AUTOMÁTICO + MANUAL)");
    console.log("═".repeat(60));
    console.log("   1️⃣ Primero se intentará mapeo automático");
    console.log("   2️⃣ Luego revisión manual de casos pendientes");    // Primero hacer mapeo automático
    const autoResult = await this.createAutomaticMapping(headers, tableStructure);
    let mapping = autoResult.columnMapping;
    let valueFormatOptions = autoResult.valueFormatOptions;

    // Encontrar headers sin mapear y columnas requeridas sin mapear
    const unmappedHeaders = headers.filter((h) => !mapping[h]);
    const requiredColumns = tableStructure.filter(
      (col) => col.nullable === "N"
    );
    const unmappedRequiredColumns = requiredColumns.filter(
      (col) => !Object.values(mapping).includes(col.columnName)
    );

    // Mostrar estadísticas del mapeo automático
    const mappedCount = Object.values(mapping).filter((v) => v !== null).length;
    console.log("\n📊 RESULTADO DEL MAPEO AUTOMÁTICO:");
    console.log(
      `   ✅ Mapeados automáticamente: ${mappedCount}/${headers.length}`
    );
    console.log(`   ⚪ Sin mapear: ${unmappedHeaders.length}`);
    console.log(
      `   ⚠️ Columnas requeridas sin mapear: ${unmappedRequiredColumns.length}`
    );

    if (unmappedHeaders.length > 0 || unmappedRequiredColumns.length > 0) {
      console.log("\n🔧 REVISIÓN MANUAL NECESARIA");
      console.log("═".repeat(40));

      if (unmappedRequiredColumns.length > 0) {
        console.log("\n⚠️ COLUMNAS REQUERIDAS SIN MAPEAR:");
        unmappedRequiredColumns.forEach((col) => {
          console.log(
            `   ❌ ${col.columnName} (${col.dataType}) - OBLIGATORIO`
          );
        });
        console.log(
          "   ⚠️ Es crítico mapear estas columnas para evitar errores en INSERT"
        );
      }

      if (unmappedHeaders.length > 0) {
        console.log("\n📋 HEADERS SIN MAPEAR:");
        unmappedHeaders.forEach((header, idx) => {
          console.log(`   ${idx + 1}. "${header}"`);
        });

        const reviewUnmapped = await this.userInterface.confirmAction(
          `\n¿Revisar manualmente los ${unmappedHeaders.length} headers sin mapear?`
        );        if (reviewUnmapped) {
          console.log("\n👤 INICIANDO MAPEO MANUAL PARA HEADERS PENDIENTES...");
          const manualResult = await this.createManualMapping(
            unmappedHeaders,
            tableStructure
          );
          
          // Combinar los mappings
          mapping = { ...mapping, ...manualResult.columnMapping };
          valueFormatOptions = { ...valueFormatOptions, ...manualResult.valueFormatOptions };

          // Mostrar estadísticas finales
          const finalMappedCount = Object.values(mapping).filter(
            (v) => v !== null
          ).length;
          console.log("\n📈 ESTADÍSTICAS FINALES DEL MAPEO MIXTO:");
          console.log(`   🤖 Automático: ${mappedCount} headers`);
          console.log(
            `   👤 Manual: ${finalMappedCount - mappedCount} headers`
          );
          console.log(
            `   ✅ Total mapeado: ${finalMappedCount}/${headers.length}`
          );
        } else {
          console.log("   ⚪ Headers sin mapear permanecerán como NULL");
        }
      }
    } else {
      console.log("\n🎉 ¡MAPEO AUTOMÁTICO COMPLETO!");
      console.log("   Todos los headers fueron mapeados automáticamente");    }

    return {
      columnMapping: mapping,
      valueFormatOptions
    };
  }

  /**
   * Encuentra la mejor coincidencia entre un header y las columnas de la tabla
   */
  private findBestMatch(
    header: string,
    tableStructure: TableColumn[]
  ): TableColumn | null {
    const normalizedHeader = header.toLowerCase().trim();

    // 1. Coincidencia exacta
    let exactMatch = tableStructure.find(
      (col) => col.columnName.toLowerCase() === normalizedHeader
    );
    if (exactMatch) return exactMatch;

    // 2. Coincidencia sin espacios/guiones
    const cleanHeader = normalizedHeader.replace(/[\s_-]/g, "");
    exactMatch = tableStructure.find(
      (col) =>
        col.columnName.toLowerCase().replace(/[\s_-]/g, "") === cleanHeader
    );
    if (exactMatch) return exactMatch;

    // 3. Coincidencia parcial (contiene)
    const partialMatch = tableStructure.find(
      (col) =>
        col.columnName.toLowerCase().includes(normalizedHeader) ||
        normalizedHeader.includes(col.columnName.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // 4. Mapeos comunes conocidos
    const commonMappings: { [key: string]: string } = {
      area: "AREA",
      materia: "SUBJ_CODE",
      curso: "CRSE_NUMB",
      nombre: "NAME",
      descripcion: "DESC",
      fecha: "DATE",
      codigo: "CODE",
      id: "ID",
    };

    const commonMatch = commonMappings[normalizedHeader];
    if (commonMatch) {
      const found = tableStructure.find((col) =>
        col.columnName.includes(commonMatch)
      );
      if (found) return found;
    }

    return null;
  }
  /**
   * Muestra el mapeo final con información detallada y solicita confirmación
   */
  private async confirmMapping(
    mapping: ColumnMapping,
    tableStructure: TableColumn[]
  ): Promise<boolean> {
    console.log("\n📋 RESUMEN DETALLADO DEL MAPEO");
    console.log("═".repeat(80));

    // Separar mapeos especiales
    const specialMappings: { [column: string]: string } = {};
    const headerMappings: ColumnMapping = {};

    Object.keys(mapping).forEach((key) => {
      if (key.startsWith("__SPECIAL_")) {
        const columnName = key.replace("__SPECIAL_", "");
        specialMappings[columnName] = mapping[key] as string;
      } else {
        headerMappings[key] = mapping[key];
      }
    });

    const mappedHeaders = Object.keys(headerMappings).filter(
      (k) => headerMappings[k]
    );
    const unmappedHeaders = Object.keys(headerMappings).filter(
      (k) => !headerMappings[k]
    );
    const mappedFromHeaders = Object.values(headerMappings).filter((v) => v);
    const specialColumns = Object.keys(specialMappings);

    const allMappedColumns = [...mappedFromHeaders, ...specialColumns];
    const unmappedRequiredColumns = tableStructure
      .filter((col) => col.nullable === "N")
      .filter((col) => !allMappedColumns.includes(col.columnName));

    // Estadísticas generales
    console.log(`📊 ESTADÍSTICAS:`);
    console.log(
      `   📋 Headers del archivo: ${Object.keys(headerMappings).length}`
    );
    console.log(`   ✅ Headers mapeados: ${mappedHeaders.length}`);
    console.log(`   ⚪ Headers sin usar: ${unmappedHeaders.length}`);
    console.log(
      `   🗄️ Columnas Oracle configuradas: ${allMappedColumns.length}/${tableStructure.length}`
    );
    console.log(`   🔧 Valores especiales: ${specialColumns.length}`);
    console.log(
      `   ⚠️ Columnas requeridas sin mapear: ${unmappedRequiredColumns.length}`
    );

    // Mostrar mapeo desde headers de archivo
    if (mappedHeaders.length > 0) {
      console.log("\n📋 MAPEO DESDE HEADERS DE ARCHIVO:");
      console.log("   " + "─".repeat(80));
      console.log(
        "   " +
          "HEADER ARCHIVO".padEnd(30) +
          "→ COLUMNA ORACLE".padEnd(25) +
          "TIPO".padEnd(15) +
          "INFO"
      );
      console.log("   " + "─".repeat(80));

      Object.entries(headerMappings).forEach(([header, column]) => {
        if (column) {
          const tableCol = tableStructure.find((c) => c.columnName === column);
          const headerPart = `"${header}"`.padEnd(30);
          const columnPart = column.padEnd(25);
          const typePart = (tableCol?.dataType || "").padEnd(15);
          const infoPart = this.getColumnInfo(tableCol);

          console.log(`   ${headerPart}→ ${columnPart}${typePart}${infoPart}`);
        }
      });
    }

    // Mostrar valores especiales/constantes
    if (specialColumns.length > 0) {
      console.log("\n🔧 VALORES ESPECIALES/CONSTANTES:");
      console.log("   " + "─".repeat(80));
      console.log(
        "   " +
          "COLUMNA ORACLE".padEnd(30) +
          "VALOR".padEnd(20) +
          "TIPO".padEnd(15) +
          "INFO"
      );
      console.log("   " + "─".repeat(80));

      specialColumns.forEach((columnName) => {
        const value = specialMappings[columnName];
        const tableCol = tableStructure.find(
          (c) => c.columnName === columnName
        );
        const columnPart = columnName.padEnd(30);
        let displayValue = "";
        if (value === "NULL") {
          displayValue = "🔴 NULL".padEnd(20);
        } else if (value === "SYSDATE") {
          displayValue = "📅 SYSDATE".padEnd(20);
        } else if (value.startsWith("CUSTOM:")) {
          const customVal = value.replace("CUSTOM:", "");
          displayValue = `✏️ "${customVal}"`.padEnd(20);
        } else if (value.startsWith("SEQUENCE:")) {
          const startVal = value.replace("SEQUENCE:", "");
          displayValue = `🔢 SEQ(${startVal}++)`.padEnd(20);
        }

        const typePart = (tableCol?.dataType || "").padEnd(15);
        const infoPart = this.getColumnInfo(tableCol);

        console.log(`   ${columnPart}${displayValue}${typePart}${infoPart}`);
      });
    }

    // Mostrar headers sin usar
    if (unmappedHeaders.length > 0) {
      console.log("\n⚪ HEADERS SIN USAR (se ignorarán):");
      unmappedHeaders.forEach((header) => {
        console.log(`   "${header}"`);
      });
    }

    // Mostrar columnas Oracle no configuradas
    const unusedColumns = tableStructure.filter(
      (col) => !allMappedColumns.includes(col.columnName)
    );
    if (unusedColumns.length > 0) {
      console.log("\n🗄️ COLUMNAS ORACLE SIN CONFIGURAR:");
      unusedColumns.forEach((col) => {
        const required = col.nullable === "N" ? " ⚠️ REQUERIDO" : "";
        console.log(`   ${col.columnName} (${col.dataType})${required}`);
      });
    }

    // Advertencias importantes
    if (unmappedRequiredColumns.length > 0) {
      console.log("\n⚠️ ADVERTENCIAS CRÍTICAS:");
      console.log(
        "   Las siguientes columnas son REQUERIDAS y no tienen configuración:"
      );
      unmappedRequiredColumns.forEach((col) => {
        console.log(`   ❌ ${col.columnName} (${col.dataType}) - NOT NULL`);
      });
      console.log(
        "   ⚠️ El INSERT fallará a menos que estas columnas tengan valores por defecto"
      );
    }

    // Información adicional
    console.log("\n📝 INFORMACIÓN ADICIONAL:");
    console.log(`   • Headers de archivo → Valores dinámicos por fila`);
    console.log(
      `   • Valores especiales → Mismo valor para todos los registros`
    );
    console.log(`   • Modo de inserción: INSERT por lotes`);
    console.log(`   • Manejo de errores: Se reportarán filas problemáticas`);

    console.log("\n" + "═".repeat(80));
    return await this.userInterface.confirmAction(
      "¿Confirmar esta configuración y proceder con la carga de datos?"
    );
  }

  /**
   * Obtiene información detallada de una columna Oracle
   */
  private getColumnInfo(tableCol: TableColumn | undefined): string {
    if (!tableCol) return "ERROR";

    const parts: string[] = [];

    if (tableCol.dataLength) {
      parts.push(`${tableCol.dataLength} chars`);
    }

    if (tableCol.nullable === "N") {
      parts.push("REQUERIDO");
    }
    return parts.join(", ");
  }

  /**
   * Calcula la similitud entre dos strings usando el algoritmo de Levenshtein
   * Retorna un valor entre 0 y 1, donde 1 es coincidencia perfecta
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    // Crear matriz para algoritmo de Levenshtein
    const matrix: number[][] = [];
    const len1 = s1.length;
    const len2 = s2.length;

    // Inicializar primera fila y columna
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Llenar la matriz
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // Eliminación
          matrix[i][j - 1] + 1, // Inserción
          matrix[i - 1][j - 1] + cost // Sustitución
        );
      }
    }

    // Calcular similitud
    const maxLength = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return 1 - distance / maxLength;
  }

  /**
   * Permite al usuario elegir el formato del valor (string vs number)
   */
  private async selectValueFormat(
    column: TableColumn,
    headerName: string,
    valueFormatOptions: ValueFormatOptions
  ): Promise<void> {
    // Solo preguntar por formato si la columna puede ser NUMBER o VARCHAR2
    const isNumberColumn = column.dataType === 'NUMBER';
    const isStringColumn = column.dataType.startsWith('VARCHAR2') || column.dataType.startsWith('CHAR');
    
    if (!isNumberColumn && !isStringColumn) {
      // Para otros tipos (DATE, etc.), usar formato automático
      valueFormatOptions[column.columnName] = {
        source: headerName,
        format: 'auto'
      };
      return;
    }    console.log(`\n🎯 FORMATO DE VALOR para ${column.columnName}`);
    console.log(`   Header: "${headerName}"`);
    console.log(`   Tipo Oracle: ${column.dataType}`);
    console.log(`   ¿Cómo quieres que aparezca este valor en el INSERT?`);
    
    const formatChoices: SelectOption[] = [
      {
        value: "auto",
        label: "🤖 Automático",
        description: "Detectar automáticamente según el tipo de columna"
      },
      {
        value: "string",
        label: "📝 Como STRING ('1')",
        description: "Forzar valor entre comillas simples en el INSERT"
      },
      {
        value: "number",
        label: "🔢 Como NUMBER (1)",
        description: "Forzar valor numérico sin comillas en el INSERT"
      }
    ];

    const selectedFormat = await this.userInterface.selectOption(formatChoices, false);

    valueFormatOptions[column.columnName] = {
      source: headerName,
      format: selectedFormat as 'string' | 'number' | 'auto'
    };

    // Mostrar feedback al usuario
    const example = selectedFormat === 'string' ? "'1234'" : 
                   selectedFormat === 'number' ? "1234" : 
                   "auto (depende del tipo)";
    
    console.log(`✅ Formato elegido: ${example}`);
  }
}

// Interfaces
export interface InteractiveMappingResult {
  columnMapping: ColumnMapping;
  valueFormatOptions: ValueFormatOptions;
  tableStructure: TableColumn[];
  mappingType: MappingType;
  totalHeaders: number;
  mappedHeaders: number;
  unmappedHeaders: string[];
}

export type MappingType = "automatic" | "manual" | "mixed";

export interface ColumnMapping {
  [header: string]: string | null;
}

export interface ValueFormatOptions {
  [oracleColumn: string]: {
    source: string;           // header o valor constante
    format: 'string' | 'number' | 'auto'; // formato deseado
  };
}

export interface TableColumn {
  columnName: string;
  dataType: string;
  dataLength?: number;
  nullable: string;
  defaultValue?: string;
}

export interface MappingResult {
  columnMapping: ColumnMapping;
  valueFormatOptions: ValueFormatOptions;
}
