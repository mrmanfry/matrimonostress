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
  MessageSquare
} from "lucide-react";
import { ContactVendorWizard } from "@/components/checklist/ContactVendorWizard";
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
}

const Checklist = () => {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    vendor_id: "",
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [userProfile, setUserProfile] = useState<{ first_name: string | null; wedding_role: string | null } | null>(null);
  const [contactVendorTask, setContactVendorTask] = useState<Task | null>(null);
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
          
          // Highlight animato (flash giallo)
          taskElement.classList.add('animate-pulse', 'bg-yellow-100', 'dark:bg-yellow-900/20');
          setTimeout(() => {
            taskElement.classList.remove('animate-pulse', 'bg-yellow-100', 'dark:bg-yellow-900/20');
          }, 2000);
          
          // Espandi automaticamente
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

      // Load user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, wedding_role")
        .eq("id", user.id)
        .single();
      
      setUserProfile(profileData);

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id, wedding_date")
        .limit(1)
        .maybeSingle();

      if (!weddingData) return;
      setWedding(weddingData);

      const { data: tasksData } = await supabase
        .from("checklist_tasks")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      setTasks(tasksData || []);
      
      // Load vendors with contact info for task assignment and communication
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

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    // Filter by search query
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
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

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

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    toast({
      title: newStatus === "completed" ? "Completato!" : "Ripristinato",
      description: newStatus === "completed" 
        ? "Task segnato come completato" 
        : "Task rimesso in sospeso",
    });
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
        vendor_id: newTask.vendor_id || null,
        status: "pending",
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
    setNewTask({ title: "", description: "", due_date: "", vendor_id: "" });
    setAddTaskOpen(false);
    
    toast({
      title: "Creato!",
      description: "Nuovo task aggiunto alla checklist",
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

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter(
      (t) => t.status === "pending" && t.due_date && getDaysUntilDue(t.due_date)! < 0
    ).length,
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
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold">Checklist Matrimonio</h1>
          </div>
          <p className="text-muted-foreground">
            Organizza tutte le attività necessarie per il tuo grande giorno
          </p>
        </div>
        <Button onClick={() => setAddTaskOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuovo Task
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-accent">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Totali</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Completati</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-muted-foreground">In Sospeso</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          <div className="text-sm text-muted-foreground">Scaduti</div>
        </Card>
      </div>

      {/* Pre-populated Notice */}
      {tasks.some((t) => t.is_system_generated) && (
        <Card className="p-4 bg-accent/10 border-accent/30">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Checklist Pre-Popolata</h3>
              <p className="text-sm text-muted-foreground">
                Abbiamo generato automaticamente {tasks.filter((t) => t.is_system_generated).length} task
                in base alla data del tuo matrimonio. Le scadenze sono calcolate a ritroso per aiutarti a
                rispettare tutte le tempistiche!
              </p>
            </div>
          </div>
        </Card>
      )}

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
          filteredTasks.map((task) => (
            <Card
              key={task.id}
              id={`task-${task.id}`}
              className={`p-4 transition-all ${
                task.status === "completed" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="pt-1">
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={() => toggleTaskStatus(task.id, task.status)}
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3
                        className={`font-semibold ${
                          task.status === "completed" ? "line-through" : ""
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.due_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(task.due_date).toLocaleDateString("it-IT")}
                          {getDueDateBadge(task.due_date, task.status)}
                        </div>
                      )}
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
                    <div className="pt-2 border-t space-y-2">
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                      
                      {task.vendor_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setContactVendorTask(task)}
                          className="mt-2"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Contatta {vendors.find(v => v.id === task.vendor_id)?.name || 'Fornitore'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

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
                  <SelectItem value="">Nessuno</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Collegando un fornitore, il task apparirà anche nella sua scheda dedicata
              </p>
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
