'use client'

import { useState, useEffect, useRef } from 'react'
import { RotateCcw, Unlock } from 'lucide-react'
import confetti from 'canvas-confetti'
import { sounds } from '@/utils/sounds'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { emitAck, useGuessWho, useGuessWhoStore } from '@/hooks/use-guess-who'
import { toast } from 'sonner'
import { Character } from '@/lib/guess-who-types'
import { CharacterCard } from '@/components/guess-who/atoms/cards'
import {
  ResetButtons,
  ActionButtons,
  PlayerNameBadge,
  OpponentInfo,
  ConfirmGuessDialog,
  OpponentBoardModal,
  LivesPanel,
  SecretCardPanel,
  RoundScoreBadge,
  PhaseBanner,
} from '@/components/guess-who/molecules/game-board'

interface GameBoardProps {
  phase: 'picking' | 'playing' | 'ended'
}

export const GameBoard = ({ phase }: GameBoardProps) => {
  const {
    socket, room, isHost, opponent, me,
    iHavePicked, myExcluded, myExcludedThisTurn, opponentExcluded,
    myLives, opponentLives, playerColor, opponentColor,
    myTurn, matchWinner, iWonMatch, roundDoneButMatchNotOver,
  } = useGuessWho()
  const [submitting, setSubmitting] = useState(false)
  const [guessTarget, setGuessTarget] = useState<Character | null>(null)
  const [showOpponent, setShowOpponent] = useState(false)

  if (!room) return null

  const pick = (charId: string) => {
    if (!socket || !room) return
    useGuessWhoStore.getState().applyOptimisticPick(charId)
    sounds.playSelectSecret()
    emitAck(socket, 'pick-character', { code: room.code, charId }).then((res) => {
      if (!res.ok) {
        useGuessWhoStore.getState().applyOptimisticClearPick()
        toast.error(res.error || 'Errore scelta')
      }
    })
  }

  const unlockBoard = async () => {
    if (!socket || !room) return
    const res = await emitAck(socket, 'unlock-board', { code: room.code })
    if (!res.ok) toast.error(res.error || 'Errore')
  }

  const restartBuilder = async () => {
    if (!socket || !room) return
    const res = await emitAck(socket, 'restart-builder', { code: room.code })
    if (!res.ok) toast.error(res.error || 'Errore')
  }

  const playAgain = async () => {
    if (!socket || !room) return
    const res = await emitAck(socket, 'play-again', { code: room.code })
    if (!res.ok) toast.error(res.error || 'Errore')
  }

  const nextRound = async () => {
    if (!socket || !room) return
    const res = await emitAck(socket, 'next-round', { code: room.code })
    if (!res.ok) toast.error(res.error || 'Errore')
  }

  const passTurn = () => {
    if (!socket || !room) return
    const prevTurn = room.turn
    useGuessWhoStore.getState().applyOptimisticPassTurn()
    emitAck(socket, 'pass-turn', { code: room.code }).then((res) => {
      if (!res.ok && prevTurn) {
        useGuessWhoStore.getState().setRoom({ ...useGuessWhoStore.getState().room!, turn: prevTurn })
        toast.error(res.error || 'Errore')
      } else {
        sounds.playDing()
      }
    })
  }

  const toggleExclude = (charId: string) => {
    if (!socket || !room) return
    const willExclude = !myExcluded.includes(charId)
    useGuessWhoStore.getState().applyOptimisticExclude(charId, willExclude)
    sounds.playClick()
    emitAck(socket, 'toggle-exclude', { code: room.code, charId }).then((res) => {
      if (!res.ok) {
        useGuessWhoStore.getState().applyOptimisticExclude(charId, !willExclude)
        toast.error(res.error || 'Errore')
      }
    })
  }

  const resetExcludes = () => {
    if (!socket || !room) return
    useGuessWhoStore.getState().applyOptimisticResetAll()
    emitAck(socket, 'reset-all-excludes', { code: room.code }).then((res) => {
      if (!res.ok) toast.error(res.error || 'Errore')
    })
  }

  const resetTurnExcludes = () => {
    if (!socket || !room) return
    useGuessWhoStore.getState().applyOptimisticResetTurn()
    emitAck(socket, 'reset-turn-excludes', { code: room.code }).then((res) => {
      if (!res.ok) toast.error(res.error || 'Errore')
    })
  }

  const guessCharacter = (charId: string) => {
    if (!socket || !room) return
    if (!myTurn) { toast.error('Non è il tuo turno'); return }
    setGuessTarget(null)
    setSubmitting(true)
    emitAck<{ correct?: boolean; livesLeft?: number }>(socket, 'guess-character', { code: room.code, charId }).then((res) => {
      setSubmitting(false)
      if (!res.ok) { toast.error(res.error || 'Errore'); return }
      if (res.correct) sounds.playCorrect()
      else {
        sounds.playWrong()
        if (!room.useLives) toast.error('Sbagliato! Hai perso il round.')
      }
    })
  }

  const mySecretId = room.mySecretPick
  const mySecretChar = room.characters.find((c) => c.id === mySecretId) ?? null
  const characters = room.characters

  const reveals = room.chatLog.filter((m) => m.type === 'reveal')
  const revealMap: Record<string, string> = {}
  for (const r of reveals) {
    const match = r.content.match(/:\s*(.+)$/)
    const charName = match?.[1]?.trim()
    const ch = characters.find((c) => c.name === charName)
    if (ch) revealMap[ch.id] = r.playerName
  }
  const winnerId = room.winner
  const opponentSecretName = phase === 'ended' && opponent
    ? reveals.find((reveal) => reveal.playerId === opponent.id)?.content.match(/:\s*(.+)$/)?.[1]?.trim()
    : undefined
  const opponentSecretCharId = opponentSecretName
    ? characters.find((character) => character.name === opponentSecretName)?.id
    : undefined

  const pickable = phase === 'picking' && !iHavePicked
  const startingLives = room.startingLives || 3
  const myRoundWins = room.roundWins[room.myId] ?? 0
  const oppRoundWins = room.roundWins[opponent?.id ?? ''] ?? 0

  return (
    <div className="w-full grid gap-4 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
      {/* LEFT: the board grid */}
      <div className="figma-card-tight relative bg-white/15 backdrop-blur-sm p-3 sm:p-4">
        {me && <PlayerNameBadge name={me.name} />}

        {/* header row */}
        <div className="flex flex-wrap items-center justify-end gap-2 mb-3 px-1">
          <div className="flex items-center gap-2">
            {room.roundMode && (
              <RoundScoreBadge
                currentRound={room.currentRound}
                myRoundWins={myRoundWins}
                oppRoundWins={oppRoundWins}
              />
            )}
          </div>
        </div>

        <PhaseBanner
          phase={phase}
          iHavePicked={iHavePicked}
          myTurn={myTurn}
          matchWinner={!!matchWinner}
          iWonMatch={iWonMatch}
          winnerId={winnerId}
          myId={room.myId}
          opponentName={opponent?.name}
          currentRound={room.currentRound}
        />

        {/* the card grid */}
        <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-center">
          {characters.map((c) => {
            const isMySecret = c.id === mySecretId
            const isExcluded = myExcluded.includes(c.id)
            const isRevealed = !!revealMap[c.id]
            const isWinnerReveal = phase === 'ended' && isRevealed && reveals.some((r) => r.playerId === winnerId && r.content.includes(c.name))
            const canGuess = phase === 'playing' && myTurn
            return (
              <CharacterCard
                key={c.id}
                character={c}
                playerColor={playerColor}
                excluded={phase === 'playing' && isExcluded}
                selected={isMySecret}
                isMySecret={isMySecret}
                winnerReveal={isWinnerReveal}
                faceDown={phase === 'ended' && c.id !== opponentSecretCharId}
                pickHint={pickable}
                guessable={canGuess}
                disabled={phase === 'ended' || (phase === 'picking' && iHavePicked) || submitting}
                onClick={
                  pickable
                    ? () => pick(c.id)
                    : phase === 'playing'
                      ? () => toggleExclude(c.id)
                      : undefined
                }
                onGuess={
                  canGuess
                    ? () => setGuessTarget(c)
                    : undefined
                }
                onContextMenu={
                  canGuess
                    ? (e) => {
                        e.preventDefault()
                        setGuessTarget(c)
                      }
                    : undefined
                }
              />
            )
          })}
        </div>

        {/* footer actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 mt-3 px-1">
          <div className="flex gap-2">
            {phase === 'picking' && iHavePicked && (
              <Button size="sm" variant="secondary" onClick={unlockBoard}>
                <Unlock className="h-3.5 w-3.5 mr-1" /> Riprendi scelta
              </Button>
            )}
            {phase === 'playing' && (
              <ResetButtons
                turnCount={myExcludedThisTurn.length}
                onResetAll={resetExcludes}
                onResetTurn={resetTurnExcludes}
              />
            )}
            {phase === 'ended' && isHost && (
              <Button size="sm" variant="secondary" onClick={restartBuilder}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Nuova board
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: lives + secret character panel */}
      <aside className="figma-card-tight bg-white/15 backdrop-blur-sm p-3 sm:p-4 flex flex-col">
        <div className="pt-4">
          <LivesPanel
            useLives={room.useLives}
            startingLives={startingLives}
            myLives={myLives}
            phase={phase}
            matchWinner={!!matchWinner}
            iWonMatch={iWonMatch}
            winnerId={winnerId}
            myId={room.myId}
          />

          <SecretCardPanel
            mySecretChar={mySecretChar}
            playerColor={playerColor}
            phase={phase}
            iHavePicked={iHavePicked}
          />

          {opponent && (
            <OpponentInfo
              opponent={opponent}
              startingLives={startingLives}
              opponentLives={opponentLives}
              useLives={room.useLives}
              phase={phase}
              isOpponentTurn={room.turn === opponent.id}
              bothPicked={room.bothPicked}
            />
          )}

          <ActionButtons
            phase={phase}
            myTurn={myTurn}
            submitting={submitting}
            roundDoneButMatchNotOver={roundDoneButMatchNotOver}
            matchWinner={!!matchWinner}
            isHost={isHost}
            onShowOpponent={() => setShowOpponent(true)}
            onPassTurn={passTurn}
            onNextRound={nextRound}
            onPlayAgain={playAgain}
            onRestartBuilder={restartBuilder}
          />
        </div>

      </aside>

      <ConfirmGuessDialog
        character={guessTarget}
        submitting={submitting}
        useLives={room.useLives}
        myLives={myLives}
        startingLives={startingLives}
        roundMode={room.roundMode}
        currentRound={room.currentRound}
        onConfirm={() => { if (guessTarget) guessCharacter(guessTarget.id) }}
        onCancel={() => setGuessTarget(null)}
      />

      <OpponentBoardModal
        open={showOpponent}
        onClose={() => setShowOpponent(false)}
        opponentName={opponent?.name ?? 'Avversario'}
        characters={characters}
        opponentExcluded={opponentExcluded}
        opponentColor={opponentColor}
      />

      {iWonMatch && matchWinner && <ConfettiAndSound matchWinner={matchWinner} />}
      {phase === 'ended' && <FlipSound roomCode={room.code} />}
    </div>
  )
}

const ConfettiAndSound = ({ matchWinner }: { matchWinner: string }) => {
  useEffect(() => {
    sounds.playWin()
    const colors = ['#FF6E6E', '#6ED8FF', '#FFD200', '#ffffff']
    confetti({ particleCount: 50, spread: 70, origin: { x: 0 }, colors })
    confetti({ particleCount: 50, spread: 70, origin: { x: 1 }, colors })
  }, [matchWinner])
  return null
}

const FlipSound = ({ roomCode }: { roomCode: string }) => {
  const played = useRef(false)
  useEffect(() => {
    if (played.current) return
    played.current = true
    sounds.playFlip()
  }, [roomCode])
  return null
}
