import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, ChevronDown, ChevronUp, Trash2, Sparkles, Lock, Link2, StickyNote, ExternalLink } from "lucide-react";
import { MACRO_CATEGORIES, getMacroCategoryConfig, groupTasksByCategory, TaskMacroCategory } from "@/lib/taskCategories";
import { PriorityBadge } from "./PriorityBadge";
import { OwnerBadge } from "./OwnerSelector";
import { BlockedIndicator } from "./TaskDependencySelector";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  is_system_generated: boolean;
  vendor_id: string | null;
  priority?: string;
  notes?: string | null;
  assigned_to?: string | null;
  blocked_by_task_id?: string | null;
  linked_payment_id?: string | null;
  category?: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

interface CategoryGroupViewProps {
  tasks: Task[];
  allTasks: Task[];
  vendors: Vendor[];
  wedding: { partner1_name: string; partner2_name: string } | null;
  expandedTask: string | null;
  onExpandTask: (taskId: string | null) => void;
  onToggleStatus: (taskId: string, currentStatus: string) => void;
  onDeleteTask: (taskId: string) => void;
  onNavigateToVendor: (vendorId: string) => void;
  getDueDateBadge: (dueDate: string | null, status: string) => React.ReactNode;
  isTaskBlocked: (task: Task) => boolean;
  renderTaskExpanded: (task: Task, vendor: Vendor | undefined) => React.ReactNode;
}

export const CategoryGroupView = ({
  tasks,
  allTasks,
  vendors,
  wedding,
  expandedTask,
  onExpandTask,
  onToggleStatus,
  onDeleteTask,
  onNavigateToVendor,
  getDueDateBadge,
  isTaskBlocked,
  renderTaskExpanded,
}: CategoryGroupViewProps) => {
  // Group tasks by macro-category
  const groupedTasks = useMemo(() => {
    return groupTasksByCategory(tasks);
  }, [tasks]);

  // Calculate stats per category from ALL tasks (not just filtered)
  const categoryStats = useMemo(() => {
    const stats = new Map<TaskMacroCategory, { completed: number; total: number }>();
    
    for (const cat of MACRO_CATEGORIES) {
      stats.set(cat.id, { completed: 0, total: 0 });
    }
    
    for (const task of allTasks) {
      const rawCategory = (task.category as TaskMacroCategory) || "altro";
      const categoryId = stats.has(rawCategory) ? rawCategory : "altro";
      const stat = stats.get(categoryId)!;
      stat.total++;
      if (task.status === "completed") {
        stat.completed++;
      }
    }
    
    return stats;
  }, [allTasks]);

  return (
    <div className="space-y-4">
      {MACRO_CATEGORIES.map((category) => {
        const categoryTasks = groupedTasks.get(category.id) || [];
        const stats = categoryStats.get(category.id)!;
        
        // Skip empty categories in filtered view
        if (categoryTasks.length === 0) return null;
        
        const Icon = category.icon;
        const isComplete = stats.completed === stats.total && stats.total > 0;
        
        return (
          <Collapsible key={category.id} defaultOpen={!isComplete}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${category.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{category.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {categoryTasks.length} task in questa vista
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={isComplete ? "default" : "secondary"}
                      className={isComplete ? "bg-green-600" : ""}
                    >
                      {stats.completed}/{stats.total}
                    </Badge>
                    <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border-t divide-y">
                  {categoryTasks.map((task) => {
                    const vendor = vendors.find(v => v.id === task.vendor_id);
                    const blocked = isTaskBlocked(task);
                    
                    return (
                      <div 
                        key={task.id} 
                        id={`task-${task.id}`}
                        className={`p-4 transition-all ${
                          task.status === "completed" ? "opacity-60 bg-muted/30" : ""
                        } ${blocked ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="pt-1">
                            <Checkbox
                              checked={task.status === "completed"}
                              onCheckedChange={() => onToggleStatus(task.id, task.status)}
                              disabled={blocked && task.status === "pending"}
                            />
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {blocked && <Lock className="w-4 h-4 text-amber-600" />}
                                  <h4 className={`font-medium ${
                                    task.status === "completed" ? "line-through" : ""
                                  } ${blocked ? "text-muted-foreground" : ""}`}>
                                    {task.title}
                                  </h4>
                                  <PriorityBadge priority={task.priority} size="sm" />
                                  <BlockedIndicator blockedByTaskId={task.blocked_by_task_id} allTasks={allTasks} />
                                  {task.linked_payment_id && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Link2 className="w-3 h-3" />
                                      Pagamento
                                    </Badge>
                                  )}
                                  {task.notes && <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                                
                                {vendor && (
                                  <button
                                    onClick={() => onNavigateToVendor(vendor.id)}
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
                                  onClick={() => onExpandTask(expandedTask === task.id ? null : task.id)}
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
                                  onClick={() => onDeleteTask(task.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {expandedTask === task.id && renderTaskExpanded(task, vendor)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};
