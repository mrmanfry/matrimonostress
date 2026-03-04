

# Fix: Mostrare il nome del mittente nei messaggi Chat

## Problema

I messaggi nella chat non mostrano chi li ha inviati. Il campo `sender_name` nell'interfaccia `ChatMessageData` esiste ma non viene mai popolato: la query carica solo `messages.*` senza fare un join con la tabella `profiles`.

## Soluzione

### 1. Popolare `sender_name` nella query messaggi (`src/pages/Chat.tsx`)

Dopo il caricamento dei messaggi, fare una query batch su `profiles` per tutti i `sender_id` unici e mappare `first_name + last_name` su ogni messaggio.

Stesso fix va applicato a `src/pages/PlannerInbox.tsx` che ha lo stesso problema.

### 2. Mostrare sempre il sender per messaggi non propri (`src/pages/Chat.tsx`)

Cambiare la logica `showSender`: mostrare il nome del mittente su **tutti** i messaggi ricevuti (non solo in base al ruolo co_planner).

```text
Prima:  showSender={!isCoPlanner || msg.sender_id !== userId}
Dopo:   showSender={msg.sender_id !== userId}
```

### 3. Migliorare la UI del nome mittente (`src/components/chat/ChatMessage.tsx`)

Il nome attualmente e troppo piccolo (`text-[10px]` con `opacity-70`). Renderlo piu leggibile:
- Aumentare a `text-xs`
- Rimuovere `opacity-70`, usare `text-muted-foreground`
- Aggiungere un colore distintivo per differenziare i mittenti

## File da modificare

| File | Modifica |
|------|----------|
| `src/pages/Chat.tsx` | Fetch profili mittenti, popolare `sender_name`, fix `showSender` |
| `src/pages/PlannerInbox.tsx` | Stessa logica di fetch profili |
| `src/components/chat/ChatMessage.tsx` | Migliorare visibilita del nome mittente |

