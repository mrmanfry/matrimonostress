import jsPDF from "jspdf";

interface CateringGuest {
  first_name: string;
  last_name: string;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  notes: string | null;
  adults_count: number;
  children_count: number;
}

interface TableGuest {
  first_name: string;
  last_name: string;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  notes: string | null;
}

interface Table {
  name: string;
  capacity: number;
  guests: TableGuest[];
}

/**
 * Genera un report PDF professionale per il catering
 * Sezione 1: Riepilogo Numerico
 * Sezione 2: Note Speciali (allergie, esigenze)
 */
export const generateCateringReport = (guests: CateringGuest[]): void => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Report Riepilogo Catering", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generato il ${new Date().toLocaleDateString("it-IT")}`, 105, 28, { align: "center" });
  
  // Sezione 1: Riepilogo Numerico
  let y = 45;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Riepilogo Numerico", 20, y);
  
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 8;
  
  // Calcola totali
  const totalAdults = guests.reduce((sum, g) => sum + g.adults_count, 0);
  const totalChildren = guests.reduce((sum, g) => sum + g.children_count, 0);
  const totalCovers = totalAdults + totalChildren;
  
  const menuCounts: Record<string, number> = {};
  guests.forEach(g => {
    const menu = g.menu_choice || "Non specificato";
    menuCounts[menu] = (menuCounts[menu] || 0) + g.adults_count;
  });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  // Box con i totali
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y, 170, 60, "F");
  
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text(`Totale Coperti: ${totalCovers}`, 30, y);
  
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.text(`• Adulti: ${totalAdults}`, 40, y);
  
  y += 8;
  doc.text(`• Bambini: ${totalChildren}`, 40, y);
  
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Scelte di Menù:", 30, y);
  
  y += 8;
  doc.setFont("helvetica", "normal");
  Object.entries(menuCounts).forEach(([menu, count]) => {
    doc.text(`• ${menu}: ${count}`, 40, y);
    y += 8;
  });
  
  // Sezione 2: Note Speciali
  y += 15;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Note Speciali e Restrizioni", 20, y);
  
  y += 10;
  doc.line(20, y, 190, y);
  y += 10;
  
  // Raccogli allergie
  const allergies: string[] = [];
  const otherNotes: string[] = [];
  
  guests.forEach(g => {
    const fullName = `${g.first_name} ${g.last_name}`;
    
    if (g.dietary_restrictions) {
      const restrictions = g.dietary_restrictions.toLowerCase();
      if (restrictions.includes("allergi") || restrictions.includes("intolleran")) {
        allergies.push(`${fullName}: ${g.dietary_restrictions}`);
      } else {
        otherNotes.push(`${fullName}: ${g.dietary_restrictions}`);
      }
    }
    
    if (g.notes && g.notes.trim()) {
      otherNotes.push(`${fullName}: ${g.notes}`);
    }
  });
  
  doc.setFontSize(12);
  
  // Allergie e Intolleranze (in rosso per evidenza)
  if (allergies.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // Rosso
    doc.text("⚠ ALLERGIE E INTOLLERANZE:", 20, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    allergies.forEach(allergy => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const lines = doc.splitTextToSize(`• ${allergy}`, 170);
      doc.text(lines, 25, y);
      y += lines.length * 7;
    });
    
    y += 5;
  }
  
  // Altre Note
  if (otherNotes.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("ALTRE ESIGENZE:", 20, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    
    otherNotes.forEach(note => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const lines = doc.splitTextToSize(`• ${note}`, 170);
      doc.text(lines, 25, y);
      y += lines.length * 7;
    });
  }
  
  // Se non ci sono note speciali
  if (allergies.length === 0 && otherNotes.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("Nessuna nota speciale o restrizione alimentare segnalata.", 20, y);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Nozze Senza Stress - Report Catering", 105, 285, { align: "center" });
  
  doc.save(`report-catering-${new Date().toISOString().split("T")[0]}.pdf`);
};

/**
 * Genera un report PDF per la disposizione tavoli
 * Una pagina per ogni tavolo con lista ospiti e note menù
 */
export const generateTableReport = (tables: Table[]): void => {
  const doc = new jsPDF();
  
  tables.forEach((table, tableIndex) => {
    if (tableIndex > 0) {
      doc.addPage();
    }
    
    // Header del tavolo
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(table.name, 105, 25, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Capacità: ${table.guests.length} / ${table.capacity}`, 105, 35, { align: "center" });
    
    // Linea separatrice
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 40, 190, 40);
    
    let y = 55;
    
    if (table.guests.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("Nessun ospite assegnato a questo tavolo.", 105, y, { align: "center" });
    } else {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Lista Ospiti:", 20, y);
      y += 12;
      
      doc.setFontSize(11);
      
      table.guests.forEach((guest, index) => {
        if (y > 260) {
          doc.addPage();
          y = 30;
        }
        
        // Nome ospite
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${guest.first_name} ${guest.last_name}`, 25, y);
        y += 7;
        
        // Menù e note
        doc.setFont("helvetica", "normal");
        const details: string[] = [];
        
        if (guest.menu_choice) {
          details.push(`Menù: ${guest.menu_choice}`);
        }
        
        if (guest.dietary_restrictions) {
          doc.setTextColor(220, 38, 38);
          details.push(`⚠ ${guest.dietary_restrictions}`);
        }
        
        if (guest.notes) {
          details.push(`Note: ${guest.notes}`);
        }
        
        if (details.length > 0) {
          doc.setFontSize(9);
          details.forEach(detail => {
            const lines = doc.splitTextToSize(`   ${detail}`, 160);
            doc.text(lines, 30, y);
            y += lines.length * 5;
          });
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);
        }
        
        y += 8;
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Tavolo ${tableIndex + 1} di ${tables.length}`, 105, 285, { align: "center" });
  });
  
  doc.save(`disposizione-tavoli-${new Date().toISOString().split("T")[0]}.pdf`);
};
