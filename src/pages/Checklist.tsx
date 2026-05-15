import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Calendar as CalendarIcon, Sparkles, MessageSquare, StickyNote, Phone, Mail,
  Link2, X, CalendarPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChecklistExportMenu } from "@/components/checklist/ChecklistExportMenu";
import { ContactVendorWizard } from "@/components/checklist/ContactVendorWizard";
import { OwnerSelector } from "@/components/checklist/OwnerSelector";
import { PaymentLinkSelector } from "@/components/checklist/PaymentLinkSelector";
import { TaskDependencySelector } from "@/components/checklist/TaskDependencySelector";
import { PaymentSyncDialog } from "@/components/checklist/PaymentSyncDialog";
import { BlockedTaskWarning } from "@/components/checklist/BlockedTaskWarning";
import { FollowUpDialog, FollowUpData } from "@/components/checklist/FollowUpDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  MACRO_CATEGORIES, inferCategoryFromTitle, mapVendorCategoryToMacro, TaskMacroCategory,
} from "@/lib/taskCategories";
import {
  PaperRoot, ChkHeader, AttentionBlock, FilterBar, ListView, CategoryView, CalendarView,
  TaskDetailDrawer, paperGhostBtn,
} from "@/components/checklist/v2/ChecklistPaperUI";
import { daysUntil, relDue } from "@/components/checklist/v2/paper-tokens";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  is_system_generated: boolean;
  created_at: string;
  vendor_id: string | null;
  wedding_id: string;
  priority?: string;
  notes?: string | null;
  assigned_to?: string | null;
  blocked_by_task_id?: string | null;
  linked_payment_id?: string | null;
  category?: string | null;
  delegated_by_user_id?: string | null;
  delegated_at?: string | null;
  completed_at?: string | null;
  completed_by_user_id?: string | null;
}
interface Payment { id: string; description: string; amount: number; status: string; expense_item?: { vendor?: { name: string } | null } | null; }
interface Vendor { id: string; name: string; phone: string | null; email: string | null; category_id: string | null; category?: { name: string } | null; }
interface Wedding { id: string; wedding_date: string; partner1_name: string; partner2_name: string; }

const Checklist = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ first_name: string | null; wedding_role: string | null } | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "category">("list");

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [contactVendorTask, setContactVendorTask] = useState<Task | null>(null);
  const [tempNotes, setTempNotes] = useState("");

  const [newTask, setNewTask] = useState({
    title: "", description: "", due_date: "", vendor_id: "",
    priority: "medium", notes: "", assigned_to: "both",
    category: "altro" as TaskMacroCategory,
  });

  const [paymentSyncDialog, setPaymentSyncDialog] = useState<{ open: boolean; taskId: string; payment: Payment | null }>({ open: false, taskId: "", payment: null });
  const [blockedWarning, setBlockedWarning] = useState<{ open: boolean; taskId: string; blockingTaskTitle: string }>({ open: false, taskId: "", blockingTaskTitle: "" });
  const [followUpDialog, setFollowUpDialog] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });

  useEffect(() => { loadData(); }, []);

  // Deep linking via ?task_id=
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get("task_id");
    if (taskId && !loading && tasks.length > 0) {
      setOpenTaskId(taskId);
    }
  }, [loading, tasks]);

  // Sync notes draft when drawer opens
  useEffect(() => {
    if (openTaskId) {
      const t = tasks.find((x) => x.id === openTaskId);
      setTempNotes(t?.notes || "");
    }
  }, [openTaskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from("profiles").select("first_name, wedding_role").eq("id", user.id).single();
      setUserProfile(profileData);
      const { data: roleData } = await supabase.from("user_roles").select("wedding_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (!roleData?.wedding_id) return;
      const { data: weddingData } = await supabase.from("weddings").select("id, wedding_date, partner1_name, partner2_name").eq("id", roleData.wedding_id).single();
      if (!weddingData) return;
      setWedding(weddingData);
      const { data: tasksData } = await supabase.from("checklist_tasks").select("*").eq("wedding_id", weddingData.id).order("due_date", { ascending: true, nullsFirst: false });
      setTasks(tasksData || []);
      const { data: vendorsData } = await supabase.from("vendors").select(`id, name, phone, email, category_id, category:expense_categories(name)`).eq("wedding_id", weddingData.id).order("name");
      setVendors(vendorsData || []);
    } catch (e) {
      console.error("Error loading checklist:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
    }
    if (filterCategory !== "all") {
      list = list.filter((t) => (t.category || "altro") === filterCategory);
    }
    if (filterStatus === "pending") list = list.filter((t) => t.status === "pending");
    else if (filterStatus === "completed") list = list.filter((t) => t.status === "completed");
    else if (filterStatus === "overdue") list = list.filter((t) => t.status !== "completed" && relDue(t.due_date).kind === "overdue");

    list.sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return ad - bd;
    });
    return list;
  }, [tasks, searchQuery, filterCategory, filterStatus]);

  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter((t) => t.status === "completed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter((t) => t.status !== "completed" && t.due_date && (daysUntil(t.due_date) ?? 0) < 0).length,
    active: tasks.filter((t) => t.status !== "completed").length,
  }), [tasks]);

  const attentionTasks = useMemo(
    () => tasks.filter((t) => t.status !== "completed" && relDue(t.due_date).kind === "overdue"),
    [tasks],
  );

  const vendorMap = useMemo(() => {
    const m = new Map<string, string>();
    vendors.forEach((v) => m.set(v.id, v.name));
    return m;
  }, [vendors]);

  const isTaskBlocked = (task: Task): boolean => {
    if (!task.blocked_by_task_id) return false;
    const blockingTask = tasks.find((t) => t.id === task.blocked_by_task_id);
    return blockingTask ? blockingTask.status !== "completed" : false;
  };

  /* ─── Mutations (preserved from previous implementation) ─── */
  const toggleTaskStatus = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const currentStatus = task.status;

    if (currentStatus === "pending" && task.blocked_by_task_id) {
      const blockingTask = tasks.find((t) => t.id === task.blocked_by_task_id);
      if (blockingTask && blockingTask.status !== "completed") {
        setBlockedWarning({ open: true, taskId, blockingTaskTitle: blockingTask.title });
        return;
      }
    }
    if (currentStatus === "pending" && task.linked_payment_id) {
      const { data: paymentData } = await supabase
        .from("payments")
        .select(`id, description, amount, status, expense_item:expense_items(vendor:vendors(name))`)
        .eq("id", task.linked_payment_id)
        .single();
      if (paymentData && paymentData.status !== "Pagato") {
        setPaymentSyncDialog({ open: true, taskId, payment: paymentData });
        return;
      }
    }
    await completeToggleTask(taskId, currentStatus);
  };

  const completeToggleTask = async (taskId: string, currentStatus: string, alsoMarkPayment = false) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const task = tasks.find((t) => t.id === taskId);
    const { data: { user } } = await supabase.auth.getUser();
    const updatePayload: any = { status: newStatus };
    if (newStatus === "completed") {
      updatePayload.completed_at = new Date().toISOString();
      updatePayload.completed_by_user_id = user?.id || null;
    } else {
      updatePayload.completed_at = null;
      updatePayload.completed_by_user_id = null;
    }
    const { error } = await supabase.from("checklist_tasks").update(updatePayload).eq("id", taskId);
    if (error) { toast({ title: "Errore", description: "Impossibile aggiornare il task", variant: "destructive" }); return; }

    if (alsoMarkPayment && task?.linked_payment_id && newStatus === "completed") {
      const { error: paymentError } = await supabase.from("payments").update({ status: "Pagato", paid_on_date: new Date().toISOString().split("T")[0] }).eq("id", task.linked_payment_id);
      if (paymentError) toast({ title: "Attenzione", description: "Task completato, ma errore nel segnare il pagamento", variant: "destructive" });
      else if (task) showFollowUpToast(task);
    } else if (newStatus === "completed" && task) {
      showFollowUpToast(task);
    } else {
      toast({ title: "Ripristinato", description: "Task rimesso in sospeso" });
    }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  const showFollowUpToast = (task: Task) => {
    toast({
      title: "Task completato!",
      description: (
        <div className="flex flex-col gap-3 mt-2">
          <span className="text-sm text-muted-foreground">Vuoi programmare un follow-up?</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {}} className="flex-1">
              <X className="h-3 w-3 mr-1" />No, grazie
            </Button>
            <Button size="sm" onClick={() => setFollowUpDialog({ open: true, task })} className="flex-1">
              <CalendarPlus className="h-3 w-3 mr-1" />Sì, crea
            </Button>
          </div>
        </div>
      ),
      duration: 8000,
    });
  };

  const handleCreateFollowUp = async (followUpData: FollowUpData) => {
    if (!wedding) return;
    const { data, error } = await supabase.from("checklist_tasks").insert({
      wedding_id: wedding.id, title: followUpData.title, description: followUpData.description || null,
      due_date: followUpData.due_date || null, vendor_id: followUpData.vendor_id, status: "pending",
      priority: "medium", assigned_to: followUpData.assigned_to, blocked_by_task_id: followUpData.parent_task_id,
    }).select().single();
    if (error) { toast({ title: "Errore", description: "Impossibile creare il follow-up", variant: "destructive" }); return; }
    setTasks((prev) => [...prev, data]);
    toast({ title: "Follow-up creato!", description: `"${followUpData.title}" aggiunto alla checklist` });
  };

  const handlePaymentSyncConfirm = () => {
    const { taskId } = paymentSyncDialog;
    setPaymentSyncDialog({ open: false, taskId: "", payment: null });
    completeToggleTask(taskId, "pending", true);
  };
  const handlePaymentSyncSkip = () => {
    const { taskId } = paymentSyncDialog;
    setPaymentSyncDialog({ open: false, taskId: "", payment: null });
    completeToggleTask(taskId, "pending", false);
  };
  const handleBlockedWarningConfirm = () => {
    const { taskId } = blockedWarning;
    setBlockedWarning({ open: false, taskId: "", blockingTaskTitle: "" });
    completeToggleTask(taskId, "pending", false);
  };

  const updateField = async (taskId: string, patch: Partial<Task>, successMsg?: string) => {
    const { error } = await supabase.from("checklist_tasks").update(patch).eq("id", taskId);
    if (error) { toast({ title: "Errore", description: "Impossibile aggiornare il task", variant: "destructive" }); return; }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    if (successMsg) toast({ title: "Salvato", description: successMsg });
  };

  const updateTaskPriority = (taskId: string, priority: string) => updateField(taskId, { priority });
  const updateTaskOwner = (taskId: string, assigned_to: string) => updateField(taskId, { assigned_to: assigned_to === "both" ? null : assigned_to });
  const updateTaskDueDate = (taskId: string, dueDate: string | null) => updateField(taskId, { due_date: dueDate }, dueDate ? `Nuova scadenza: ${new Date(dueDate).toLocaleDateString("it-IT")}` : "Scadenza rimossa");
  const updateTaskPaymentLink = (taskId: string, paymentId: string | null) => updateField(taskId, { linked_payment_id: paymentId }, paymentId ? "Task collegato al pagamento" : "Collegamento rimosso");
  const updateTaskDependency = (taskId: string, blockedByTaskId: string | null) => updateField(taskId, { blocked_by_task_id: blockedByTaskId }, blockedByTaskId ? "Dipendenza aggiunta" : "Dipendenza rimossa");
  const updateTaskVendor = async (taskId: string, vendorId: string | null) => {
    const task = tasks.find((t) => t.id === taskId);
    let newCategory = task?.category;
    if (vendorId) {
      const v = vendors.find((x) => x.id === vendorId);
      newCategory = mapVendorCategoryToMacro(v?.category?.name);
    }
    await updateField(taskId, { vendor_id: vendorId, category: newCategory }, vendorId ? "Fornitore collegato" : "Fornitore rimosso");
  };

  const saveNotes = async () => {
    if (!openTaskId) return;
    await updateField(openTaskId, { notes: tempNotes || null }, "Note aggiornate");
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("checklist_tasks").delete().eq("id", taskId);
    if (error) { toast({ title: "Errore", description: "Impossibile eliminare il task", variant: "destructive" }); return; }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setOpenTaskId(null);
    toast({ title: "Eliminato", description: "Task rimosso dalla checklist" });
  };

  const addTask = async () => {
    if (!newTask.title.trim() || !wedding) {
      toast({ title: "Errore", description: "Inserisci almeno un titolo per il task", variant: "destructive" });
      return;
    }
    let taskCategory: TaskMacroCategory = newTask.category;
    if (newTask.category === "altro") {
      const selectedVendorId = newTask.vendor_id === "none" ? null : newTask.vendor_id;
      if (selectedVendorId) {
        const v = vendors.find((x) => x.id === selectedVendorId);
        taskCategory = mapVendorCategoryToMacro(v?.category?.name);
      } else {
        taskCategory = inferCategoryFromTitle(newTask.title);
      }
    }
    const isPlanner = authState.status === "authenticated" && authState.activeRole === "planner";
    const currentUserId = authState.status === "authenticated" ? authState.user.id : null;

    const insertPayload: any = {
      wedding_id: wedding.id, title: newTask.title, description: newTask.description || null,
      due_date: newTask.due_date || null,
      vendor_id: newTask.vendor_id === "none" ? null : newTask.vendor_id || null,
      status: "pending", priority: newTask.priority, notes: newTask.notes || null,
      assigned_to: newTask.assigned_to === "both" ? null : newTask.assigned_to,
      category: taskCategory,
    };
    if (isPlanner && currentUserId) {
      insertPayload.delegated_by_user_id = currentUserId;
      insertPayload.delegated_at = new Date().toISOString();
    }
    const { data, error } = await supabase.from("checklist_tasks").insert(insertPayload).select().single();
    if (error) { toast({ title: "Errore", description: "Impossibile creare il task", variant: "destructive" }); return; }
    setTasks((prev) => [...prev, data]);

    if (isPlanner && currentUserId && data.id) {
      const dueDateLabel = newTask.due_date ? format(new Date(newTask.due_date), "d MMMM yyyy", { locale: it }) : "nessuna scadenza";
      supabase.from("messages").insert({
        wedding_id: wedding.id, sender_id: currentUserId,
        content: `📋 Ti ho assegnato un nuovo task: "${newTask.title}" — scadenza: ${dueDateLabel}`,
        visibility: "all", message_type: "system", system_action_type: "task_created", system_action_ref_id: data.id,
      }).then(({ error: msgErr }) => { if (msgErr) console.warn("[Bridge] Failed to insert system message:", msgErr); });
    }

    setNewTask({ title: "", description: "", due_date: "", vendor_id: "", priority: "medium", notes: "", assigned_to: "both", category: "altro" });
    setAddTaskOpen(false);
    toast({ title: "Creato!", description: "Nuovo task aggiunto alla checklist" });
  };

  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) || null : null;
  const openTaskVendor = openTask?.vendor_id ? vendors.find((v) => v.id === openTask.vendor_id) : null;
  const blockingTask = openTask?.blocked_by_task_id ? tasks.find((t) => t.id === openTask.blocked_by_task_id) : null;

  if (loading) {
    return (
      <div style={{ background: "hsl(var(--paper-bg))", padding: "30px 38px", minHeight: "100%" }}>
        <p style={{ color: "hsl(var(--paper-ink-3))" }}>Caricamento…</p>
      </div>
    );
  }

  return (
    <PaperRoot>
      <ChkHeader
        stats={{ total: stats.total, done: stats.done, active: stats.active, overdue: stats.overdue }}
        view={viewMode}
        setView={setViewMode}
        search={searchQuery}
        setSearch={setSearchQuery}
        onNew={() => setAddTaskOpen(true)}
        exportSlot={
          wedding ? (
            <div style={{ display: "inline-flex" }}>
              <ChecklistExportMenu
                tasks={tasks as any}
                vendors={vendors as any}
                weddingDate={wedding.wedding_date}
                partner1Name={wedding.partner1_name}
                partner2Name={wedding.partner2_name}
              />
            </div>
          ) : null
        }
      />

      <AttentionBlock tasks={attentionTasks as any} onOpenTask={setOpenTaskId} />

      {viewMode === "list" && (
        <>
          <FilterBar
            status={filterStatus} setStatus={setFilterStatus}
            area={filterCategory} setArea={setFilterCategory}
            count={filteredTasks.length}
          />
          <ListView
            tasks={filteredTasks as any}
            vendorMap={vendorMap}
            partner1={wedding?.partner1_name} partner2={wedding?.partner2_name}
            onToggle={toggleTaskStatus}
            onOpen={setOpenTaskId}
          />
        </>
      )}

      {viewMode === "category" && (
        <>
          <FilterBar
            status={filterStatus} setStatus={setFilterStatus}
            area={filterCategory} setArea={setFilterCategory}
            count={filteredTasks.length}
          />
          <CategoryView
            allTasks={tasks as any}
            filteredTasks={filteredTasks as any}
            vendorMap={vendorMap}
            partner1={wedding?.partner1_name} partner2={wedding?.partner2_name}
            onToggle={toggleTaskStatus}
            onOpen={setOpenTaskId}
          />
        </>
      )}

      {viewMode === "calendar" && (
        <CalendarView tasks={tasks as any} onOpen={setOpenTaskId} />
      )}

      {/* Task drawer */}
      <TaskDetailDrawer
        task={openTask as any}
        vendorName={openTaskVendor?.name || null}
        vendorCategory={openTaskVendor?.category?.name || null}
        blockingTaskTitle={blockingTask?.title || null}
        blockingResolved={blockingTask ? blockingTask.status === "completed" : false}
        onClose={() => setOpenTaskId(null)}
        onToggle={toggleTaskStatus}
        expandedControls={
          openTask && wedding ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Priorità</Label>
                  <Select value={openTask.priority || "medium"} onValueChange={(v) => updateTaskPriority(openTask.id, v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">🔴 Alta</SelectItem>
                      <SelectItem value="medium">🟡 Media</SelectItem>
                      <SelectItem value="low">🟢 Bassa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Assegnato a</Label>
                  <OwnerSelector value={openTask.assigned_to || "both"} onChange={(v) => updateTaskOwner(openTask.id, v)} partner1Name={wedding.partner1_name} partner2Name={wedding.partner2_name} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fornitore</Label>
                  <Select
                    value={openTask.vendor_id || "none"}
                    onValueChange={(v) => updateTaskVendor(openTask.id, v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="Nessun fornitore" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessun fornitore</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} {v.category?.name && `(${v.category.name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Scadenza</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("h-9 w-full justify-start text-left font-normal", !openTask.due_date && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {openTask.due_date ? format(new Date(openTask.due_date), "d MMMM yyyy", { locale: it }) : "Nessuna scadenza"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={openTask.due_date ? new Date(openTask.due_date) : undefined}
                        onSelect={(date) => updateTaskDueDate(openTask.id, date ? format(date, "yyyy-MM-dd") : null)}
                        initialFocus locale={it}
                        className={cn("p-3 pointer-events-auto")}
                      />
                      {openTask.due_date && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => updateTaskDueDate(openTask.id, null)}>
                            <X className="w-4 h-4 mr-2" />Rimuovi scadenza
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <PaymentLinkSelector weddingId={wedding.id} currentPaymentId={openTask.linked_payment_id || null} onLink={(pid) => updateTaskPaymentLink(openTask.id, pid)} />

              <TaskDependencySelector currentTaskId={openTask.id} blockedByTaskId={openTask.blocked_by_task_id || null} allTasks={tasks as any} onUpdate={(b) => updateTaskDependency(openTask.id, b)} />

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" />Note</Label>
                <Textarea value={tempNotes} onChange={(e) => setTempNotes(e.target.value)} placeholder="Aggiungi note, link, dettagli..." rows={3} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveNotes}>Salva note</Button>
                </div>
              </div>

              {openTaskVendor && (
                <div className="pt-3 border-t">
                  <Label className="text-xs text-muted-foreground">Azioni rapide fornitore</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {openTaskVendor.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${openTaskVendor.phone}`}><Phone className="w-4 h-4 mr-2" />Chiama</a>
                      </Button>
                    )}
                    {openTaskVendor.email && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${openTaskVendor.email}`}><Mail className="w-4 h-4 mr-2" />Email</a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setContactVendorTask(openTask)}>
                      <MessageSquare className="w-4 h-4 mr-2" />Messaggio AI
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/app/vendors/${openTaskVendor.id}`)}>
                      <Link2 className="w-4 h-4 mr-2" />Apri scheda
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-between items-center">
                {openTask.is_system_generated && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Sparkles className="w-3 h-3" />Generato automaticamente
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => deleteTask(openTask.id)}>
                  Elimina task
                </Button>
              </div>
            </div>
          ) : null
        }
      />

      {/* Add task dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Crea nuovo task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input id="title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Es: Prenotare il fotografo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea id="description" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Aggiungi dettagli..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priorità</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Media</SelectItem>
                    <SelectItem value="low">🟢 Bassa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assegna a</Label>
                <OwnerSelector value={newTask.assigned_to} onChange={(v) => setNewTask({ ...newTask, assigned_to: v })} partner1Name={wedding?.partner1_name} partner2Name={wedding?.partner2_name} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Scadenza</Label>
              <Input id="due_date" type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Area</Label>
              <Select value={newTask.category} onValueChange={(v) => setNewTask({ ...newTask, category: v as TaskMacroCategory })}>
                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MACRO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Collega fornitore (opzionale)</Label>
              <Select value={newTask.vendor_id} onValueChange={(v) => setNewTask({ ...newTask, vendor_id: v })}>
                <SelectTrigger id="vendor"><SelectValue placeholder="Nessun fornitore" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {vendors.map((v) => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea id="notes" value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })} placeholder="Link, dettagli, appunti..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Annulla</Button>
            <Button onClick={addTask}><Plus className="w-4 h-4 mr-2" />Crea task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentSyncDialog
        open={paymentSyncDialog.open}
        onOpenChange={(open) => { if (!open) setPaymentSyncDialog({ open: false, taskId: "", payment: null }); }}
        paymentDescription={paymentSyncDialog.payment?.description || ""}
        paymentAmount={paymentSyncDialog.payment?.amount || 0}
        vendorName={paymentSyncDialog.payment?.expense_item?.vendor?.name || "Fornitore"}
        onConfirm={handlePaymentSyncConfirm}
        onSkip={handlePaymentSyncSkip}
      />

      <BlockedTaskWarning
        open={blockedWarning.open}
        onOpenChange={(open) => { if (!open) setBlockedWarning({ open: false, taskId: "", blockingTaskTitle: "" }); }}
        blockingTaskTitle={blockedWarning.blockingTaskTitle}
        onConfirm={handleBlockedWarningConfirm}
        onCancel={() => setBlockedWarning({ open: false, taskId: "", blockingTaskTitle: "" })}
      />

      <FollowUpDialog
        open={followUpDialog.open}
        onClose={() => setFollowUpDialog({ open: false, task: null })}
        onConfirm={handleCreateFollowUp}
        originalTask={{
          id: followUpDialog.task?.id || "",
          title: followUpDialog.task?.title || "",
          vendor_id: followUpDialog.task?.vendor_id || null,
          assigned_to: followUpDialog.task?.assigned_to || null,
        }}
      />

      {contactVendorTask && wedding && (
        <ContactVendorWizard
          open={!!contactVendorTask}
          onOpenChange={(open) => !open && setContactVendorTask(null)}
          task={{
            id: contactVendorTask.id,
            title: contactVendorTask.title,
            description: contactVendorTask.description,
            wedding_id: wedding.id,
          }}
          vendor={vendors.find((v) => v.id === contactVendorTask.vendor_id)!}
          senderName={userProfile?.first_name || "Un organizzatore"}
          senderRole={userProfile?.wedding_role || "other"}
        />
      )}
    </PaperRoot>
  );
};

export default Checklist;
