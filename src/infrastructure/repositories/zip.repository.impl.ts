/**
 * @fileoverview Implementación del repositorio ZIP usando yauzl
 * @version 1.0.0
 * @author Sistema de Migración de Mallas
 */

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import yauzl from "yauzl";
import { ZipRepository } from "../../domain/repositories/zip.repository";

/**
 * Implementación del repositorio ZIP
 */
export class ZipRepositoryImpl implements ZipRepository {
  async extractZip(zipPath: string, extractPath: string): Promise<void> {
    console.log("📦 Extrayendo ZIP...");

    // Crear directorio temporal si no existe
    await this.ensureDir(extractPath);

    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        if (!zipfile) {
          reject(new Error("No se pudo abrir el archivo ZIP"));
          return;
        }

        zipfile.readEntry();

        zipfile.on("entry", (entry) => {
          const fileName = entry.fileName;
          const fullPath = path.join(extractPath, fileName);

          // Si es un directorio
          if (/\/$/.test(fileName)) {
            this.ensureDir(fullPath).then(() => {
              zipfile.readEntry();
            });
            return;
          }

          // Si es un archivo
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            if (!readStream) {
              zipfile.readEntry();
              return;
            }

            // Asegurar que el directorio padre existe
            this.ensureDir(path.dirname(fullPath)).then(() => {
              const writeStream = fsSync.createWriteStream(fullPath);
              readStream.pipe(writeStream);

              writeStream.on("close", () => {
                console.log(`  ✓ Extraído: ${fileName}`);
                zipfile.readEntry();
              });
            });
          });
        });

        zipfile.on("end", () => {
          console.log("📦 Extracción completada");
          resolve();
        });

        zipfile.on("error", reject);
      });
    });
  }

  async zipExists(zipPath: string): Promise<boolean> {
    try {
      await fs.access(zipPath);
      return true;
    } catch {
      return false;
    }
  }

  async cleanup(extractPath: string): Promise<void> {
    try {
      await fs.rm(extractPath, { recursive: true, force: true });
      console.log("🧹 Archivos temporales eliminados");
    } catch (error) {
      console.warn(`Advertencia: No se pudo eliminar ${extractPath}:`, error);
    }
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }
}
