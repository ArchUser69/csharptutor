# CSharpTutor

An interactive AI tutor for learning C# and .NET, built in Google AI Studio and powered by the Gemini API.

View the original app in AI Studio: https://ai.studio/apps/d56bf60d-8233-4cbc-803d-d1e1b305e855

## What it does

| Mode | What you get |
| --- | --- |
| **Tutor Chat** | Ask C# questions. The tutor can see the code in your editor and stays on C# topics only. |
| **Line-by-Line** | A step-by-step explanation of the code in the editor. Hover a step to highlight its lines. |
| **Debug Code** | Finds bugs, highlights suspect lines, and gives progressive hints before revealing the fix. |
| **Practice** | Coding exercises (built-in or AI-generated) that the tutor checks for you. |
| **Quiz** | Multiple-choice quizzes (built-in or AI-generated) with explanations. |

Two settings in the sidebar apply everywhere:

- **Difficulty level** (Beginner, Intermediate, Advanced) changes how the tutor explains things.
- **Hints-First Mode** makes the tutor guide you with hints instead of handing over the full answer.

Your chats, progress, and editor contents are saved in your browser (localStorage), not on a server.

## Run it on your computer

**You need:** [Node.js](https://nodejs.org/) version 22 or newer, and a Gemini API key (create one at https://aistudio.google.com/apikey).

1. Install the dependencies:

   ```
   npm install
   ```

2. Create your settings file. Copy `.env.example` to a new file named `.env`, then replace `MY_GEMINI_API_KEY` with your real key:

   ```
   GEMINI_API_KEY="paste-your-key-here"
   ```

   (A file named `.env.local` works too. Neither file is committed to git.)

3. Start the app:

   ```
   npm run dev
   ```

4. Open http://localhost:3000 in your browser.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app in development mode with live reload. |
| `npm run build` | Builds the optimized production frontend into `dist/`. |
| `npm start` | Serves the production build (run `npm run build` first). |
| `npm test` | Runs the unit tests. |
| `npm run lint` | Type-checks the whole project with TypeScript. |
| `npm run clean` | Deletes the `dist/` build folder. |

All commands work on Windows, macOS, and Linux.

## Settings

Set these in your `.env` file (see `.env.example`):

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Yes | none | Your Gemini API key. Only the server reads it; it is never sent to the browser. |
| `GEMINI_MODEL` | No | `gemini-4-hydrogen` | Which Gemini model the tutor uses. |
| `PORT` | No | `3000` | Port the server listens on. |
| `HOST` | No | `0.0.0.0` | Network interface to listen on. Set to `127.0.0.1` so only this computer can reach the app. |

**Note on `HOST`:** with the default, other devices on your network can open the app and use your API key through it. On a shared or public network, set `HOST="127.0.0.1"`.

## Project layout

```
server.ts               Express server: serves the API and the frontend
server/
  tutorRoutes.ts        The /api/tutor/* endpoints that call Gemini
  tutorPrompts.ts       System prompts (difficulty levels, hints-first rules)
src/
  App.tsx               Main app state and layout
  components/           One file per view (chat, editor, debug, practice, quiz, ...)
  utils/
    csharpTokenizer.ts  C# syntax highlighting
    markdownParser.ts   Renders the tutor's Markdown replies safely (no raw HTML)
    learningProgress.ts Built-in exercises, quizzes, and progress tracking
    storage.ts          Loads and validates saved data from localStorage
    tutorApi.ts         Browser-side calls to the server API
```

## Troubleshooting

- **"GEMINI_API_KEY is not configured"**: the `.env` file is missing, is in the wrong folder (it belongs next to `package.json`), or still contains the placeholder value. Restart `npm run dev` after editing it.
- **"The Gemini model ... is not available"**: your key cannot use the default model. Set `GEMINI_MODEL` in `.env` to a model your key supports.
- **"Port 3000 is already in use"**: set a different port, for example `PORT=3001`, in `.env`.
