# Neon Tools (IWork) - Project Context

## Overview

**Neon Tools** (also known as **IWork** / **爱工作** / **牛马工具集**) is a comprehensive desktop utility collection built with **Electron**, **Vue 3**, and **TypeScript**. It features a distinct "Neon/Cyberpunk" aesthetic and includes over 40 developer and productivity tools such as SSH clients, screenshot utilities, formatters, and converters.

## Tech Stack

*   **Runtime:** Node.js (>= 18.0.0), Electron (v38)
*   **Frontend Framework:** Vue 3.5 (Composition API)
*   **Language:** TypeScript
*   **Build Tools:** Vite 7, Electron Vite, Electron Builder
*   **UI Libraries:** Element Plus, UnoCSS
*   **State Management:** Pinia
*   **Routing:** Vue Router
*   **Testing:** Playwright

## Project Structure

```text
E:\code\tool3\neon-tools\
├── electron/               # Electron main and preload scripts
│   ├── main.ts             # Main process entry point
│   └── preload.ts          # Preload script
├── src/                    # Vue 3 Frontend source code
│   ├── components/         # Reusable UI components (NeonButton, NeonCard, etc.)
│   ├── composables/        # Shared composables (e.g., useKeyboard)
│   ├── layouts/            # App layouts (MainLayout)
│   ├── pages/              # Application pages
│   │   ├── Home/           # Dashboard
│   │   └── tools/          # Individual tool implementations (JsonFormatter, SSH, etc.)
│   ├── router/             # Vue Router configuration
│   ├── stores/             # Pinia stores
│   ├── styles/             # Global styles and design tokens
│   ├── App.vue             # Root component
│   └── main.ts             # Frontend entry point
├── build/                  # Build assets (icons, etc.)
├── release-new/            # Output directory for packaged executables
├── tests/                  # End-to-End tests (Playwright)
├── electron-builder.json   # Electron packaging configuration
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── uno.config.ts           # UnoCSS configuration
```

## Key Commands

### Setup
```bash
npm install
```

### Development
*   **Start Electron App (Recommended):**
    ```bash
    npm run dev:electron
    ```
    *Starts the Vite dev server and the Electron window.*

*   **Start Web Version Only:**
    ```bash
    npm run dev
    ```
    *Runs the frontend in a browser (some Electron APIs will not work).*

### Building
*   **Build & Package for Windows:**
    ```bash
    npm run build:electron
    ```
    *Produces an installer (`.exe`) and portable executable in `release-new/` (or `dist/`).*

*   **Quick Build (Unpacked):**
    ```bash
    npm run build:dir
    ```
    *Builds the app into an unpacked directory for quick testing without creating an installer.*

### Testing
*   **Run E2E Tests:**
    ```bash
    npm run test:e2e
    ```

### Utility
*   **Kill Port:**
    ```bash
    npm run kill-port
    ```
    *Useful if the dev server port is stuck.*

## Development Conventions

*   **New Tools:**
    1.  Create a directory in `src/pages/tools/<ToolName>`.
    2.  Implement `Index.vue` using `<NeonCard>` and other shared components.
    3.  Register the route in `src/router/index.ts`.
    4.  Add the menu item in `src/components/Sidebar.vue`.
*   **Styling:**
    *   Use **UnoCSS** utilities for layout and spacing.
    *   Use CSS variables defined in `src/styles/tokens.css` for theming (e.g., `--neon-cyan`, `--neon-pink`).
*   **State:** Use Pinia for global state; keep local state in components where possible.
*   **Type Safety:** Ensure strict typing with TypeScript. Run `npm run build:check` to verify types.

## Important Notes
*   **Data Persistence:** User data (screenshots, knowledge base, SSH history) is stored in the `appData/` directory relative to the executable (or in the project root during dev).
*   **Icon Generation:** The build process involves `fix-icon.cjs` to handle icon resources.
*   **Naming:** The project is referred to by multiple names ("IWork", "Neon Tools", "牛马工具集") across documentation and configuration.
