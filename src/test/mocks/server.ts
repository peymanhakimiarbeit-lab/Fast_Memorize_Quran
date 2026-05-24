import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// MSW server instance with Quran.com API v4 handlers
export const server = setupServer(...handlers);
