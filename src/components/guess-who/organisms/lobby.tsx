'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LogIn, Library } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { Input } from '@/components/guess-who/atoms/forms/input'
import { Label } from '@/components/guess-who/atoms/forms/label'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/guess-who/atoms/cards/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/guess-who/atoms/navigation/tabs'
import { toast } from 'sonner'
import { emitAck, useGuessWho, saveSession } from '@/hooks/use-guess-who'
import {
  GameModeOptions,
  RoomCodeBox,
  SavedBoardsTab,
  HowItWorks,
} from '@/components/guess-who/molecules/lobby'

export const Lobby = () => {
  const { socket, connected, setError } = useGuessWho()
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [useLives, setUseLives] = useState(true)
  const [roundMode, setRoundMode] = useState(false)
  const router = useRouter()

  // ?room=CODE auto-join: switch to "Entra" tab + pre-fill code, then clean the URL.
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('room') ? 'join' : 'create'
    }
    return 'create'
  })
  const [joinCode, setJoinCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const roomCode = params.get('room')
      if (roomCode) {
        window.history.replaceState({}, '', '/')
        return roomCode.toUpperCase()
      }
    }
    return ''
  })
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) { setNameError(true); return }
    if (!connected || !socket) {
      toast.error('Connessione al server non ancora pronta. Riprova tra un istante.')
      return
    }
    const res = await emitAck(socket, 'create-room', { name, useLives, roundMode })
    if (!res.ok) {
      toast.error(res.error || 'Errore creazione stanza')
      setError(res.error || null)
      return
    }
    saveSession(res.code!, name.trim() || 'Giocatore 1')
    setCreatedCode(res.code!)
    toast.success('Stanza creata! Condividi il codice con il Giocatore 2.')
    router.push(`?room=${res.code}`)
  }

  const handleJoin = async () => {
    if (!name.trim()) { setNameError(true); return }
    if (!connected || !socket) {
      toast.error('Connessione al server non ancora pronta. Riprova tra un istante.')
      return
    }
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      toast.error('Inserisci un codice valido')
      return
    }
    const res = await emitAck(socket, 'join-room', { code, name })
    if (!res.ok) {
      toast.error(res.error || 'Errore ingresso stanza')
      setError(res.error || null)
      return
    }
    saveSession(res.code!, name.trim() || 'Giocatore 2')
    toast.success('Sei entrato nella stanza!')
    router.push(`?room=${res.code}`)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <Card className="figma-card bg-white border-0 shadow-none">
        <CardHeader className="text-center pb-3">
          <img
            src="/logo.svg"
            alt="Indovina Chi"
            className="mx-auto h-28 sm:h-32 w-auto object-contain drop-shadow-lg"
          />
          <CardDescription className="text-sm mt-1">
            Crea personaggi dalle tue immagini e gioca in tempo reale con un amico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="create"><Plus className="h-4 w-4 mr-1" /> Crea</TabsTrigger>
              <TabsTrigger value="join"><LogIn className="h-4 w-4 mr-1" /> Entra</TabsTrigger>
              <TabsTrigger value="saved"><Library className="h-4 w-4 mr-1" /> Board salvate</TabsTrigger>
            </TabsList>

            {activeTab !== 'join' && (
              <GameModeOptions
                useLives={useLives}
                roundMode={roundMode}
                onUseLivesChange={setUseLives}
                onRoundModeChange={setRoundMode}
              />
            )}

            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Il tuo nome</Label>
                <Input
                  id="create-name"
                  placeholder="es. Alex"
                  value={name}
                  maxLength={20}
                  onChange={(e) => { setName(e.target.value); setNameError(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  className={nameError && !name.trim() ? 'border-destructive' : ''}
                />
                {nameError && !name.trim() && <p className="text-xs text-destructive mt-1">Inserisci il tuo nome</p>}
              </div>

              <Button onClick={handleCreate} className="w-full" size="lg" disabled={!connected}>
                <Plus className="h-4 w-4 mr-1" /> Crea stanza
              </Button>
              {createdCode && <RoomCodeBox code={createdCode} />}
              {!connected && (
                <p className="text-xs text-amber-600 text-center">Connessione al server in corso…</p>
              )}
            </TabsContent>

            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="join-name">Il tuo nome</Label>
                <Input
                  id="join-name"
                  placeholder="es. Sam"
                  value={name}
                  maxLength={20}
                  onChange={(e) => { setName(e.target.value); setNameError(false) }}
                  className={nameError && !name.trim() ? 'border-destructive' : ''}
                />
                {nameError && !name.trim() && <p className="text-xs text-destructive mt-1">Inserisci il tuo nome</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-code">Codice stanza</Label>
                <Input
                  id="join-code"
                  placeholder="es. AB3X9"
                  value={joinCode}
                  maxLength={6}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
                  className="font-mono text-lg tracking-widest uppercase"
                />
              </div>
              <Button onClick={handleJoin} className="w-full" size="lg" disabled={!connected || !joinCode.trim()}>
                <LogIn className="h-4 w-4 mr-1" /> Entra in partita
              </Button>
              {!connected && (
                <p className="text-xs text-amber-600 text-center">Connessione al server in corso…</p>
              )}
            </TabsContent>

            <TabsContent value="saved" className="mt-4">
              <SavedBoardsTab
                playerName={name}
                onNameChange={setName}
                useLives={useLives}
                roundMode={roundMode}
                connected={connected}
                onError={setError}
                onCreated={(code) => router.push(`?room=${code}`)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <HowItWorks />
    </div>
  )
}
