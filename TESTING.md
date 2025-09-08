# HomeDash Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the HomeDash application, including unit tests, integration tests, linting, and best practices.

## Testing Stack

- **Testing Framework**: Vitest (fast Vite-native testing)
- **Testing Library**: React Testing Library (component testing)
- **Linting**: ESLint with React, hooks, and testing plugins
- **Code Formatting**: Prettier
- **Coverage**: Vitest built-in coverage with v8

## Test Categories

### 1. Unit Tests

Located in `src/components/__tests__/` and `src/__tests__/`

#### Components Tested:

- **SettingsIcon**: Icon rendering, props handling, accessibility attributes
- **Header**: Brand display, settings button, sticky positioning
- **MainPage**: Semantic structure, blank state
- **App**: Component integration, layout hierarchy

#### Test Coverage:

- Component rendering
- Props validation
- User interactions
- CSS class application
- DOM structure
- Accessibility attributes

### 2. Integration Tests

Located in `src/test/__tests__/integration.test.jsx`

#### Coverage Areas:

- Header and Main Page integration
- Component communication
- User interaction workflows
- Layout responsiveness
- Keyboard navigation
- Focus management

### 3. Performance Tests

Located in `src/test/__tests__/performance.test.jsx`

#### Performance Metrics:

- Component rendering time
- Memory leak detection
- DOM node efficiency
- CSS performance
- Re-rendering optimization

### 4. Linting Tests

ESLint configuration for code quality

#### Rules Enforced:

- React best practices
- Hook usage validation
- JSX accessibility
- Testing library patterns
- Code style consistency

## Available Test Scripts

```bash
# Run all tests
npm test

# Run tests with UI interface
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check

# Type checking (if TypeScript added later)
npm run typecheck

# Complete CI pipeline
npm run ci
```

## Test Configuration

### Vitest Configuration (`vitest.config.js`)

- JSDOM environment for browser simulation
- CSS support for styled components
- Coverage thresholds: 80% for branches, functions, lines, statements
- Global test utilities and matchers

### ESLint Configuration (`.eslintrc.json`)

- React hooks validation
- Accessibility rules
- Testing library best practices
- Code quality enforcement

### Test Setup (`src/test/setup.js`)

- Jest-DOM matchers
- Mock implementations for browser APIs
- Global cleanup after each test

## Writing Tests

### Best Practices

1. **Test Behavior, Not Implementation**

   ```jsx
   // Good: Test what user sees
   expect(
     screen.getByRole('button', { name: /settings/i })
   ).toBeInTheDocument();

   // Avoid: Testing implementation details
   expect(wrapper.find('.settings-button')).toHaveLength(1);
   ```

2. **Use Semantic Queries**

   ```jsx
   // Preferred order:
   screen.getByRole();
   screen.getByLabelText();
   screen.getByText();
   screen.getByTestId(); // last resort
   ```

3. **Test User Interactions**

   ```jsx
   const user = userEvent.setup();
   await user.click(screen.getByRole('button', { name: /settings/i }));
   ```

4. **Accessibility Testing**
   ```jsx
   // Ensure proper ARIA attributes
   expect(button).toHaveAttribute('aria-label', 'Settings');
   ```

### Test Structure

```jsx
describe('Component Name', () => {
  describe('feature group', () => {
    it('should describe expected behavior', () => {
      // Arrange
      render(<Component />);

      // Act
      const element = screen.getByRole('button');

      // Assert
      expect(element).toBeInTheDocument();
    });
  });
});
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory and include:

- HTML report for visual coverage analysis
- JSON report for CI integration
- Text report for terminal output

### Coverage Thresholds

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Continuous Integration

The `npm run ci` command runs the complete testing pipeline:

1. Linting (code quality)
2. Format checking (code style)
3. Test execution (functionality)
4. Build verification (production readiness)

## Common Testing Patterns

### Component Rendering

```jsx
it('renders without crashing', () => {
  render(<Component />);
  expect(screen.getByRole('expected-role')).toBeInTheDocument();
});
```

### User Interactions

```jsx
it('handles user interactions', async () => {
  const user = userEvent.setup();
  render(<Component />);

  await user.click(screen.getByRole('button'));
  expect(/* expected result */).toBeTruthy();
});
```

### Props Testing

```jsx
it('accepts and uses props correctly', () => {
  render(<Component customProp="value" />);
  expect(/* prop effect */).toBeTruthy();
});
```

### Integration Testing

```jsx
it('components work together', () => {
  render(<App />);

  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
});
```

## Test Maintenance

### When to Update Tests

- Component functionality changes
- New features added
- Bug fixes implemented
- API changes
- Design system updates

### Test Quality Indicators

- Tests pass consistently
- Good coverage metrics
- Fast execution time
- Clear test descriptions
- Minimal test duplication

## Debugging Tests

### Common Issues

1. **Async operations**: Use `await` with user events
2. **Missing elements**: Check component rendering and queries
3. **Timer issues**: Mock timers when needed
4. **CSS dependencies**: Ensure styles are loaded in tests

### Debugging Tools

```bash
# Run specific test file
npm test Header.test.jsx

# Run tests matching pattern
npm test -- --grep "settings"

# Debug mode with browser
npm run test:ui
```

## Performance Considerations

Tests are designed to:

- Run quickly (< 100ms per component test)
- Use minimal memory
- Clean up properly after execution
- Avoid unnecessary DOM manipulation
- Mock external dependencies

## Future Enhancements

Potential testing additions:

- End-to-end tests with Playwright
- Component snapshot testing
- Performance regression testing
- API integration testing
- Cross-browser compatibility testing

---

This testing strategy ensures high code quality, maintainability, and reliability for the HomeDash application while following industry best practices.
