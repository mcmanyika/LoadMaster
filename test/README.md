# Testing Guide

## Quick Reference

```bash
# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage
```

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `test/setup.ts` - Global test setup
- `test/utils/` - Test utilities and helpers
- `test/mocks/` - Mock implementations
- `components/__tests__/` - Component tests
- `services/__tests__/` - Service tests
- `__tests__/` - Integration tests

## Writing Tests

### Component Tests
Test component rendering, user interactions, and state changes.

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils/testUtils';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Service Tests
Test service functions, API calls (mocked), and data transformations.

Example:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { myService } from '../myService';
import { mockSupabase } from '../../test/mocks/supabase';

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase,
}));

describe('myService', () => {
  it('should fetch data', async () => {
    // Test implementation
  });
});
```

### Integration Tests
Test complete user flows and component interactions.
