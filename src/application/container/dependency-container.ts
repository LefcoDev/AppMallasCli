/**
 * Dependency Injection Container
 * Manages application dependencies following DDD principles
 */

import { OracleRepository } from "../../domain/repositories/oracle.repository";
import { OracleExplorerService } from "../../domain/services/oracle-explorer.service";
import { OracleRepositoryImpl } from "../../infrastructure/repositories/oracle.repository.impl";
import { OracleExplorerServiceImpl } from "../services/oracle-explorer.service.impl";
import { OracleSafeDatabaseService } from "../../infrastructure/database/oracle/oracle-safe-database.service";
import { CLIInterface } from "../../presentation/cli/interfaces/cli.interface";
import { InquirerCLIService } from "../../presentation/cli/implementations/inquirer-cli.service";

// Universal Architecture imports
import { UserInterface } from "../../presentation/interfaces/user-interface.interface";
import { CLIUserInterfaceAdapter } from "../../presentation/adapters/cli-user-interface.adapter";
import { UniversalInputService } from "../../presentation/services/universal-input.service";
import { UniversalDisplayService } from "../../presentation/services/universal-display.service";
import { UniversalMenuService } from "../../presentation/services/universal-menu.service";

// ZIP Processing imports
import { ZipRepository } from "../../domain/repositories/zip.repository";
import { ZipRepositoryImpl } from "../../infrastructure/repositories/zip.repository.impl";
import {
  ZipProcessingService,
  ZipProcessingServiceImpl,
} from "../../domain/services/zip-processing.service";
import {
  IntelligentMappingService,
  IntelligentMappingServiceImpl,
} from "../../domain/services/intelligent-mapping.service";
import {
  NavigationService,
  NavigationServiceImpl,
} from "../../presentation/services/navigation.service";
import { ProcessZipFileUseCase } from "../use-cases/process-zip-file.use-case";

// Factories
import {
  StandaloneControllerFactory,
  StandaloneControllerFactoryImpl,
} from "../../presentation/factories/standalone-controller.factory";
import {
  DualMenuControllerFactory,
  DualMenuControllerFactoryImpl,
} from "../../presentation/factories/dual-menu-controller.factory";

// Table Display Service
import { TableDisplayService } from "../../domain/services/table-display.service";
import { CliTable3DisplayService } from "../../infrastructure/cli/table-display.service.impl";

// Oracle Explorer Use Cases
import {
  ExploreTableStructureUseCase,
  ListTablesUseCase,
  ExcelOperationsUseCase,
} from "../use-cases/oracle-explorer";

export class DependencyContainer {
  private static instance: DependencyContainer;
  private services: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  registerSingleton<T>(key: string, factory: () => T): void {
    this.services.set(key, () => {
      if (!this.singletons.has(key)) {
        this.singletons.set(key, factory());
      }
      return this.singletons.get(key);
    });
  }

  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service '${key}' not registered`);
    }
    return factory();
  }
  registerDefaults(outputPath: string): void {
    // Infrastructure layer - Oracle Service (Singleton)
    this.registerSingleton<OracleSafeDatabaseService>(
      "OracleSafeDatabaseService",
      () => {
        return new OracleSafeDatabaseService();
      }
    );

    this.register<OracleRepository>("OracleRepository", () => {
      const oracleService = this.resolve<OracleSafeDatabaseService>(
        "OracleSafeDatabaseService"
      );
      return new OracleRepositoryImpl(oracleService);
    });

    // Application layer - Domain Services
    this.register<OracleExplorerService>(
      "OracleExplorerService",
      () =>
        new OracleExplorerServiceImpl(
          this.resolve<OracleRepository>("OracleRepository"),
          outputPath
        )
    );

    // Application layer - Use Cases
    this.register<ExploreTableStructureUseCase>(
      "ExploreTableStructureUseCase",
      () =>
        new ExploreTableStructureUseCase(
          this.resolve<OracleExplorerService>("OracleExplorerService")
        )
    );

    this.register<ListTablesUseCase>(
      "ListTablesUseCase",
      () =>
        new ListTablesUseCase(
          this.resolve<OracleExplorerService>("OracleExplorerService")
        )
    );
    this.register<ExcelOperationsUseCase>(
      "ExcelOperationsUseCase",
      () =>
        new ExcelOperationsUseCase(
          this.resolve<OracleExplorerService>("OracleExplorerService")
        )
    );

    // Table Display Service
    this.register<TableDisplayService>(
      "TableDisplayService",
      () => new CliTable3DisplayService()
    );

    // ZIP Processing Services
    this.register<ZipRepository>(
      "ZipRepository",
      () => new ZipRepositoryImpl()
    );

    this.register<IntelligentMappingService>(
      "IntelligentMappingService",
      () => new IntelligentMappingServiceImpl()
    );

    this.register<ZipProcessingService>("ZipProcessingService", () => {
      const mappingService = this.resolve<IntelligentMappingService>(
        "IntelligentMappingService"
      );
      return new ZipProcessingServiceImpl(mappingService);
    });

    this.register<NavigationService>("NavigationService", () => {
      const userInterface = this.resolve<UserInterface>("UserInterface");
      return new NavigationServiceImpl(userInterface);
    });
    this.register<ProcessZipFileUseCase>("ProcessZipFileUseCase", () => {
      const zipRepository = this.resolve<ZipRepository>("ZipRepository");
      const zipProcessingService = this.resolve<ZipProcessingService>(
        "ZipProcessingService"
      );
      return new ProcessZipFileUseCase(zipRepository, zipProcessingService);
    });

    // Factories
    this.register<StandaloneControllerFactory>(
      "StandaloneControllerFactory",
      () => {
        const userInterface = this.resolve<UserInterface>("UserInterface");
        const navigationService =
          this.resolve<NavigationService>("NavigationService");
        const zipRepository = this.resolve<ZipRepository>("ZipRepository");
        const zipProcessingService = this.resolve<ZipProcessingService>(
          "ZipProcessingService"
        );
        return new StandaloneControllerFactoryImpl(
          userInterface,
          navigationService,
          zipRepository,
          zipProcessingService
        );
      }
    );
    this.register<DualMenuControllerFactory>(
      "DualMenuControllerFactory",
      () => {
        const userInterface = this.resolve<UserInterface>("UserInterface");
        const standaloneFactory = this.resolve<StandaloneControllerFactory>(
          "StandaloneControllerFactory"
        );
        return new DualMenuControllerFactoryImpl(
          userInterface,
          standaloneFactory,
          outputPath
        );
      }
    );
    // Presentation layer - CLI Services
    this.register<CLIInterface>("CLIService", () => new InquirerCLIService());

    // Presentation layer - Universal Services
    this.register<UserInterface>("UserInterface", () => {
      const cliService = this.resolve<CLIInterface>("CLIService");
      return new CLIUserInterfaceAdapter(cliService);
    });

    this.register<UniversalInputService>("UniversalInputService", () => {
      const userInterface = this.resolve<UserInterface>("UserInterface");
      return new UniversalInputService(userInterface);
    });

    this.register<UniversalDisplayService>("UniversalDisplayService", () => {
      const userInterface = this.resolve<UserInterface>("UserInterface");
      return new UniversalDisplayService(userInterface);
    });

    this.register<UniversalMenuService>("UniversalMenuService", () => {
      const userInterface = this.resolve<UserInterface>("UserInterface");
      return new UniversalMenuService(userInterface);
    });
  }
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }
}
