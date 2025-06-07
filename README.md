# test

## Running Tests

This section provides instructions on how to run the tests for both the frontend and backend parts of the application.

### Frontend

The frontend tests are located in `cloudflare-openai-boilerplate/frontend/frontend-app/src/components/CryptoDisplay.test.jsx`. These tests are designed to verify the functionality of React components.

To run the frontend unit tests:
1.  Navigate to the frontend application directory:
    ```bash
    cd cloudflare-openai-boilerplate/frontend/frontend-app
    ```
2.  Ensure you have Jest and React Testing Library installed (usually as dev dependencies).
3.  You can run the tests using a Jest-compatible test runner. If Jest is configured in your `package.json` scripts (e.g., as `test`), you can use:
    ```bash
    npm test
    ```
    Alternatively, you can run Jest directly (you might need to install `jest` globally or use `npx`):
    ```bash
    npx jest
    ```

For linting the frontend code, navigate to the `cloudflare-openai-boilerplate/frontend/frontend-app` directory and run:
```bash
npm run lint
```

### Backend

The backend integration tests are conceptually located in `cloudflare-openai-boilerplate/backend/worker-backend/tests/`. These tests are designed to verify the Cloudflare worker API endpoints.

To run the backend tests:
1.  Navigate to the backend worker directory:
    ```bash
    cd cloudflare-openai-boilerplate/backend/worker-backend
    ```
2.  Ensure you have your testing framework (e.g., Jest) and Miniflare (for local worker simulation) installed.
3.  If tests are configured in your `package.json` scripts (e.g., as `test`), you can use:
    ```bash
    npm test
    ```
    or
    ```bash
    yarn test
    ```
    This command should execute the test files located in the `tests/` directory.
