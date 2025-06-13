/**
 * @fileoverview Factory principal para el controlador dual
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

import { UserInterface } from "../interfaces/user-interface.interface";
import {
  DualMenuController,
  DualMenuControllerImpl,
} from "../controllers/dual-menu-fixed.controller";
import { StandaloneControllerFactory } from "./standalone-controller.factory";

export interface DualMenuControllerFactory {
  /**
   * Crea el controlador principal con menú dual
   */
  createDualMenuController(): DualMenuController;
}

/**
 * Factory para crear el controlador de menú dual
 */
export class DualMenuControllerFactoryImpl
  implements DualMenuControllerFactory
{
  constructor(
    private readonly userInterface: UserInterface,
    private readonly standaloneFactory: StandaloneControllerFactory,
    private readonly outputPath: string
  ) {}
  createDualMenuController(): DualMenuController {
    const zipController =
      this.standaloneFactory.createZipProcessingController();

    return new DualMenuControllerImpl(
      this.userInterface,
      zipController,
      this.outputPath
    );
  }
}
