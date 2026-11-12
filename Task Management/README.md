# Daymark

A small task manager built with Express, MongoDB, and plain browser JavaScript. The server owns the important bits: account creation, token handling, input validation, and making sure a task can only be changed by its owner.

## Run it locally

You’ll need Node.js 20 or newer and a MongoDB instance.

1. Install the packages:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env`. Set `MONGODB_URI` to your database and replace both JWT secrets with different random strings of at least 32 characters.
3. Start the app:

   ```sh
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). For a regular start without the file watcher, use `npm start`.

## Using the app

Create an account from the sign-in screen. From the dashboard, you can add tasks, edit them, mark them done, delete them, and filter or search your list.

Admins can see every user’s tasks through `GET /api/tasks`. To grant admin access, first register the account, then run:

```sh
npm run make-admin -- person@example.com
```

There’s deliberately no public way to choose the `admin` role during signup.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account and sign in |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/refresh` | Rotate the refresh token |
| `POST` | `/api/auth/logout` | Revoke the current refresh session |
| `GET` | `/api/auth/me` | Get the signed-in user |
| `GET` | `/api/tasks` | List your tasks; admins get all tasks |
| `POST` | `/api/tasks` | Create a task |
| `PUT` | `/api/tasks/:id` | Update one of your tasks |
| `DELETE` | `/api/tasks/:id` | Delete one of your tasks |

Send the access token as `Authorization: Bearer <token>` on protected requests. The refresh token is an HTTP-only cookie and is rotated each time `/api/auth/refresh` is called. Task requests are scoped to the signed-in user; an admin’s read access does not grant permission to edit or delete another user’s tasks.

Tasks accept a `title` (required), `description`, `dueDate`, and `status` (`pending` or `completed`). Unknown fields are rejected.

## A few implementation notes

- Passwords are hashed with bcrypt before they’re stored.
- Refresh tokens are stored as SHA-256 hashes, not as usable tokens, and expire from MongoDB.
- Access and refresh tokens use separate secrets. Refresh tokens live in an HTTP-only, same-site cookie.
- Authentication endpoints are rate-limited; request bodies are validated before they reach the controllers.
- The browser app is static HTML, CSS, and JavaScript in `public/`; there’s no frontend build step.

Run the validation tests with `npm test`.
