import '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test to avoid state leakage
afterEach(() => server.resetHandlers());

// Stop MSW server after all tests
afterAll(() => server.close());
