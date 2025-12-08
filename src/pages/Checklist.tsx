import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckSquare,
  Plus,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  MessageSquare,
  StickyNote,
  Phone,
  Mail,
  Link2,
  Lock,
  List,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChecklistCalendarView } from "@/components/checklist/ChecklistCalendarView";
import { ChecklistExportMenu } from "@/components/checklist/ChecklistExportMenu";
import { ContactVendorWizard } from "@/components/checklist/ContactVendorWizard";
import { ChecklistProgressBar } from "@/components/checklist/ChecklistProgressBar";
import { AttentionBox } from "@/components/checklist/AttentionBox";
import { PriorityBadge } from "@/components/checklist/PriorityBadge";
import { OwnerSelector, OwnerBadge } from "@/components/checklist/OwnerSelector";
import { PaymentLinkSelector } from "@/components/checklist/PaymentLinkSelector";
import { TaskDependencySelector, BlockedIndicator } from "@/components/checklist/TaskDependencySelector";
import { PaymentSyncDialog } from "@/components/checklist/PaymentSyncDialog";
import { BlockedTaskWarning } from "@/components/checklist/BlockedTaskWarning";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
}

interface Payment {
  id: string;
  description: string;
  amount: number;
  status: string;
  expense_item?: {
    vendor?: {
      name: string;
    } | null;
  } | null;
}

interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  category_id: string | null;
  category?: {
    name: string;
  } | null;
}

interface Wedding {
  id: string;
  wedding_date: string;
  partner1_name: string;
  partner2_name: string;
}

const Checklist = () => {
  const navigate = useNavigate();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    vendor_id: "",
    priority: "medium",
    notes: "",
    assigned_to: "both",
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [userProfile, setUserProfile] = useState<{ first_name: string | null; wedding_role: string | null } | null>(null);
  const [contactVendorTask, setContactVendorTask] = useState<Task | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  
  // Payment sync dialog state
  const [paymentSyncDialog, setPaymentSyncDialog] = useState<{
    open: boolean;
    taskId: string;
    payment: Payment | null;
  }>({ open: false, taskId: "", payment: null });
  
  // Blocked task warning state
  const [blockedWarning, setBlockedWarning] = useState<{
    open: boolean;
    taskId: string;
    blockingTaskTitle: string;
  }>({ open: false, taskId: "", blockingTaskTitle: "" });
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  // FR-DB-4.2.B - Intercetta parametri URL per deep linking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('task_id');
    
    if (taskId && !loading && tasks.length > 0) {
      const timer = setTimeout(() => {
        const taskElement = document.getElementById(`task-${taskId}`);
        if (taskElement) {
          taskElement.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
          });
          
          taskElement.classList.add('animate-pulse', 'bg-yellow-100', 'dark:bg-yellow-900/20');
          setTimeout(() => {
            taskElement.classList.remove('animate-pulse', 'bg-yellow-100', 'dark:bg-yellow-900/20');
          }, 2000);
          
          setExpandedTask(taskId);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loading, tasks]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filterStatus, searchQuery]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, wedding_role")
        .eq("id", user.id)
        .single();
      
      setUserProfile(profileData);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("wedding_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!roleData?.wedding_id) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id, wedding_date, partner1_name, partner2_name")
        .eq("id", roleData.wedding_id)
        .single();

      if (!weddingData) return;
      setWedding(weddingData);

      const { data: tasksData } = await supabase
        .from("checklist_tasks")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      setTasks(tasksData || []);
      
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select(`
          id, 
          name, 
          phone, 
          email, 
          category_id,
          category:expense_categories(name)
        `)
        .eq("wedding_id", weddingData.id)
        .order("name");
      
      setVendors(vendorsData || []);
    } catch (error) {
      console.error("Error loading checklist:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    setFilteredTasks(filtered);
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // If completing a task, check if it's blocked
    if (currentStatus === "pending" && task.blocked_by_task_id) {
      const blockingTask = tasks.find(t => t.id === task.blocked_by_task_id);
      if (blockingTask && blockingTask.status !== "completed") {
        setBlockedWarning({
          open: true,
          taskId,
          blockingTaskTitle: blockingTask.title,
        });
        return;
      }
    }

    // If completing a task with linked payment, ask about sync
    if (currentStatus === "pending" && task.linked_payment_id) {
      const { data: paymentData } = await supabase
        .from("payments")
        .select(`
          id,
          description,
          amount,
          status,
          expense_item:expense_items(
            vendor:vendors(name)
          )
        `)
        .eq("id", task.linked_payment_id)
        .single();

      if (paymentData && paymentData.status !== "Pagato") {
        setPaymentSyncDialog({
          open: true,
          taskId,
          payment: paymentData,
        });
        return;
      }
    }

    await completeToggleTask(taskId, currentStatus);
  };

  const completeToggleTask = async (taskId: string, currentStatus: string, alsoMarkPayment = false) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const task = tasks.find(t => t.id === taskId);

    const { error } = await supabase
      .from("checklist_tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il task",
        variant: "destructive",
      });
      return;
    }

    // If also marking payment as paid
    if (alsoMarkPayment && task?.linked_payment_id && newStatus === "completed") {
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ 
          status: "Pagato",
          paid_on_date: new Date().toISOString().split('T')[0]
        })
        .eq("id", task.linked_payment_id);

      if (paymentError) {
        toast({
          title: "Attenzione",
          description: "Task completato, ma errore nel segnare il pagamento",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sincronizzato!",
          description: "Task e pagamento segnati come completati",
        });
      }
    } else {
      toast({
        title: newStatus === "completed" ? "Completato!" : "Ripristinato",
        description: newStatus === "completed" 
          ? "Task segnato come completato" 
          : "Task rimesso in sospeso",
      });
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
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

  const handleBlockedWarningCancel = () => {
    setBlockedWarning({ open: false, taskId: "", blockingTaskTitle: "" });
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("checklist_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il task",
        variant: "destructive",
      });
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast({
      title: "Eliminato",
      description: "Task rimosso dalla checklist",
    });
  };

  const addTask = async () => {
    if (!newTask.title.trim() || !wedding) {
      toast({
        title: "Errore",
        description: "Inserisci almeno un titolo per il task",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("checklist_tasks")
      .insert({
        wedding_id: wedding.id,
        title: newTask.title,
        description: newTask.description || null,
        due_date: newTask.due_date || null,
        vendor_id: newTask.vendor_id === "none" ? null : newTask.vendor_id || null,
        status: "pending",
        priority: newTask.priority,
        notes: newTask.notes || null,
        assigned_to: newTask.assigned_to === "both" ? null : newTask.assigned_to,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile creare il task",
        variant: "destructive",
      });
      return;
    }

    setTasks((prev) => [...prev, data]);
    setNewTask({ 
      title: "", 
      description: "", 
      due_date: "", 
      vendor_id: "", 
      priority: "medium",
      notes: "",
      assigned_to: "both",
    });
    setAddTaskOpen(false);
    
    toast({
      title: "Creato!",
      description: "Nuovo task aggiunto alla checklist",
    });
  };

  const updateTaskPriority = async (taskId: string, priority: string) => {
    const { error } = await supabase
      .from("checklist_tasks")
      .update({ priority })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la priorità",
        variant: "destructive",
      });
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority } : t))
    );
  };

  const updateTaskOwner = async (taskId: string, assigned_to: string) => {
    const value = assigned_to === "both" ? null : assigned_to;
    
    const { error } = await supabase
      .from("checklist_tasks")
      .update({ assigned_to: value })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'assegnazione",
        variant: "destructive",
      });
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assigned_to: value } : t))
    );
  };

  const updateTaskPaymentLink = async (taskId: string, paymentId: string | null) => {
    const { error } = await supabase
      .from("checklist_tasks")
      .update({ linked_payment_id: paymentId })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile collegare il pagamento",
        variant: "destructive",
      });
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, linked_payment_id: paymentId } : t))
    );

    toast({
      title: paymentId ? "Collegato!" : "Scollegato",
      description: paymentId 
        ? "Task collegato al pagamento" 
        : "Collegamento rimosso",
    });
  };

  const updateTaskDependency = async (taskId: string, blockedByTaskId: string | null) => {
    const { error } = await supabase
      .from("checklist_tasks")
      .update({ blocked_by_task_id: blockedByTaskId })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la dipendenza",
        variant: "destructive",
      });
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, blocked_by_task_id: blockedByTaskId } : t))
    );

    toast({
      title: blockedByTaskId ? "Dipendenza aggiunta" : "Dipendenza rimossa",
      description: blockedByTaskId 
        ? "Il task è ora bloccato" 
        : "Il task non ha più dipendenze",
    });
  };

  const saveNotes = async (taskId: string) => {
    const { error } = await supabase
      .from("checklist_tasks")
      .update({ notes: tempNotes || null })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare le note",
        variant: "destructive",
      });
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, notes: tempNotes || null } : t))
    );
    setEditingNotes(null);
    toast({
      title: "Salvato",
      description: "Note aggiornate",
    });
  };

  const getDaysUntilDue = (dueDate: string | null): number | null => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDueDateBadge = (dueDate: string | null, status: string) => {
    if (status === "completed") return null;
    if (!dueDate) return null;

    const daysUntil = getDaysUntilDue(dueDate);
    if (daysUntil === null) return null;

    if (daysUntil < 0) {
      return <Badge variant="destructive">Scaduto</Badge>;
    } else if (daysUntil === 0) {
      return <Badge variant="destructive">Oggi!</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-orange-500">Urgente ({daysUntil}g)</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge variant="secondary">Tra {daysUntil}g</Badge>;
    }
    return null;
  };

  const isTaskBlocked = (task: Task): boolean => {
    if (!task.blocked_by_task_id) return false;
    const blockingTask = tasks.find(t => t.id === task.blocked_by_task_id);
    return blockingTask ? blockingTask.status !== "completed" : false;
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter(
      (t) => t.status === "pending" && t.due_date && getDaysUntilDue(t.due_date)! < 0
    ).length,
  };

  const handleAttentionTaskClick = (taskId: string) => {
    setFilterStatus("pending");
    setExpandedTask(taskId);
    setTimeout(() => {
      const taskElement = document.getElementById(`task-${taskId}`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        taskElement.classList.add('animate-pulse', 'ring-2', 'ring-destructive');
        setTimeout(() => {
          taskElement.classList.remove('animate-pulse', 'ring-2', 'ring-destructive');
        }, 2000);
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold">Checklist Matrimonio</h1>
          </div>
          <p className="text-muted-foreground">
            Organizza tutte le attività necessarie per il tuo grande giorno
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-none gap-1"
            >
              <List className="w-4 h-4" />
              Lista
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="rounded-none gap-1"
            >
              <CalendarDays className="w-4 h-4" />
              Calendario
            </Button>
          </div>
          
          {/* Export Menu */}
          {wedding && (
            <ChecklistExportMenu
              tasks={tasks}
              vendors={vendors}
              weddingDate={wedding.wedding_date}
              partner1Name={wedding.partner1_name}
              partner2Name={wedding.partner2_name}
            />
          )}
          
          <Button onClick={() => setAddTaskOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuovo Task
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <ChecklistProgressBar 
        completed={stats.completed}
        pending={stats.pending}
        overdue={stats.overdue}
      />

      {/* Attention Box */}
      <AttentionBox 
        tasks={tasks} 
        onTaskClick={handleAttentionTaskClick}
      />

      {/* Pre-populated Notice */}
      {tasks.some((t) => t.is_system_generated) && (
        <Card className="p-4 bg-accent/10 border-accent/30">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Checklist Pre-Popolata</h3>
              <p className="text-sm text-muted-foreground">
                Abbiamo generato automaticamente {tasks.filter((t) => t.is_system_generated).length} task
                in base alla data del tuo matrimonio.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <ChecklistCalendarView
          tasks={tasks}
          onTaskClick={handleAttentionTaskClick}
        />
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Cerca task..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="pending">In Sospeso</SelectItem>
                    <SelectItem value="completed">Completati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || filterStatus !== "all"
                    ? "Nessun task trovato con questi filtri"
                    : "Nessun task presente"}
                </p>
              </Card>
            ) : (
          filteredTasks.map((task) => {
            const vendor = vendors.find(v => v.id === task.vendor_id);
            const blocked = isTaskBlocked(task);
            
            return (
              <Card
                key={task.id}
                id={`task-${task.id}`}
                className={`p-4 transition-all ${
                  task.status === "completed" ? "opacity-60" : ""
                } ${blocked ? "border-amber-300 bg-amber-50/30 dark:bg-amber-900/10" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={() => toggleTaskStatus(task.id, task.status)}
                      disabled={blocked && task.status === "pending"}
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {blocked && (
                            <Lock className="w-4 h-4 text-amber-600" />
                          )}
                          <h3
                            className={`font-semibold ${
                              task.status === "completed" ? "line-through" : ""
                            } ${blocked ? "text-muted-foreground" : ""}`}
                          >
                            {task.title}
                          </h3>
                          <PriorityBadge priority={task.priority} size="sm" />
                          <BlockedIndicator 
                            blockedByTaskId={task.blocked_by_task_id} 
                            allTasks={tasks} 
                          />
                          {task.linked_payment_id && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Link2 className="w-3 h-3" />
                              Pagamento
                            </Badge>
                          )}
                          {task.notes && (
                            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        {vendor && (
                          <button 
                            onClick={() => navigate(`/app/vendors/${vendor.id}`)}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mt-0.5"
                          >
                            {vendor.name}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {task.due_date && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {new Date(task.due_date).toLocaleDateString("it-IT")}
                              {getDueDateBadge(task.due_date, task.status)}
                            </div>
                          )}
                          <OwnerBadge 
                            owner={task.assigned_to} 
                            partner1Name={wedding?.partner1_name}
                            partner2Name={wedding?.partner2_name}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.is_system_generated && (
                          <div title="Generato automaticamente">
                            <Sparkles className="w-4 h-4 text-accent" />
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setExpandedTask(expandedTask === task.id ? null : task.id)
                          }
                        >
                          {expandedTask === task.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {expandedTask === task.id && (
                      <div className="pt-3 border-t space-y-4">
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        
                        {/* Priority & Owner Controls */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Priorità</Label>
                            <Select
                              value={task.priority || "medium"}
                              onValueChange={(value) => updateTaskPriority(task.id, value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">🔴 Alta</SelectItem>
                                <SelectItem value="medium">🟡 Media</SelectItem>
                                <SelectItem value="low">🟢 Bassa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Assegnato a</Label>
                            <OwnerSelector
                              value={task.assigned_to}
                              onChange={(value) => updateTaskOwner(task.id, value)}
                              partner1Name={wedding?.partner1_name}
                              partner2Name={wedding?.partner2_name}
                            />
                          </div>
                        </div>

                        {/* Payment Link */}
                        {wedding && (
                          <PaymentLinkSelector
                            weddingId={wedding.id}
                            currentPaymentId={task.linked_payment_id || null}
                            onLink={(paymentId) => updateTaskPaymentLink(task.id, paymentId)}
                          />
                        )}

                        {/* Task Dependency */}
                        <TaskDependencySelector
                          currentTaskId={task.id}
                          blockedByTaskId={task.blocked_by_task_id || null}
                          allTasks={tasks}
                          onUpdate={(blockedBy) => updateTaskDependency(task.id, blockedBy)}
                        />

                        {/* Notes Section */}
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 h-8">
                              <StickyNote className="w-4 h-4" />
                              {task.notes ? "Modifica Note" : "Aggiungi Note"}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            {editingNotes === task.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={tempNotes}
                                  onChange={(e) => setTempNotes(e.target.value)}
                                  placeholder="Aggiungi note, link, dettagli..."
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveNotes(task.id)}>
                                    Salva
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => setEditingNotes(null)}
                                  >
                                    Annulla
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="p-3 bg-muted/50 rounded-md text-sm cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => {
                                  setEditingNotes(task.id);
                                  setTempNotes(task.notes || "");
                                }}
                              >
                                {task.notes || <span className="text-muted-foreground italic">Clicca per aggiungere note...</span>}
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Vendor Quick Actions */}
                        {vendor && (
                          <div className="pt-2 border-t">
                            <Label className="text-xs text-muted-foreground">Fornitore: {vendor.name}</Label>
                            <div className="flex gap-2 mt-2">
                              {vendor.phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a href={`tel:${vendor.phone}`}>
                                    <Phone className="w-4 h-4 mr-2" />
                                    Chiama
                                  </a>
                                </Button>
                              )}
                              {vendor.email && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a href={`mailto:${vendor.email}`}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Email
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setContactVendorTask(task)}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Messaggio AI
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
            )}
          </div>
        </>
      )}

      {/* Add Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Es: Prenotare il fotografo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Aggiungi dettagli..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priorità</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Media</SelectItem>
                    <SelectItem value="low">🟢 Bassa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assegna a</Label>
                <OwnerSelector
                  value={newTask.assigned_to}
                  onChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
                  partner1Name={wedding?.partner1_name}
                  partner2Name={wedding?.partner2_name}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="due_date">Scadenza</Label>
              <Input
                id="due_date"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vendor">Collega Fornitore (opzionale)</Label>
              <Select
                value={newTask.vendor_id}
                onValueChange={(value) => setNewTask({ ...newTask, vendor_id: value })}
              >
                <SelectTrigger id="vendor">
                  <SelectValue placeholder="Nessun fornitore" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                placeholder="Link, dettagli, appunti..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>
              Annulla
            </Button>
            <Button onClick={addTask}>Crea Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Sync Dialog */}
      <PaymentSyncDialog
        open={paymentSyncDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentSyncDialog({ open: false, taskId: "", payment: null });
          }
        }}
        paymentDescription={paymentSyncDialog.payment?.description || ""}
        paymentAmount={paymentSyncDialog.payment?.amount || 0}
        vendorName={paymentSyncDialog.payment?.expense_item?.vendor?.name || "Fornitore"}
        onConfirm={handlePaymentSyncConfirm}
        onSkip={handlePaymentSyncSkip}
      />

      {/* Blocked Task Warning */}
      <BlockedTaskWarning
        open={blockedWarning.open}
        onOpenChange={(open) => {
          if (!open) {
            setBlockedWarning({ open: false, taskId: "", blockingTaskTitle: "" });
          }
        }}
        blockingTaskTitle={blockedWarning.blockingTaskTitle}
        onConfirm={handleBlockedWarningConfirm}
        onCancel={handleBlockedWarningCancel}
      />

      {/* Contact Vendor Wizard */}
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
          vendor={vendors.find(v => v.id === contactVendorTask.vendor_id)!}
          senderName={userProfile?.first_name || 'Un organizzatore'}
          senderRole={userProfile?.wedding_role || 'other'}
        />
      )}
    </div>
  );
};

export default Checklist;
