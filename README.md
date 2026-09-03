Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
bun install
bun --bun run dev
```

# Building For Production

To build this application for production:

```bash
bun --bun run build
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Remove `@tailwindcss/vite` and `tailwindcss` from `package.json`



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).


# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.


# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).

---

## AI console (TanStack AI)

A single page, `/console`, and a single endpoint, `/api/chat`, showing an agent
loop driven by `chat()` from `@tanstack/ai` with the Anthropic adapter.

```
src/ai/model.ts          model id + capabilities, derived from the adapter's types
src/ai/adapter.ts        anthropicText() — server only, keeps the SDK out of the browser
src/ai/tools.ts          isomorphic toolDefinition()s (contracts, no implementations)
src/ai/server-tools.ts   .server() implementations + the release ledger
src/ai/releases-fn.ts    server function that seeds the page loader
src/routes/api.chat.ts   the chat() endpoint
src/routes/console.tsx   .client() implementations + headless UI
```

### The four tools

| Tool | Runs | Why there |
| --- | --- | --- |
| `search_releases` | server | The ledger never leaves the server |
| `promote_release` | server, **needs approval** | Mutates infrastructure |
| `focus_release` | client | Changes React state in the operator's tab |
| `read_operator_context` | client | Timezone, locale and viewport only the browser knows |

All four share one `toolDefinition()` with one Zod input and output schema. The
server attaches `.server()`, the page attaches `.client()`, and a drift between
the two sides is a compile error.

### Approval flow

`promote_release` sets `needsApproval: true` and an `approvalSchema`. The agent
loop pauses server-side; the client receives a bound interrupt and renders it:

```ts
interrupt.resolveInterrupt(true,  { payload: { changeTicket } })
interrupt.resolveInterrupt(false, { payload: { reason } })
interrupt.cancel()
```

The route forwards `resume`, `runId` and `parentRunId` from
`chatParamsFromRequest`, which is what lets the paused run continue rather than
restart.

### Headless UI

There is no UI kit. `useChat` returns state (`messages`, `status`, `interrupts`,
`queue`, `error`, `resuming`) and the page renders `message.parts` itself —
`text`, `thinking`, `tool-call` — so tool calls, reasoning and approvals are all
visible as they stream.

### Provider honesty

`src/ai/model.ts` derives input modalities and provider-hosted tool support from
the adapter's own type maps with `satisfies`, so the UI cannot advertise a
capability the selected model does not have. `claude-opus-5` types its hosted
tool list as empty, so this app attaches none and shows no image, speech or
realtime panel. `modelOptions` carries only `max_tokens`: the Messages API
rejects sampling parameters on this model, and thinking runs adaptively when
`thinking` is omitted.

### Running it

```bash
cp .env.example .env      # add your ANTHROPIC_API_KEY
bun install
bun run dev               # http://localhost:3000/console
```

Without a key the endpoint returns a 503 explaining what is missing; a malformed
AG-UI body returns a 400.
