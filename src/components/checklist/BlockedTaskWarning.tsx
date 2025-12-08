import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lock, AlertTriangle } from "lucide-react";

interface BlockedTaskWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockingTaskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BlockedTaskWarning({
  open,
  onOpenChange,
  blockingTaskTitle,
  onConfirm,
  onCancel,
}: BlockedTaskWarningProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Task Bloccato
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Questo task dipende da un altro task non ancora completato.
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {blockingTaskTitle}
                </span>
              </div>
              <p className="text-sm">
                Ti consigliamo di completare prima il task padre. Vuoi comunque
                procedere?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            No, completa prima l'altro
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Sì, completa comunque
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
