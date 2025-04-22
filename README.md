# oAuth-service

A Node.js service for implementing OAuth authentication with Microsoft SSO (Single Sign-On).

## Features

- Microsoft OAuth 2.0 / OpenID Connect authentication
- Session management with Redis
- TypeScript support
- Protected routes with authentication middleware

## Prerequisites

- Node.js (v14 or higher)
- Redis server running locally (for session storage)
- Microsoft Azure AD application registration

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure Microsoft Azure AD:
   - Register a new application in the [Azure Portal](https://portal.azure.com)
   - Add a redirect URI: `http://localhost:3000/auth/callback`
   - Make note of your Client ID and Client Secret

4. Create a `.env` file in the project root with the following variables:

```
PORT=3000
CLIENT_ID=your_microsoft_client_id
CLIENT_SECRET=your_microsoft_client_secret
REDIRECT_URI=http://localhost:3000/auth/callback
TENANT_ID=common
```

Note: Use `common` as the TENANT_ID for multi-tenant applications or your specific tenant ID for single-tenant applications.

## Running the application

Start the development server:

```bash
npm run dev
```

The server will be available at http://localhost:3000

## Authentication Flow

1. User accesses the application and clicks "Login with Microsoft"
2. User is redirected to Microsoft's authentication page
3. After successful authentication, Microsoft redirects back to the callback URL
4. The application verifies the response and creates a session
5. User is redirected to the profile page

## API Reference

### Authentication Routes

- `GET /` - Home page with login link
- `GET /auth/login` - Initiates Microsoft SSO login
- `POST /auth/callback` - Callback endpoint for Microsoft OAuth
- `GET /auth/logout` - Logs out the user by destroying the session
- `GET /profile` - Protected route that displays the authenticated user's information

## License

ISC
