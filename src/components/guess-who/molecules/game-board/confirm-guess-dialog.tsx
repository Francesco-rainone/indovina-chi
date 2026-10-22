'use client'

import { Trophy } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/guess-who/atoms/dialogs/alert-dialog'
import { Character } from '@/lib/guess-who-types'

interface ConfirmGuessDialogProps {
  character: Character | null
  submitting: boolean
  useLives: boolean
  myLives: number
  startingLives: number
  roundMode: boolean
  currentRound: number
  onConfirm: () => void
  onCancel: () => void
}

/** "Indovina X?" confirmation dialog (right-click on a card during my turn). */
export const ConfirmGuessDialog = ({
  character,
  submitting,
  useLives,
  myLives,
  startingLives,
  roundMode,
  currentRound,
  onConfirm,
  onCancel,
}: ConfirmGuessDialogProps) => (
  <AlertDialog open={!!character} onOpenChange={(o) => { if (!o) onCancel() }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[var(--color-p1)]" />
          Indovina {character?.name}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          {useLives
            ? `Se sbagli perdi 1 vita (ti rimangono ${myLives - 1}/${startingLives}). Se arrivi a 0 vince l'avversario. Se azzecca, vinci il round${roundMode ? ' (round ' + currentRound + '/3)' : ''}.`
            : `Se sbagli perdi immediatamente il round${roundMode ? ' (round ' + currentRound + '/3)' : ''}. Se azzecca, vinci.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={submitting}>Annulla</AlertDialogCancel>
        <AlertDialogAction
          disabled={submitting}
          onClick={onConfirm}
          className="bg-[var(--color-p1)] text-white hover:bg-[var(--color-p1)]/90"
        >
          Conferma
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
