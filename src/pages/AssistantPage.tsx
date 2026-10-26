import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Bot,
  Cpu,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  WifiOff,
} from 'lucide-react'
import type { AssistantMessage } from '../types'
import { assistantService } from '../services/assistantService'
import { useToast } from '../components/ui/Toast'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { DemoNotice } from '../components/ui/DemoNotice'

const quickPrompts = [
  'Ayúdame a preparar un reporte de mantenimiento.',
  'Resume el historial de este servomotor.',
  '¿Qué información debo revisar ante una falla de encoder?',
  'Ayúdame a consultar el manual técnico de este equipo.',
]

function createWelcomeMessage(): AssistantMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content:
      'Hola. Soy el asistente técnico de demostración de Industrial Maintenance AI.\n\nPuedo ayudarte a estructurar reportes, checklists y consultas técnicas. Mis respuestas son simuladas: no hay un modelo de IA conectado ni acceso a la telemetría real de tus equipos.',
    createdAt: new Date().toISOString(),
  }
}

export function AssistantPage() {
  const { showToast } = useToast()
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [createWelcomeMessage()])
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, processing])

  async function handleSend(text: string = input) {
    const question = text.trim()
    if (!question || processing) return

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setProcessing(true)

    try {
      const answer = await assistantService.sendQuestion(question)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
        },
      ])
    } catch {
      showToast('No se pudo generar la respuesta simulada. Inténtalo de nuevo.', 'error')
    } finally {
      setProcessing(false)
    }
  }

  function clearConversation() {
    if (processing) return
    setMessages([createWelcomeMessage()])
    setInput('')
    showToast('Conversación de demostración reiniciada.', 'info')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asistente de IA"
        description="Interfaz de apoyo técnico para preparar consultas y documentación de mantenimiento."
        actions={
          <Button variant="outline" onClick={clearConversation} disabled={processing}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Limpiar conversación
          </Button>
        }
      />

      <DemoNotice label="Asistente simulado · respuestas precargadas · sin modelo de IA conectado" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex min-h-[620px] flex-col overflow-hidden lg:col-span-2 lg:h-[calc(100vh-15.5rem)]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-800">
              <Bot className="h-5 w-5 text-teal-300" aria-hidden="true" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-amber-400" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Asistente técnico</h2>
                <Badge tone="warning">Demostración</Badge>
              </div>
              <p className="text-[11px] text-slate-500">Sin conexión a un modelo de IA</p>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="scrollbar-thin flex-1 space-y-4 overflow-y-auto bg-slate-50/50 px-4 py-5 sm:px-5"
            role="log"
            aria-live="polite"
            aria-label="Conversación con el asistente"
          >
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}

            {processing && <TypingIndicator />}
          </div>

          <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void handleSend()
              }}
            >
              <label htmlFor="assistant-input" className="sr-only">
                Escribe tu consulta técnica
              </label>
              <div className="flex items-end gap-2">
                <textarea
                  id="assistant-input"
                  rows={2}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void handleSend()
                    }
                  }}
                  maxLength={2000}
                  disabled={processing}
                  placeholder="Escribe una consulta técnica... (Enter para enviar)"
                  className="max-h-32 min-h-[46px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15 disabled:bg-slate-50"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || processing}
                  aria-label="Enviar consulta"
                  className="h-[46px] shrink-0 px-4"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Enviar</span>
                </Button>
              </div>
            </form>
            <p className="mt-2 text-[10px] leading-4 text-slate-400">
              Respuestas simuladas de demostración. No se envían consultas a servicios externos.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Consultas rápidas"
              description="Ejemplos para probar la interfaz"
              action={<Sparkles className="h-4 w-4 text-teal-600" aria-hidden="true" />}
            />
            <div className="grid gap-2 p-4">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void handleSend(prompt)}
                  disabled={processing}
                  className="group flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs leading-5 text-slate-600 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowUpRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-teal-700"
                    aria-hidden="true"
                  />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </Card>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-amber-900">Verifica siempre</h2>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Las respuestas generadas por IA deben comprobarse con la documentación técnica del
                  fabricante y los procedimientos de seguridad de la planta. No uses esta interfaz
                  para tomar decisiones críticas.
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader title="Estado de la integración" description="Preparado para una fase posterior" />
            <div className="space-y-3 p-4 text-xs leading-5">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-slate-600">
                  <WifiOff className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Modelo de IA
                </span>
                <Badge tone="neutral">No conectado</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-slate-600">
                  <Cpu className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  API FastAPI
                </span>
                <Badge tone="neutral">Pendiente</Badge>
              </div>
              <p className="text-slate-500">
                La conversación se gestiona con una capa de servicio separada de la interfaz, lista
                para sustituir la simulación por una llamada HTTP cuando exista un endpoint.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ChatMessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user'
  const time = new Date(message.createdAt).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (isUser) {
    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[85%]">
          <div className="rounded-2xl rounded-tr-sm bg-navy-800 px-4 py-3 text-sm leading-6 text-white shadow-sm">
            <p className="whitespace-pre-line">{message.content}</p>
          </div>
          <p className="mt-1 text-right text-[10px] text-slate-400">Tú · {time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <Bot className="h-4 w-4 text-navy-700" aria-hidden="true" />
      </span>
      <div className="max-w-[88%]">
        <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Asistente IA
            </span>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700">
              Demo
            </span>
          </div>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{message.content}</p>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">{time}</p>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <Bot className="h-4 w-4 text-navy-700" aria-hidden="true" />
      </span>
      <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500" />
          </span>
          <span className="text-xs text-slate-500">Analizando consulta (simulación)...</span>
        </div>
      </div>
    </div>
  )
}
