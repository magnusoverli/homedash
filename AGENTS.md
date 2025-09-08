# Agent Development Guide for HomeDash

## CRITICAL: Design Manual Compliance

**The design_manual.md is PARAMOUNT and must be followed at ALL times. Every UI change, component update, and styling decision MUST adhere to the design manual specifications.**

## Build & Test Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Production build
- `npm run lint` - Run ESLint checks
- `npm run format` - Auto-format with Prettier
- `npm test` - Run all tests with Vitest
- `npm run test -- path/to/test.jsx` - Run single test file
- `npm run test:watch` - Run tests in watch mode
- `npm run typecheck` - Type checking (TypeScript/JSDoc)

## Code Style Guidelines

- **Framework**: React 19 with Vite, using JSX (not TypeScript)
- **Imports**: Use ES6 modules, React imports at top, components next, then styles
- **Formatting**: Prettier config: single quotes, semicolons, 2-space indent, 80-char lines
- **Components**: Functional components only, export default at end of file
- **Testing**: Vitest + React Testing Library, test files in `__tests__` folders
- **File Structure**: Components in `src/components/`, styles in `src/styles/`
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Error Handling**: Use try-catch blocks, console.error for debugging
- **Accessibility**: Include proper ARIA labels, semantic HTML, keyboard navigation
