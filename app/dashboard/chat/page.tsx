'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { ModuleHeader } from '@/components/dashboard/module-header'
import { ChatShell } from '@/components/dashboard/chat/chat-shell'
import { ChatSidebar } from '@/components/dashboard/chat/chat-sidebar'
import { ChatHeader } from '@/components/dashboard/chat/chat-header'
import { MessageList } from '@/components/dashboard/chat/message-list'
import { ChatInput } from '@/components/dashboard/chat/chat-input'
import type { ChatMember, ChatUser, WorkshopMessage } from '@/components/dashboard/chat/types'
import { getChatCurrentUser, getChatMembers, getWorkshopMessages, sendWorkshopMessage } from '@/lib/actions/chat-prisma'

type MobileView = 'list' | 'chat'

export default function ChatPage() {
  const [messages, setMessages] = useState<WorkshopMessage[]>([])
  const [members, setMembers] = useState<ChatMember[]>([])
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [activePeer, setActivePeer] = useState<ChatMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileView, setMobileView] = useState<MobileView>('list')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [sending, setSending] = useState(false)

  const isOwnMessage = (message: WorkshopMessage) => message.sender_id === currentUser?.id

  const formattedMessages = useMemo(
    () =>
      messages
        .slice()
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages],
  )

  useEffect(() => {
    const run = async () => {
      setLoading(true)

      const [messagesRes, membersRes, meRes] = await Promise.all([
        getWorkshopMessages(null),
        getChatMembers(),
        getChatCurrentUser(),
      ])
      if (!messagesRes.error) setMessages(messagesRes.data)
      if (!membersRes.error) setMembers(membersRes.data)
      if (meRes.data) setCurrentUser(meRes.data)

      setLoading(false)
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }
    run()
  }, [])

  useEffect(() => {
    if (!formattedMessages.length) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [formattedMessages])

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data, error } = await getWorkshopMessages(activePeer?.id ?? null)
      if (!error) setMessages(data)
    }, 6000)
    return () => clearInterval(interval)
  }, [activePeer?.id])

  const loadChannel = useCallback(async (peer: ChatMember | null) => {
    setActivePeer(peer)
    setMobileView('chat')
    const { data, error } = await getWorkshopMessages(peer?.id ?? null)
    if (!error) setMessages(data)
  }, [])

  const handleBack = useCallback(() => {
    setMobileView('list')
  }, [])

  const sendMessage = async () => {
    const text = messageInput.trim()
    if (!text || sending) return
    if (!currentUser) return
    setSending(true)
    setMessageInput('')
    inputRef.current?.focus()

    try {
      const sendRes = await sendWorkshopMessage(text, activePeer?.id ?? null)
      if (!sendRes.success) {
        setMessageInput(text)
      }
      const { data, error } = await getWorkshopMessages(activePeer?.id ?? null)
      if (!error) setMessages(data)
    } catch (error) {
      console.error('Error al enviar mensaje del taller:', error)
      setMessageInput(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-dashboard-surface">
      <div className="flex h-full w-full min-w-0 flex-1 flex-col gap-3 px-3 pb-2 pt-3 sm:gap-5 sm:px-6 sm:pb-4 sm:pt-4 lg:gap-8 lg:px-8 lg:pb-6 lg:pt-6 xl:px-10 2xl:px-12">
        <ModuleHeader
          icon={MessageSquare}
          title="CHAT TALLER PRO"
          eyebrow="COMUNICACION INTERNA DEL EQUIPO"
          description="Canal permanente para coordinar pendientes, entregas, diagnosticos y avisos internos del taller."
          badge="PRO"
          stats={[
            { label: 'Mensajes', value: loading ? '...' : formattedMessages.length, tone: 'blue' },
            { label: 'Canales', value: 1, tone: 'slate' },
            { label: 'Estado', value: 'Online', tone: 'emerald' },
          ]}
        />

        <ChatShell
          mobileView={mobileView}
          onBack={handleBack}
          sidebar={
            <ChatSidebar
              members={members}
              activePeerId={activePeer?.id ?? null}
              onSelectGeneral={() => void loadChannel(null)}
              onSelectPrivate={(member) => void loadChannel(member)}
            />
          }
          header={
            <ChatHeader
              currentUserName={currentUser?.name}
              modeLabel={activePeer ? `Chat privado con ${activePeer.name}` : "Canal general del taller"}
            />
          }
          messages={
            <>
              <MessageList loading={loading} messages={formattedMessages} isOwnMessage={isOwnMessage} />
              <div ref={messagesEndRef} />
            </>
          }
          input={
            <ChatInput
              value={messageInput}
              onChange={setMessageInput}
              onSend={sendMessage}
              inputRef={inputRef}
            />
          }
          footer={
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300">
              Comunicacion cifrada - canal interno activo
            </p>
          }
        />
      </div>
    </div>
  )
}
