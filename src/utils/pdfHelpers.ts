import jsPDF from "jspdf";

interface CateringGuest {
  first_name: string;
  last_name: string;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  notes: string | null;
  adults_count: number;
  children_count: number;
  is_child: boolean;
  table_name?: string;
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
 * Sezione 1: Riepilogo Numerico (Totali, Vegetariani, Vegani, Allergie)
 * Sezione 2: Tabella Ospiti con Dieta e Allergie
 * Sezione 3: Alert Allergie Evidenziati
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
  const totalGuests = guests.length;
  const totalAdults = guests.filter(g => !g.is_child).length;
  const totalChildren = guests.filter(g => g.is_child).length;
  const vegetarians = guests.filter(g => g.menu_choice === "vegetariano").length;
  const vegans = guests.filter(g => g.menu_choice === "vegano").length;
  const withAllergies = guests.filter(g => g.dietary_restrictions && g.dietary_restrictions.trim()).length;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  // Box con i totali
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y, 170, 50, "F");
  
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text(`Totale Ospiti: ${totalGuests}`, 30, y);
  
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.text(`• Adulti: ${totalAdults}`, 40, y);
  y += 7;
  doc.text(`• Bambini: ${totalChildren}`, 40, y);
  
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Preferenze Alimentari:", 30, y);
  
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(34, 139, 34); // Verde per vegetariani
  doc.text(`• Vegetariani: ${vegetarians}`, 40, y);
  y += 7;
  doc.setTextColor(0, 128, 0); // Verde scuro per vegani
  doc.text(`• Vegani: ${vegans}`, 40, y);
  y += 7;
  doc.setTextColor(220, 38, 38); // Rosso per allergie
  doc.text(`• Con Allergie/Intolleranze: ${withAllergies}`, 40, y);
  doc.setTextColor(0, 0, 0);
  
  // Sezione 2: Tabella Ospiti
  y += 20;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Lista Ospiti Dettagliata", 20, y);
  
  y += 10;
  doc.line(20, y, 190, y);
  y += 8;
  
  // Header tabella
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(230, 230, 230);
  doc.rect(20, y - 5, 170, 8, "F");
  doc.text("Nome", 25, y);
  doc.text("Tavolo", 85, y);
  doc.text("Dieta", 115, y);
  doc.text("Allergie", 145, y);
  
  y += 8;
  doc.setFont("helvetica", "normal");
  
  // Righe tabella
  guests.forEach((guest) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
      
      // Re-draw header
      doc.setFont("helvetica", "bold");
      doc.setFillColor(230, 230, 230);
      doc.rect(20, y - 5, 170, 8, "F");
      doc.text("Nome", 25, y);
      doc.text("Tavolo", 85, y);
      doc.text("Dieta", 115, y);
      doc.text("Allergie", 145, y);
      y += 8;
      doc.setFont("helvetica", "normal");
    }
    
    const fullName = `${guest.first_name} ${guest.last_name}`;
    const tableName = guest.table_name || "-";
    let diet = "-";
    
    if (guest.menu_choice === "vegetariano") {
      diet = "Vegetariano";
    } else if (guest.menu_choice === "vegano") {
      diet = "Vegano";
    }
    
    const allergies = guest.dietary_restrictions?.trim() || "-";
    
    // Tronca nomi lunghi
    const truncatedName = fullName.length > 25 ? fullName.substring(0, 22) + "..." : fullName;
    const truncatedAllergies = allergies.length > 20 ? allergies.substring(0, 17) + "..." : allergies;
    
    doc.text(truncatedName, 25, y);
    doc.text(tableName, 85, y);
    
    // Colora la dieta
    if (diet !== "-") {
      doc.setTextColor(34, 139, 34);
    }
    doc.text(diet, 115, y);
    doc.setTextColor(0, 0, 0);
    
    // Colora le allergie
    if (allergies !== "-") {
      doc.setTextColor(220, 38, 38);
    }
    doc.text(truncatedAllergies, 145, y);
    doc.setTextColor(0, 0, 0);
    
    y += 7;
  });
  
  // Sezione 3: Allergie in Evidenza
  const allergiesDetails = guests.filter(g => g.dietary_restrictions && g.dietary_restrictions.trim());
  
  if (allergiesDetails.length > 0) {
    y += 15;
    
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("⚠ ALLERGIE E INTOLLERANZE - ATTENZIONE CUCINA", 20, y);
    doc.setTextColor(0, 0, 0);
    
    y += 10;
    doc.line(20, y, 190, y);
    y += 10;
    
    doc.setFontSize(11);
    
    allergiesDetails.forEach(guest => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const fullName = `${guest.first_name} ${guest.last_name}`;
      doc.setFont("helvetica", "bold");
      doc.text(`${fullName}:`, 25, y);
      
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(guest.dietary_restrictions || "", 130);
      doc.text(lines, 70, y);
      y += lines.length * 6 + 4;
    });
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
