# CLI Service Architecture

## 📋 Resumen

Se ha implementado una arquitectura desacoplada para servicios CLI que permite cambiar fácilmente entre diferentes implementaciones (Inquirer.js, readline, etc.) sin modificar el código cliente.

## 🏗️ Arquitectura

### Patrón Strategy + Factory

```
CLIInterface (Interfaz)
├── InquirerCLIService (Implementación con Inquirer.js)
├── ReadlineCLIService (Implementación con readline)
└── [Futuras implementaciones...]

CLIServiceFactory (Factory)
├── create(implementation?: CLIImplementation)
├── setDefaultImplementation()
└── getAvailableImplementations()
```

## 📁 Estructura de Archivos

```
presentation/cli/
├── interfaces/
│   └── cli.interface.ts          # Interfaz base CLIInterface
├── implementations/
│   └── inquirer-cli.service.ts   # Implementación con Inquirer.js
├── factories/
│   └── cli-service.factory.ts    # Factory para crear instancias
└── cli-interface.service.ts      # Implementación original (ReadlineCLIService)
```

## 🔧 Configuración

### Archivo de Configuración

```typescript
// config/cli.config.ts
export const cliConfig: CLIConfig = {
  implementation: "inquirer", // 'inquirer' | 'readline'
  inquirer: {
    pageSize: 10,
    theme: "default",
  },
  readline: {
    prompt: "👉 ",
  },
};
```

### Variable de Entorno

```bash
CLI_IMPLEMENTATION=readline npm start  # Usar readline
CLI_IMPLEMENTATION=inquirer npm start  # Usar inquirer (por defecto)
```

## 💻 Uso

### En el Código

```typescript
import { CLIServiceFactory } from "./presentation/cli/factories/cli-service.factory";
import { getCLIConfig } from "./config/cli.config";

// Usar implementación configurada
const cli = CLIServiceFactory.create(getCLIConfig().implementation);

// Usar implementación específica
const inquirerCLI = CLIServiceFactory.create("inquirer");
const readlineCLI = CLIServiceFactory.create("readline");
```

### Métodos de la Interfaz

```typescript
interface CLIInterface {
  showMenu(title: string, options: MenuOption[]): Promise<string>;
  question(message: string): Promise<string>;
  confirmAction(message: string): Promise<boolean>;
  close(): void;
  showMessage(message: string): void;
  showError(message: string): void;
  showSuccess(message: string): void;
  showWarning(message: string): void;
}
```

## 🆚 Comparación de Implementaciones

### Inquirer.js ✨ (Recomendado)

**Ventajas:**

- ✅ Interfaz interactiva rica (flechas, colores)
- ✅ Soporte para múltiples tipos de input (list, checkbox, confirm, etc.)
- ✅ Navegación con teclado intuitiva
- ✅ Validación integrada
- ✅ Mejor experiencia de usuario

**Desventajas:**

- ❌ Dependencia externa adicional
- ❌ Requiere TTY interactivo

### Readline 📝 (Backup)

**Ventajas:**

- ✅ No requiere dependencias externas
- ✅ Funciona en cualquier entorno
- ✅ Más simple y liviano

**Desventajas:**

- ❌ Interfaz básica de texto
- ❌ Menos opciones de interacción
- ❌ Experiencia de usuario más básica

## 🔄 Cómo Agregar Nueva Implementación

1. **Crear nueva implementación:**

```typescript
// implementations/nueva-cli.service.ts
export class NuevaCLIService implements CLIInterface {
  // Implementar todos los métodos de CLIInterface
}
```

2. **Actualizar Factory:**

```typescript
// factories/cli-service.factory.ts
export type CLIImplementation = 'inquirer' | 'readline' | 'nueva';

static create(implementation?: CLIImplementation): CLIInterface {
  switch (impl) {
    case 'nueva':
      return new NuevaCLIService();
    // ...casos existentes
  }
}
```

3. **Actualizar configuración:**

```typescript
// config/cli.config.ts
implementation: "nueva";
```

## 🎯 Beneficios de la Arquitectura

1. **🔗 Desacoplamiento:** El código cliente no depende de implementaciones específicas
2. **🔄 Flexibilidad:** Cambio fácil entre implementaciones
3. **🧪 Testabilidad:** Fácil mock de la interfaz CLI para tests
4. **📈 Escalabilidad:** Agregar nuevas implementaciones sin romper código existente
5. **🛠️ Mantenibilidad:** Cada implementación es independiente
6. **⚙️ Configurabilidad:** Control central de qué implementación usar

## 🚀 Estado Actual

- ✅ **Inquirer.js implementado y funcionando**
- ✅ **Readline mantenido como backup**
- ✅ **Factory pattern funcional**
- ✅ **Configuración flexible**
- ✅ **Aplicación principal usando Inquirer por defecto**
- ✅ **Interfaz profesional y rica**

---

_Actualizado: Junio 9, 2025_
