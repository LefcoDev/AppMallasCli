/**
 * Use Case: Explore Table Structure
 * Responsabilidad: Explorar la estructura de una tabla específica
 */
import {
  OracleExplorerService,
  TableExplorationResult,
} from "../../../domain/services/oracle-explorer.service";

export interface ExploreTableStructureRequest {
  tableName: string;
  includeSample?: boolean;
  sampleSize?: number;
}

export interface ExploreTableStructureResponse {
  success: boolean;
  data?: TableExplorationResult;
  error?: string;
}

export class ExploreTableStructureUseCase {
  constructor(private readonly oracleExplorerService: OracleExplorerService) {}

  async execute(
    request: ExploreTableStructureRequest
  ): Promise<ExploreTableStructureResponse> {
    try {
      const { tableName, includeSample = true, sampleSize = 5 } = request;

      if (!tableName?.trim()) {
        return {
          success: false,
          error: "Nombre de tabla requerido",
        };
      }

      const result = await this.oracleExplorerService.exploreTableStructure(
        tableName.toUpperCase().trim()
      );

      // Si se solicita muestra de datos, agregarla al resultado
      if (includeSample && result.sampleData) {
        result.sampleData = result.sampleData.slice(0, sampleSize);
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error explorando tabla: ${error}`,
      };
    }
  }
}
