'use client'

/** Static "Come funziona" panel rendered below the Lobby card. */
export const HowItWorks = () => (
  <div className="mt-6 figma-card-tight bg-white/95 p-4 text-sm text-muted-foreground">
    <p className="font-medium text-foreground mb-1">Come funziona</p>
    <ol className="list-decimal list-inside space-y-1">
      <li>Il <strong>Giocatore 1</strong> crea la stanza e carica immagini+nomi dei personaggi.</li>
      <li>Quando <strong>blocca la board</strong>, questa viene <strong>salvata automaticamente</strong> nella libreria.</li>
      <li>Il <strong>Giocatore 2</strong> entra con il codice: vede la stessa board.</li>
      <li>Ognuno sceglie in segreto un personaggio; poi a turno si fanno domande Sì/No.</li>
      <li>Si ribaltano le carte escluse; chi indovina per primo vince!</li>
    </ol>
  </div>
)
