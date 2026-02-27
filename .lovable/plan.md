

## Fix: Testo bianco non visibile sul sito pubblicato

### Causa del problema
Nel file `tailwind.config.ts`, i colori personalizzati sono definiti in `theme.colors` invece che in `theme.extend.colors`. Questo **sovrascrive completamente** la palette di default di Tailwind, eliminando colori fondamentali come `white`, `black`, `transparent`, `inherit`, `current`.

In development (preview) funziona grazie al JIT compiler che ha ancora accesso ai colori base, ma nel **build di produzione** le classi come `text-white`, `bg-white/10`, `border-white/10` non vengono generate correttamente.

### Soluzione
Spostare tutti i colori personalizzati da `theme.colors` a `theme.extend.colors`, e aggiungere esplicitamente i colori base mancanti.

### Modifiche

**`tailwind.config.ts`**
- Spostare l'intero blocco `colors` da `theme.colors` a `theme.extend.colors`
- Questo preserva i colori di default di Tailwind (`white`, `black`, `transparent`, `inherit`, `current`, `slate`, ecc.) e aggiunge i nostri colori personalizzati in cima

Stessa operazione per `backgroundImage`, `boxShadow`, `transitionProperty`, `borderRadius`, `keyframes`, `animation` che sono tutti nel livello `theme` invece che `theme.extend`, sovrascrivendo potenzialmente i default.

### Impatto
- Corregge `text-white` e tutte le utility con `white/black/transparent` su tutto il sito pubblicato
- Corregge il pannello sinistro della pagina `/auth` (testo bianco, cerchi decorativi, badge feature)
- Nessun impatto visivo sugli altri colori personalizzati gia in uso

### Dettagli tecnici

```text
PRIMA (tailwind.config.ts):
theme: {
  colors: { ... custom ... }    <-- sovrascrive TUTTI i default
  extend: {
    fontFamily: { ... }
  }
}

DOPO:
theme: {
  extend: {
    colors: { ... custom ... }  <-- aggiunge ai default
    fontFamily: { ... }
    backgroundImage: { ... }
    boxShadow: { ... }
    borderRadius: { ... }
    keyframes: { ... }
    animation: { ... }
  }
}
```

