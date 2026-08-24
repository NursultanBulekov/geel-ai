import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai-react'
import type { Release } from '../ai/tools'
import { listReleases } from '../ai/server-tools'

const getReleases = createServerFn().handler(async () => listReleases())

export const Route = createFileRoute('/console')({
  component: ReleaseConsole,
  loader: () => getReleases(),
})

function ReleaseConsole() {
  const releases = Route.useLoaderData()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, isLoading, error, stop } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
  })

  const submit = () => {
    const text = input.trim()
    if (!text) return
    void sendMessage(text)
    setInput('')
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      }),
    )
  }

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      <header className="mb-6">
        <p className="island-kicker mb-2">TanStack AI</p>
        <h1 className="display-title text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          Release console
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="island-shell flex h-[34rem] flex-col overflow-hidden rounded-2xl">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <MessageView key={message.id} message={message} />
            ))}
            {error && (
              <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">
                {error.message}
              </p>
            )}
          </div>

          <div className="flex gap-2 border-t border-[var(--line)] p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Ask about a release…"
              className="flex-1 rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm outline-none focus:border-[rgba(79,184,178,0.6)]"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!input.trim()}
                className="rounded-full bg-[var(--sea-ink)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Send
              </button>
            )}
          </div>
        </section>

        <aside className="island-shell rounded-2xl p-4">
          <p className="island-kicker mb-3">Ledger</p>
          <div className="space-y-2">
            {releases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </aside>
      </div>
    </main>
  )
}

function MessageView({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={isUser ? 'flex justify-end' : ''}>
      <div
        className={
          isUser
            ? 'max-w-[80%] rounded-2xl bg-[rgba(79,184,178,0.16)] px-4 py-2 text-sm'
            : 'max-w-[92%] space-y-2 text-sm'
        }
      >
        {message.parts.map((part, i) =>
          part.type === 'text' && part.content ? (
            <p key={i} className="whitespace-pre-wrap">
              {part.content}
            </p>
          ) : null,
        )}
      </div>
    </div>
  )
}

function ReleaseCard({ release }: { release: Release }) {
  const dot =
    release.status === 'healthy'
      ? 'bg-emerald-500'
      : release.status === 'degraded'
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div className="rounded-xl border border-[var(--line)] px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="font-mono font-semibold">{release.id}</span>
        <span className="text-[var(--sea-ink-soft)]">
          {release.service} {release.version}
        </span>
        <span className="ml-auto rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase">
          {release.stage}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-[var(--sea-ink-soft)]">
        error rate {release.errorRate}%
      </p>
    </div>
  )
}
