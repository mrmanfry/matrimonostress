// Template di task pre-generati con scadenze relative alla data del matrimonio
import { mapTemplateCategoryToMacro } from "@/lib/taskCategories";

export interface TaskTemplate {
  title: string;
  description: string;
  monthsBefore: number; // Mesi prima del matrimonio
  category?: string;
}

export const defaultTaskTemplates: TaskTemplate[] = [
  // 12+ Mesi Prima
  {
    title: "Annunciare il fidanzamento",
    description: "Condividere la notizia con famiglia e amici",
    monthsBefore: 12,
    category: "Inizio"
  },
  {
    title: "Scegliere la data del matrimonio",
    description: "Decidere la stagione e la data precisa",
    monthsBefore: 12,
    category: "Inizio"
  },
  {
    title: "Definire il budget totale",
    description: "Stabilire quanto spendere e come distribuire i costi",
    monthsBefore: 12,
    category: "Budget"
  },
  {
    title: "Stilare lista invitati preliminare",
    description: "Bozza iniziale con famiglia, amici stretti e colleghi",
    monthsBefore: 12,
    category: "Invitati"
  },
  {
    title: "Scegliere e prenotare la location",
    description: "Visitare almeno 3-4 location e firmare il contratto",
    monthsBefore: 11,
    category: "Location"
  },
  {
    title: "Scegliere lo stile del matrimonio",
    description: "Definire tema, colori e mood generale",
    monthsBefore: 11,
    category: "Stile"
  },
  
  // 10-9 Mesi Prima
  {
    title: "Prenotare il fotografo",
    description: "Confrontare portfolio e disponibilità",
    monthsBefore: 10,
    category: "Fornitori"
  },
  {
    title: "Prenotare il videomaker",
    description: "Verificare pacchetti e stile di ripresa",
    monthsBefore: 10,
    category: "Fornitori"
  },
  {
    title: "Scegliere il catering",
    description: "Degustazione menù e definizione servizio",
    monthsBefore: 9,
    category: "Catering"
  },
  {
    title: "Prenotare musicisti/DJ",
    description: "Concordare scaletta e orari",
    monthsBefore: 9,
    category: "Intrattenimento"
  },
  
  // 8-7 Mesi Prima
  {
    title: "Scegliere testimoni e damigelle",
    description: "Chiedere ufficialmente alle persone care",
    monthsBefore: 8,
    category: "Ruoli"
  },
  {
    title: "Iniziare ricerca abito sposa",
    description: "Prenotare appuntamenti in atelier",
    monthsBefore: 8,
    category: "Abbigliamento"
  },
  {
    title: "Prenotare il fiorista",
    description: "Definire bouquet, centrotavola e allestimenti",
    monthsBefore: 7,
    category: "Fornitori"
  },
  {
    title: "Prenotare trucco e parrucco",
    description: "Fare prova trucco e acconciatura",
    monthsBefore: 7,
    category: "Beauty"
  },
  
  // 6-5 Mesi Prima
  {
    title: "Ordinare partecipazioni",
    description: "Scegliere design e ordinare la stampa",
    monthsBefore: 6,
    category: "Comunicazione"
  },
  {
    title: "Scegliere abito sposo",
    description: "Acquisto o noleggio con prove",
    monthsBefore: 6,
    category: "Abbigliamento"
  },
  {
    title: "Prenotare viaggio di nozze",
    description: "Voli, hotel e attività",
    monthsBefore: 5,
    category: "Luna di Miele"
  },
  {
    title: "Ordinare bomboniere",
    description: "Scegliere il tipo e ordinare le quantità",
    monthsBefore: 5,
    category: "Bomboniere"
  },
  
  // 4-3 Mesi Prima
  {
    title: "Spedire le partecipazioni",
    description: "Inviare a tutti gli invitati con RSVP entro data",
    monthsBefore: 4,
    category: "Comunicazione"
  },
  {
    title: "Prenotare hotel per ospiti",
    description: "Bloccare camere per fuori sede",
    monthsBefore: 4,
    category: "Logistica"
  },
  {
    title: "Scegliere le fedi",
    description: "Acquisto e eventuale incisione",
    monthsBefore: 3,
    category: "Gioielli"
  },
  {
    title: "Organizzare addio al nubilato/celibato",
    description: "Coordinare con testimoni",
    monthsBefore: 3,
    category: "Eventi Pre-Matrimonio"
  },
  
  // 2 Mesi Prima
  {
    title: "Definire tableau de mariage",
    description: "Assegnare ospiti ai tavoli",
    monthsBefore: 2,
    category: "Disposizione"
  },
  {
    title: "Confermare RSVP definitivi",
    description: "Sollecitare chi non ha ancora risposto",
    monthsBefore: 2,
    category: "Invitati"
  },
  {
    title: "Scegliere menù finali",
    description: "Confermare portate e scelte alimentari ospiti",
    monthsBefore: 2,
    category: "Catering"
  },
  {
    title: "Ritiro abito sposa (ultima prova)",
    description: "Verificare vestibilità e ritirare",
    monthsBefore: 2,
    category: "Abbigliamento"
  },
  
  // 1 Mese Prima
  {
    title: "Creare playlist musicale",
    description: "Dare indicazioni a DJ/band su canzoni",
    monthsBefore: 1,
    category: "Intrattenimento"
  },
  {
    title: "Confermare numeri finali al catering",
    description: "Comunicare ospiti definitivi",
    monthsBefore: 1,
    category: "Catering"
  },
  {
    title: "Preparare cronoprogramma del giorno",
    description: "Timeline dettagliata con orari e responsabili",
    monthsBefore: 1,
    category: "Timeline"
  },
  {
    title: "Preparare kit d'emergenza",
    description: "Cucito, macchie, antidolorifici, ecc.",
    monthsBefore: 1,
    category: "Organizzazione"
  },
  
  // 2-1 Settimane Prima
  {
    title: "Prova generale trucco e capelli",
    description: "Ultimo test prima del giorno",
    monthsBefore: 0.5,
    category: "Beauty"
  },
  {
    title: "Confermare orari con tutti i fornitori",
    description: "Chiamata di verifica finale",
    monthsBefore: 0.5,
    category: "Coordinamento"
  },
  {
    title: "Preparare valigia per luna di miele",
    description: "Documenti, abbigliamento, accessori",
    monthsBefore: 0.25,
    category: "Luna di Miele"
  },
  {
    title: "Consegnare tableau e segnaposto",
    description: "Portare materiali alla location",
    monthsBefore: 0.25,
    category: "Disposizione"
  }
];

/**
 * Genera i task con le date effettive basate sulla data del matrimonio
 * Ora include anche la categoria mappata alla macro-area
 */
export function generateTasksForWedding(
  weddingDate: string,
  weddingId: string
): Array<{
  wedding_id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  is_system_generated: boolean;
  category: string;
}> {
  const weddingDateObj = new Date(weddingDate);
  
  return defaultTaskTemplates.map((template) => {
    // Calcola la data di scadenza sottraendo i mesi
    const dueDate = new Date(weddingDateObj);
    dueDate.setMonth(dueDate.getMonth() - Math.floor(template.monthsBefore));
    
    // Se monthsBefore è decimale (es. 0.5 = 2 settimane), gestisci i giorni
    const decimalPart = template.monthsBefore % 1;
    if (decimalPart > 0) {
      const daysToSubtract = Math.floor(decimalPart * 30);
      dueDate.setDate(dueDate.getDate() - daysToSubtract);
    }
    
    // Map template category to macro-area
    const macroCategory = mapTemplateCategoryToMacro(template.category);
    
    return {
      wedding_id: weddingId,
      title: template.title,
      description: template.description,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      is_system_generated: true,
      category: macroCategory
    };
  });
}
