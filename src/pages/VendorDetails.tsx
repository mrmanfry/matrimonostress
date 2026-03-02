import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, Building2, CreditCard, FileText, Pencil, CalendarCheck, ListTodo } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VendorExpensesWidget } from "@/components/vendors/widgets/VendorExpensesWidget";
import { VendorDocumentsWidget } from "@/components/vendors/widgets/VendorDocumentsWidget";
import { VendorChecklistWidget } from "@/components/vendors/widgets/VendorChecklistWidget";
import { VendorAppointmentsWidget } from "@/components/vendors/widgets/VendorAppointmentsWidget";
import { VendorDialog } from "@/components/vendors/VendorDialog";
import { VendorTaskDialog } from "@/components/vendors/VendorTaskDialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { LockedCard } from "@/components/ui/locked-card";

const statusConfig = {
  evaluating: { label: "In Valutazione", bg: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  contacted: { label: "Contattato", bg: "bg-blue-100 text-blue-800 border-blue-200" },
  quotation_received: { label: "Preventivo Ricevuto", bg: "bg-purple-100 text-purple-800 border-purple-200" },
  confirmed: { label: "Confermato", bg: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Scartato", bg: "bg-red-100 text-red-800 border-red-200" },
};

export default function VendorDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'expenses';
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogType, setTaskDialogType] = useState<"task" | "appointment">("task");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isPlanner, isCollaborator, authState } = useAuth();
  const vendorCostsHidden = isCollaborator && authState.status === 'authenticated' && !authState.activePermissions?.vendor_costs?.view;

  // Fetch vendor details
  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor-details", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*, expense_categories(name)")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for the dialog
  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories-for-vendor", vendor?.wedding_id],
    queryFn: async () => {
      if (!vendor?.wedding_id) return [];
      const { data, error } = await supabase
        .from("expense_categories")
        .select("id, name")
        .eq("wedding_id", vendor.wedding_id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendor?.wedding_id,
  });

  const handleSaveVendor = async (vendorData: any) => {
    if (!vendor?.id) return;
    
    const { error } = await supabase
      .from("vendors")
      .update(vendorData)
      .eq("id", vendor.id);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche",
        variant: "destructive",
      });
      throw error;
    }

    toast({
      title: "Salvato",
      description: "Profilo fornitore aggiornato",
    });

    queryClient.invalidateQueries({ queryKey: ["vendor-details", id] });
    setEditDialogOpen(false);
  };

  const handleCreateCategory = async (name: string) => {
    if (!vendor?.wedding_id) return;
    const { error } = await supabase
      .from("expense_categories")
      .insert({ name, wedding_id: vendor.wedding_id });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["expense-categories-for-vendor"] });
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from("expense_categories")
      .delete()
      .eq("id", categoryId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["expense-categories-for-vendor"] });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-muted-foreground">Fornitore non trovato</h1>
        <Button onClick={() => navigate("/app/vendors")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna ai Fornitori
        </Button>
      </div>
    );
  }

  const status = vendor.status as keyof typeof statusConfig || "evaluating";
  const statusInfo = statusConfig[status];

  return (
    <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        className="gap-2 pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/app/vendors")}
      >
        <ArrowLeft className="w-4 h-4" />
        Torna ai Fornitori
      </Button>

      {/* Hero Card */}
      <div className="bg-card rounded-xl shadow-sm border p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-row gap-3 md:gap-6 items-start">
          <Avatar className="w-14 h-14 md:w-24 md:h-24 border-4 border-primary/10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-lg md:text-2xl font-bold">
              {vendor.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3 md:space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-xl md:text-3xl font-bold text-foreground truncate">{vendor.name}</h1>
                <div className="flex flex-wrap gap-1.5 md:gap-2 mt-1.5 md:mt-2">
                  {vendor.expense_categories?.name && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                      {vendor.expense_categories.name}
                    </Badge>
                  )}
                  <Badge className={`border text-xs ${statusInfo.bg}`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
              {isMobile ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifica Profilo
                </Button>
              )}
            </div>

            {/* Contact Information */}
            <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-1.5 md:gap-y-2 text-sm text-muted-foreground">
              {vendor.contact_name && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 shrink-0" />
                  {isMobile ? null : <span>{vendor.contact_name}</span>}
                  {isMobile && <span className="truncate">{vendor.contact_name}</span>}
                </div>
              )}
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  {!isMobile && vendor.phone}
                </a>
              )}
              {vendor.email && (
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  {!isMobile && vendor.email}
                </a>
              )}
            </div>

            {/* Financial Details - hidden on mobile */}
            {!isMobile && (vendor.ragione_sociale || vendor.partita_iva_cf || vendor.iban) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {vendor.ragione_sociale && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">Ragione Sociale</p>
                      <p className="font-medium">{vendor.ragione_sociale}</p>
                    </div>
                  )}
                  {vendor.partita_iva_cf && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">P.IVA / C.F.</p>
                      <p className="font-medium font-mono">{vendor.partita_iva_cf}</p>
                    </div>
                  )}
                  {vendor.indirizzo_sede_legale && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">Sede Legale</p>
                      <p className="font-medium">{vendor.indirizzo_sede_legale}</p>
                    </div>
                  )}
                  {vendor.iban && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">IBAN</p>
                      <p className="font-medium font-mono">{vendor.iban}</p>
                    </div>
                  )}
                  {vendor.intestatario_conto && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">Intestatario Conto</p>
                      <p className="font-medium">{vendor.intestatario_conto}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Notes - hidden on mobile */}
            {!isMobile && vendor.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-xs font-medium mb-2">Note</p>
                  <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={vendorCostsHidden ? 'documents' : initialTab} className="w-full">
        <TabsList className={`w-full border-b rounded-none bg-transparent h-auto p-0 ${isMobile ? 'justify-around' : 'justify-start space-x-8'}`}>
          {!vendorCostsHidden && (
            <TabsTrigger
              value="expenses"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3 px-0"
            >
              <CreditCard className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Spese & Pagamenti</span>
            </TabsTrigger>
          )}
          <TabsTrigger
            value="documents"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3 px-0"
          >
            <FileText className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Documenti</span>
          </TabsTrigger>
          <TabsTrigger
            value="appointments"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3 px-0"
          >
            <CalendarCheck className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Appuntamenti</span>
          </TabsTrigger>
          <TabsTrigger
            value="checklist"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3 px-0"
          >
            <ListTodo className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Checklist</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          {!vendorCostsHidden && (
            <TabsContent value="expenses" className="mt-0 focus-visible:ring-0">
              <VendorExpensesWidget vendorId={vendor.id} categoryId={vendor.category_id} />
            </TabsContent>
          )}

          <TabsContent value="documents" className="mt-0 focus-visible:ring-0">
            <VendorDocumentsWidget vendorId={vendor.id} vendorName={vendor.name} />
          </TabsContent>

          <TabsContent value="appointments" className="mt-0 focus-visible:ring-0">
            <VendorAppointmentsWidget 
              vendorId={vendor.id} 
              vendorName={vendor.name}
              weddingId={vendor.wedding_id}
              onCreateAppointment={() => {
                setTaskDialogType("appointment");
                setTaskDialogOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="checklist" className="mt-0 focus-visible:ring-0">
            <VendorChecklistWidget 
              vendorId={vendor.id}
              onCreateTask={() => {
                setTaskDialogType("task");
                setTaskDialogOpen(true);
              }}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Vendor Dialog */}
      <VendorDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        vendor={vendor ? {
          id: vendor.id,
          name: vendor.name,
          contact_name: vendor.contact_name,
          email: vendor.email,
          phone: vendor.phone,
          status: vendor.status || "evaluating",
          notes: vendor.notes,
          category_id: vendor.category_id,
          staff_meals_count: vendor.staff_meals_count,
          staff_vegan_count: vendor.staff_vegan_count,
          staff_vegetarian_count: vendor.staff_vegetarian_count,
          staff_gluten_free_count: vendor.staff_gluten_free_count,
          staff_lactose_free_count: vendor.staff_lactose_free_count,
          staff_dietary_notes: vendor.staff_dietary_notes,
        } : null}
        categories={categories}
        onSave={handleSaveVendor}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Task/Appointment Dialog */}
      <VendorTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        vendorId={vendor.id}
        vendorName={vendor.name}
        weddingId={vendor.wedding_id}
        defaultType={taskDialogType}
      />
    </div>
  );
}
