/**
 * @fileoverview Factory para controladores de funcionalidades standalone
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

import { UserInterface } from "../interfaces/user-interface.interface";
import { NavigationService } from "../services/navigation.service";
import {
  ZipProcessingController,
  ZipProcessingControllerImpl,
} from "../controllers/zip-processing.controller";
import { ProcessZipFileUseCase } from "../../application/use-cases/process-zip-file.use-case";
import { ZipRepository } from "../../domain/repositories/zip.repository";
import { ZipProcessingService } from "../../domain/services/zip-processing.service";

export interface StandaloneControllerFactory {
  /**
   * Crea el controlador de procesamiento ZIP
   */
  createZipProcessingController(): ZipProcessingController;
}

/**
 * Factory para crear controladores standalone
 */
export class StandaloneControllerFactoryImpl
  implements StandaloneControllerFactory
{
  constructor(
    private readonly userInterface: UserInterface,
    private readonly navigationService: NavigationService,
    private readonly zipRepository: ZipRepository,
    private readonly zipProcessingService: ZipProcessingService
  ) {}

  createZipProcessingController(): ZipProcessingController {
    const processZipUseCase = new ProcessZipFileUseCase(
      this.zipRepository,
      this.zipProcessingService
    );

    return new ZipProcessingControllerImpl(
      this.userInterface,
      processZipUseCase,
      this.navigationService
    );
  }
}
