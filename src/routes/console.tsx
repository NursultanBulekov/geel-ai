import { useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { clientTools, createChatClientOptions } from '@tanstack/ai-client'
import type { UIMessage } from '@tanstack/ai-react'
import { MODEL_CARD, SUPPORTS_PROVIDER_HOSTED_TOOLS } from '../ai/model'
import {
  focusReleaseDef,
  promoteReleaseDef,
  readOperatorContextDef,
} from '../ai/tools'
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
  const [focused, setFocused] = useState<{ id: string; note?: string } | null>(
    null,
  )
  const [ticket, setTicket] = useState('CHG-')
  const scrollRef = useRef<HTMLDivElement>(null)

  /* --- client tool implementations -------------------------------------
   * The definitions came from the shared module; only the bodies are new.
   * These close over React state, which is precisely why they cannot live
   * on the server. */
  const focusRelease = focusReleaseDef.client(({ releaseId, note }) => {
    setFocused({ id: releaseId, note })
    return { focused: true }
  })

  const readOperatorContext = readOperatorContextDef.client(() => ({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    localTime: new Date().toLocaleString(),
    theme: document.documentElement.classList.contains('dark')
      ? ('dark' as const)
      : ('light' as const),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  }))

  const chatOptions = useMemo(
    () =>
      createChatClientOptions({
        connection: fetchServerSentEvents('/api/chat'),
        // The two `.client()` implementations plus the bare definition of the
        // server-side tool that needs approval. Declaring `promoteReleaseDef`
        // here executes nothing on the client — it is what types the approval
        // interrupt, so `interrupt.originalArgs` and the approve/reject
        // payloads are checked against the same Zod schemas the server uses.
        tools: clientTools(focusRelease, readOperatorContext, promoteReleaseDef),
      }),
    // Built once: changing `connection` or `tools` recreates the underlying
    // ChatClient. The tool closures only call state setters, so they are safe
    // to freeze here.
    [],
  )

  const {
    messages,
    sendMessage,
    isLoading,
    status,
    error,
    stop,
    clear,
    queue,
    cancelQueued,
    interrupts,
    resuming,
  } = useChat(chatOptions)

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
        <p className="island-kicker mb-2">TanStack AI · isomorphic tools</p>
        <h1 className="display-title text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          Release console
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          One <code>chat()</code> agent loop. Two tools run on the server, two
          run in this tab, and promoting a release stops the loop until you say
          so.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="island-shell flex h-[34rem] flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
            <StatusDot status={status} />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
              {resuming ? 'resuming' : status}
            </span>
            <button
              type="button"
              onClick={clear}
              className="ml-auto rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
            >
              Clear
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <MessageView key={message.id} message={message} />
            ))}

            {interrupts.map((interrupt) => {
              if (interrupt.kind !== 'tool-approval') {
                return <UnhandledInterrupt key={interrupt.id} kind={interrupt.kind} />
              }
              return (
                <ApprovalCard
                  key={interrupt.id}
                  toolName={interrupt.toolName}
                  args={interrupt.originalArgs}
                  ticket={ticket}
                  onTicketChange={setTicket}
                  onApprove={() =>
                    interrupt.resolveInterrupt(true, {
                      payload: { changeTicket: ticket },
                    })
                  }
                  onReject={() =>
                    interrupt.resolveInterrupt(false, {
                      payload: { reason: 'Declined in the console' },
                    })
                  }
                  onCancel={() => interrupt.cancel()}
                />
              )
            })}

            {queue.map((queued) => (
              <div
                key={queued.id}
                className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--line)] px-3 py-2 text-xs text-[var(--sea-ink-soft)]"
              >
                <span className="flex-1 truncate">
                  queued:{' '}
                  {typeof queued.content === 'string'
                    ? queued.content
                    : '[attachment]'}
                </span>
                <button type="button" onClick={() => cancelQueued(queued.id)}>
                  cancel
                </button>
              </div>
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
              placeholder="Ask about a release, or ask to promote one…"
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

        <aside className="space-y-4">
          <ModelCard />
          <div className="island-shell rounded-2xl p-4">
            <p className="island-kicker mb-3">Ledger</p>
            <div className="space-y-2">
              {releases.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  focused={focused?.id === release.id}
                  note={focused?.id === release.id ? focused.note : undefined}
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] text-[var(--sea-ink-soft)]">
              Server-rendered from the ledger. The agent reads it through
              <code> search_releases</code> and highlights cards through the
              client-side <code>focus_release</code>.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}

/* --------------------------------- parts -------------------------------- */

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
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return part.content ? (
              <p key={i} className="whitespace-pre-wrap">
                {part.content}
              </p>
            ) : null
          }

          if (part.type === 'thinking') {
            const done = message.parts.slice(i + 1).some((p) => p.type === 'text')
            return (
              <details
                key={i}
                open={!done}
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs text-[var(--sea-ink-soft)]"
              >
                <summary className="cursor-pointer">
                  {done ? 'Thought process' : 'Thinking…'}
                </summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans">
                  {part.content}
                </pre>
              </details>
            )
          }

          if (part.type === 'tool-call') {
            return <ToolCallView key={part.id} part={part} />
          }

          return null
        })}
      </div>
    </div>
  )
}

function ToolCallView({ part }: { part: any }) {
  const state: string = part.state ?? 'pending'
  const tone =
    state === 'output-error'
      ? 'text-red-600'
      : state === 'output-available'
        ? 'text-[var(--sea-ink)]'
        : 'text-[var(--sea-ink-soft)]'

  return (
    <details className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs">
      <summary className={`cursor-pointer font-mono ${tone}`}>
        {part.name} · {state}
      </summary>
      <pre className="mt-2 overflow-x-auto text-[11px] text-[var(--sea-ink-soft)]">
        {JSON.stringify(
          { input: part.input ?? part.args, output: part.output },
          null,
          2,
        )}
      </pre>
    </details>
  )
}

function ApprovalCard({
  toolName,
  args,
  ticket,
  onTicketChange,
  onApprove,
  onReject,
  onCancel,
}: {
  toolName: string
  args: unknown
  ticket: string
  onTicketChange: (value: string) => void
  onApprove: () => void
  onReject: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold">
        Approval required · <code>{toolName}</code>
      </p>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-black/5 p-2 text-[11px]">
        {JSON.stringify(args, null, 2)}
      </pre>
      <label className="mt-3 block text-xs font-semibold">
        Change ticket
        <input
          value={ticket}
          onChange={(e) => onTicketChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-transparent px-2 py-1 text-sm"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          className="rounded-full border border-[var(--line)] px-4 py-1.5 text-xs font-semibold"
        >
          Deny
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto text-xs text-[var(--sea-ink-soft)] underline"
        >
          cancel run
        </button>
      </div>
      <p className="mt-2 text-[11px] text-[var(--sea-ink-soft)]">
        The agent loop is paused server-side. Nothing runs until you resolve
        this.
      </p>
    </div>
  )
}

function UnhandledInterrupt({ kind }: { kind: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs text-[var(--sea-ink-soft)]">
      Run paused on a <code>{kind}</code> interrupt this UI does not own.
    </div>
  )
}

function ReleaseCard({
  release,
  focused,
  note,
}: {
  release: Release
  focused: boolean
  note?: string
}) {
  const dot =
    release.status === 'healthy'
      ? 'bg-emerald-500'
      : release.status === 'degraded'
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div
      className={`rounded-xl border px-3 py-2 transition ${
        focused
          ? 'border-[rgba(79,184,178,0.8)] bg-[rgba(79,184,178,0.12)]'
          : 'border-[var(--line)]'
      }`}
    >
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
      {note && <p className="mt-1 text-[11px] font-semibold">{note}</p>}
    </div>
  )
}

function ModelCard() {
  return (
    <div className="island-shell rounded-2xl p-4 text-xs">
      <p className="island-kicker mb-3">Model</p>
      <dl className="space-y-1">
        <Row label="id" value={MODEL_CARD.id} />
        <Row label="adapter" value={MODEL_CARD.adapter} />
        <Row label="context" value={MODEL_CARD.contextWindow} />
        <Row label="max output" value={MODEL_CARD.maxOutput} />
        <Row label="inputs" value={MODEL_CARD.inputModalities.join(', ')} />
        <Row
          label="hosted tools"
          value={
            SUPPORTS_PROVIDER_HOSTED_TOOLS
              ? MODEL_CARD.providerHostedTools.join(', ')
              : 'none for this model'
          }
        />
      </dl>
      <p className="mt-3 text-[11px] text-[var(--sea-ink-soft)]">
        Read off the adapter's type maps, not hardcoded. No image, speech or
        realtime panel appears because this model exposes no such surface here.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-[var(--sea-ink-soft)]">{label}</dt>
      <dd className="m-0 font-mono">{value}</dd>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const tone =
    status === 'streaming' || status === 'submitted'
      ? 'bg-amber-500 animate-pulse'
      : status === 'error'
        ? 'bg-red-500'
        : 'bg-emerald-500'
  return <span className={`h-2 w-2 rounded-full ${tone}`} />
}
