import jsPDF from "jspdf";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority?: string;
  assigned_to?: string | null;
  notes?: string | null;
  vendor_id?: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

interface ExportOptions {
  tasks: Task[];
  vendors: Vendor[];
  weddingDate: string;
  partner1Name: string;
  partner2Name: string;
  includeCompleted?: boolean;
}

const getPriorityLabel = (priority?: string): string => {
  switch (priority) {
    case "must":
      return "Must Have";
    case "should":
      return "Should Have";
    case "could":
      return "Could Have";
    case "wont":
      return "Won't Have";
    default:
      return "Medium";
  }
};

const getOwnerLabel = (
  assignedTo: string | null | undefined,
  partner1Name: string,
  partner2Name: string
): string => {
  if (!assignedTo) return "Entrambi";
  if (assignedTo === "partner1") return partner1Name;
  if (assignedTo === "partner2") return partner2Name;
  return assignedTo;
};

export const generateChecklistPdf = ({
  tasks,
  vendors,
  weddingDate,
  partner1Name,
  partner2Name,
  includeCompleted = true,
}: ExportOptions): void => {
  const doc = new jsPDF();

  // Filter tasks
  const filteredTasks = includeCompleted
    ? tasks
    : tasks.filter((t) => t.status !== "completed");

  // Sort by due date, then by priority
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // First by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;

    // Then by priority
    const priorityOrder = { must: 0, should: 1, could: 2, wont: 3, medium: 2 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    return aPriority - bPriority;
  });

  // Header
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Checklist Matrimonio", 105, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`${partner1Name} & ${partner2Name}`, 105, 30, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Data matrimonio: ${format(new Date(weddingDate), "d MMMM yyyy", { locale: it })}`,
    105,
    38,
    { align: "center" }
  );
  doc.text(
    `Generato il: ${format(new Date(), "d MMMM yyyy", { locale: it })}`,
    105,
    45,
    { align: "center" }
  );

  // Stats box
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const overdue = tasks.filter(
    (t) => t.status === "pending" && t.due_date && new Date(t.due_date) < new Date()
  ).length;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, 52, 170, 25, 3, 3, "F");

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Riepilogo:", 25, 62);

  doc.setFont("helvetica", "normal");
  doc.text(`Totale: ${tasks.length}`, 60, 62);
  doc.text(`Completati: ${completed}`, 100, 62);
  doc.setTextColor(pending > 0 ? 200 : 0, pending > 0 ? 100 : 0, 0);
  doc.text(`In sospeso: ${pending}`, 145, 62);

  if (overdue > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`⚠ Scaduti: ${overdue}`, 25, 72);
  }

  // Progress bar
  const progressWidth = 160;
  const progressHeight = 4;
  const progressX = 25;
  const progressY = overdue > 0 ? 70 : 68;

  // Background
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(progressX, progressY, progressWidth, progressHeight, 2, 2, "F");

  // Progress
  if (completed > 0) {
    const completedWidth = (completed / tasks.length) * progressWidth;
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(progressX, progressY, completedWidth, progressHeight, 2, 2, "F");
  }

  // Tasks list
  let y = 90;

  doc.setDrawColor(200, 200, 200);
  doc.line(20, y - 5, 190, y - 5);

  sortedTasks.forEach((task, index) => {
    // Check if we need a new page
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const isCompleted = task.status === "completed";
    const isOverdue =
      task.status === "pending" &&
      task.due_date &&
      new Date(task.due_date) < new Date();

    // Checkbox
    doc.setDrawColor(150, 150, 150);
    doc.rect(20, y - 4, 5, 5);
    if (isCompleted) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 197, 94);
      doc.text("✓", 21, y);
    }

    // Title
    doc.setFont("helvetica", isCompleted ? "normal" : "bold");
    doc.setTextColor(isCompleted ? 150 : 0, isCompleted ? 150 : 0, isCompleted ? 150 : 0);
    const title = isCompleted ? task.title : task.title;
    doc.text(title, 30, y);

    // Priority badge
    const priorityLabel = getPriorityLabel(task.priority);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    let priorityColor: [number, number, number] = [100, 100, 100];
    if (task.priority === "must") priorityColor = [220, 38, 38];
    else if (task.priority === "should") priorityColor = [249, 115, 22];
    else if (task.priority === "could") priorityColor = [59, 130, 246];

    doc.setTextColor(...priorityColor);
    doc.text(`[${priorityLabel}]`, 150, y);

    y += 6;

    // Due date
    if (task.due_date) {
      doc.setFontSize(9);
      doc.setTextColor(isOverdue ? 220 : 100, isOverdue ? 38 : 100, isOverdue ? 38 : 100);
      const formattedDate = format(new Date(task.due_date), "d MMM yyyy", { locale: it });
      doc.text(`📅 ${formattedDate}${isOverdue ? " (SCADUTO)" : ""}`, 30, y);
    }

    // Owner
    if (task.assigned_to) {
      const owner = getOwnerLabel(task.assigned_to, partner1Name, partner2Name);
      doc.setTextColor(100, 100, 100);
      doc.text(`👤 ${owner}`, 90, y);
    }

    // Vendor
    if (task.vendor_id) {
      const vendor = vendors.find((v) => v.id === task.vendor_id);
      if (vendor) {
        doc.setTextColor(100, 100, 100);
        doc.text(`🏢 ${vendor.name}`, 130, y);
      }
    }

    y += 5;

    // Description
    if (task.description) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      const descLines = doc.splitTextToSize(task.description, 155);
      doc.text(descLines.slice(0, 2), 30, y);
      y += descLines.slice(0, 2).length * 4;
    }

    // Notes
    if (task.notes) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 150);
      const noteLines = doc.splitTextToSize(`📝 ${task.notes}`, 155);
      doc.text(noteLines.slice(0, 2), 30, y);
      y += noteLines.slice(0, 2).length * 4;
    }

    y += 8;
    doc.setFontSize(10);
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pagina ${i} di ${pageCount}`, 105, 290, { align: "center" });
    doc.text("Generato con WedsApp", 105, 295, { align: "center" });
  }

  doc.save(`checklist-matrimonio-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

/**
 * Export checklist to Excel-compatible CSV
 */
export const generateChecklistCsv = ({
  tasks,
  vendors,
  partner1Name,
  partner2Name,
}: Omit<ExportOptions, "weddingDate">): void => {
  const headers = [
    "Stato",
    "Titolo",
    "Descrizione",
    "Data Scadenza",
    "Priorità",
    "Assegnato a",
    "Fornitore",
    "Note",
  ];

  const rows = tasks.map((task) => {
    const vendor = task.vendor_id ? vendors.find((v) => v.id === task.vendor_id) : null;
    return [
      task.status === "completed" ? "Completato" : "In sospeso",
      task.title,
      task.description || "",
      task.due_date
        ? format(new Date(task.due_date), "dd/MM/yyyy", { locale: it })
        : "",
      getPriorityLabel(task.priority),
      getOwnerLabel(task.assigned_to, partner1Name, partner2Name),
      vendor?.name || "",
      task.notes || "",
    ];
  });

  const csvContent = [
    headers.join(";"),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `checklist-matrimonio-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
};
