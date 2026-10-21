import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Component tests opt in with `// @vitest-environment jsdom` and this import; the pure
// helper tests in src/lib stay on the fast default environment.
afterEach(cleanup)
