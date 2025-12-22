import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Users,
  User,
  Loader2,
} from "lucide-react";
import {
  parseCSVContent,
  autoMatchColumns,
  getAvailableDbFields,
  transformRowsWithMapping,
  validateSmartCSVRows,
  groupGuestsByParty,
  normalizePhone,
  SmartCSVGuestRow,
  ImportValidationResult,
  GroupedImportData,
} from "@/utils/csvHelpers";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  existingPhones: string[];
  existingGroups: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';
type DuplicateStrategy = 'skip' | 'update' | 'create';

export const CSVImportDialog = ({
  open,
  onOpenChange,
  weddingId,
  existingPhones,
  existingGroups,
  onSuccess,
}: CSVImportDialogProps) => {
  const { toast } = useToast();
  
  // Step state
  const [step, setStep] = useState<Step>('upload');
  
  // Upload step
  const [fileName, setFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  
  // Mapping step
  const [columnMapping, setColumnMapping] = useState<Record<string, string | null>>({});
  
  // Preview step
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [groupedData, setGroupedData] = useState<GroupedImportData | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  
  // Import step
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{
    guests: number;
    parties: number;
    skipped: number;
    groups: number;
  } | null>(null);
  
  const availableFields = getAvailableDbFields();
  
  // Reset dialog state
  const resetState = useCallback(() => {
    setStep('upload');
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setValidationResult(null);
    setGroupedData(null);
    setDuplicateStrategy('skip');
    setImportProgress(0);
    setImportStats(null);
  }, []);
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Formato non supportato",
        description: "Per favore carica un file .csv",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const content = await file.text();
      const { headers, rows } = parseCSVContent(content);
      
      if (rows.length === 0) {
        toast({
          title: "File vuoto",
          description: "Il file non contiene dati da importare.",
          variant: "destructive",
        });
        return;
      }
      
      setFileName(file.name);
      setRawHeaders(headers);
      setRawRows(rows);
      
      // Auto-match columns
      const autoMapping = autoMatchColumns(headers);
      setColumnMapping(autoMapping);
      
      setStep('mapping');
    } catch (error: any) {
      toast({
        title: "Errore lettura file",
        description: error.message || "Impossibile leggere il file CSV",
        variant: "destructive",
      });
    }
    
    // Reset file input
    e.target.value = '';
  };
  
  // Update column mapping
  const updateMapping = (csvColumn: string, dbField: string | null) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: dbField === 'ignore' ? null : dbField,
    }));
  };
  
  // Check if first_name is mapped
  const isFirstNameMapped = useMemo(() => {
    return Object.values(columnMapping).includes('first_name');
  }, [columnMapping]);
  
  // Process mapping and validate
  const processMapping = () => {
    if (!isFirstNameMapped) {
      toast({
        title: "Campo Nome obbligatorio",
        description: "Devi mappare almeno la colonna 'Nome' per continuare.",
        variant: "destructive",
      });
      return;
    }
    
    // Transform rows with mapping
    const transformedRows = transformRowsWithMapping(rawRows, columnMapping);
    
    // Validate
    const validation = validateSmartCSVRows(transformedRows);
    setValidationResult(validation);
    
    // Group by party
    const grouped = groupGuestsByParty(validation.valid);
    setGroupedData(grouped);
    
    setStep('preview');
  };
  
  // Calculate duplicates
  const duplicates = useMemo(() => {
    if (!validationResult) return [];
    
    const normalizedExisting = existingPhones.map(p => normalizePhone(p)).filter(Boolean);
    
    return validationResult.valid.filter(guest => {
      if (!guest.phone) return false;
      const normalized = normalizePhone(guest.phone);
      return normalized && normalizedExisting.includes(normalized);
    });
  }, [validationResult, existingPhones]);
  
  // Execute import
  const executeImport = async () => {
    if (!validationResult || !groupedData || !weddingId) return;
    
    setStep('importing');
    setImportProgress(0);
    
    let importedGuests = 0;
    let importedParties = 0;
    let skippedGuests = 0;
    let createdGroups = 0;
    
    try {
      const totalItems = validationResult.valid.length;
      let processedItems = 0;
      
      // 1. Create groups if needed
      const uniqueGroupNames = [...new Set(
        validationResult.valid
          .map(g => g.group_name)
          .filter(Boolean) as string[]
      )];
      
      const groupMap: Record<string, string> = {};
      
      for (const groupName of uniqueGroupNames) {
        const existingGroup = existingGroups.find(
          g => g.name.toLowerCase() === groupName.toLowerCase()
        );
        
        if (existingGroup) {
          groupMap[groupName.toLowerCase()] = existingGroup.id;
        } else {
          // Create new group
          const { data: newGroup, error } = await supabase
            .from('guest_groups')
            .insert({ name: groupName, wedding_id: weddingId })
            .select()
            .single();
          
          if (!error && newGroup) {
            groupMap[groupName.toLowerCase()] = newGroup.id;
            createdGroups++;
          }
        }
      }
      
      // 2. Create parties and their guests
      const normalizedExisting = existingPhones.map(p => normalizePhone(p)).filter(Boolean);
      
      for (const [partyKey, guests] of Object.entries(groupedData.parties)) {
        // Use the party_name from the first guest (they all have the same display name)
        const partyName = guests[0].party_name || partyKey;
        
        // Create party
        const { data: party, error: partyError } = await supabase
          .from('invite_parties')
          .insert({
            party_name: partyName,
            wedding_id: weddingId,
            rsvp_status: 'In attesa',
          })
          .select()
          .single();
        
        if (partyError || !party) {
          console.error('Error creating party:', partyError);
          continue;
        }
        
        importedParties++;
        
        // Insert guests for this party
        for (const guest of guests) {
          const normalized = normalizePhone(guest.phone);
          const isDuplicate = normalized && normalizedExisting.includes(normalized);
          
          if (isDuplicate) {
            if (duplicateStrategy === 'skip') {
              skippedGuests++;
              processedItems++;
              setImportProgress(Math.round((processedItems / totalItems) * 100));
              continue;
            } else if (duplicateStrategy === 'update') {
              // Update existing guest by phone
              const { error } = await supabase
                .from('guests')
                .update({
                  first_name: guest.first_name,
                  last_name: guest.last_name || '',
                  alias: guest.alias || null,
                  is_child: guest.is_child || false,
                  party_id: party.id,
                  group_id: guest.group_name ? groupMap[guest.group_name.toLowerCase()] : null,
                  menu_choice: guest.menu_choice || null,
                  dietary_restrictions: guest.dietary_restrictions || null,
                  notes: guest.notes || null,
                })
                .eq('wedding_id', weddingId)
                .eq('phone', normalized);
              
              if (!error) importedGuests++;
              processedItems++;
              setImportProgress(Math.round((processedItems / totalItems) * 100));
              continue;
            }
            // If 'create', fall through to insert
          }
          
          // Insert new guest
          const { error } = await supabase
            .from('guests')
            .insert({
              wedding_id: weddingId,
              first_name: guest.first_name,
              last_name: guest.last_name || '',
              alias: guest.alias || null,
              phone: normalized || null,
              is_child: guest.is_child || false,
              party_id: party.id,
              group_id: guest.group_name ? groupMap[guest.group_name.toLowerCase()] : null,
              menu_choice: guest.menu_choice || null,
              dietary_restrictions: guest.dietary_restrictions || null,
              notes: guest.notes || null,
              adults_count: guest.is_child ? 0 : 1,
              children_count: guest.is_child ? 1 : 0,
            });
          
          if (!error) importedGuests++;
          processedItems++;
          setImportProgress(Math.round((processedItems / totalItems) * 100));
        }
      }
      
      // 3. Insert singles (no party)
      for (const guest of groupedData.singles) {
        const normalized = normalizePhone(guest.phone);
        const isDuplicate = normalized && normalizedExisting.includes(normalized);
        
        if (isDuplicate) {
          if (duplicateStrategy === 'skip') {
            skippedGuests++;
            processedItems++;
            setImportProgress(Math.round((processedItems / totalItems) * 100));
            continue;
          } else if (duplicateStrategy === 'update') {
            const { error } = await supabase
              .from('guests')
              .update({
                first_name: guest.first_name,
                last_name: guest.last_name || '',
                alias: guest.alias || null,
                is_child: guest.is_child || false,
                group_id: guest.group_name ? groupMap[guest.group_name.toLowerCase()] : null,
                menu_choice: guest.menu_choice || null,
                dietary_restrictions: guest.dietary_restrictions || null,
                notes: guest.notes || null,
              })
              .eq('wedding_id', weddingId)
              .eq('phone', normalized);
            
            if (!error) importedGuests++;
            processedItems++;
            setImportProgress(Math.round((processedItems / totalItems) * 100));
            continue;
          }
        }
        
        const { error } = await supabase
          .from('guests')
          .insert({
            wedding_id: weddingId,
            first_name: guest.first_name,
            last_name: guest.last_name || '',
            alias: guest.alias || null,
            phone: normalized || null,
            is_child: guest.is_child || false,
            party_id: null,
            group_id: guest.group_name ? groupMap[guest.group_name.toLowerCase()] : null,
            menu_choice: guest.menu_choice || null,
            dietary_restrictions: guest.dietary_restrictions || null,
            notes: guest.notes || null,
            adults_count: guest.is_child ? 0 : 1,
            children_count: guest.is_child ? 1 : 0,
          });
        
        if (!error) importedGuests++;
        processedItems++;
        setImportProgress(Math.round((processedItems / totalItems) * 100));
      }
      
      setImportStats({
        guests: importedGuests,
        parties: importedParties,
        skipped: skippedGuests,
        groups: createdGroups,
      });
      
      setStep('complete');
      
    } catch (error: any) {
      toast({
        title: "Errore importazione",
        description: error.message || "Si è verificato un errore durante l'importazione.",
        variant: "destructive",
      });
      setStep('preview');
    }
  };
  
  // Handle complete
  const handleComplete = () => {
    onSuccess();
    onOpenChange(false);
    resetState();
  };
  
  // Handle close
  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Smart Import CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Carica il tuo file CSV con la lista invitati"}
            {step === 'mapping' && "Associa le colonne del CSV ai campi del database"}
            {step === 'preview' && "Verifica l'anteprima e le opzioni di importazione"}
            {step === 'importing' && "Importazione in corso..."}
            {step === 'complete' && "Importazione completata!"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {['upload', 'mapping', 'preview', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s || (step === 'importing' && s === 'preview')
                  ? 'bg-primary text-primary-foreground'
                  : ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(step) > i
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>
        
        <ScrollArea className="flex-1 pr-4">
          {/* STEP: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <Card className="p-8 border-dashed border-2 hover:border-primary/50 transition-colors">
                <label className="flex flex-col items-center gap-4 cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Trascina qui il file CSV o clicca per selezionare</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supporta file .csv con separatore virgola o punto e virgola
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline">
                    Seleziona File
                  </Button>
                </label>
              </Card>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Campi supportati:</p>
                <div className="flex flex-wrap gap-2">
                  {availableFields.map(f => (
                    <Badge key={f.value} variant="secondary">{f.label}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* STEP: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{fileName}</span>
                <Badge variant="secondary">{rawRows.length} righe</Badge>
              </div>
              
              <Card className="p-4">
                <p className="text-sm font-medium mb-3">Associazione Colonne</p>
                <div className="space-y-3">
                  {rawHeaders.map(header => {
                    const currentMapping = columnMapping[header];
                    const isAutoMatched = currentMapping !== null;
                    
                    return (
                      <div key={header} className="flex items-center gap-3">
                        <div className="w-1/3 flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{header}</span>
                          {isAutoMatched && (
                            <Badge variant="outline" className="text-xs">Auto</Badge>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <Select
                          value={currentMapping || 'ignore'}
                          onValueChange={(value) => updateMapping(header, value)}
                        >
                          <SelectTrigger className="w-2/3">
                            <SelectValue placeholder="Seleziona campo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">
                              <span className="text-muted-foreground">— Ignora —</span>
                            </SelectItem>
                            {availableFields.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </Card>
              
              {/* Preview first row */}
              {rawRows.length > 0 && (
                <Card className="p-4">
                  <p className="text-sm font-medium mb-2">Anteprima prima riga:</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {rawHeaders.map(header => (
                      <div key={header} className="flex gap-2">
                        <span className="font-medium min-w-24">{header}:</span>
                        <span className="truncate">{rawRows[0][header] || '—'}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Indietro
                </Button>
                <Button onClick={processMapping} disabled={!isFirstNameMapped}>
                  Continua
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
          
          {/* STEP: Preview */}
          {step === 'preview' && validationResult && groupedData && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {validationResult.valid.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Ospiti validi</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Object.keys(groupedData.parties).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Nuclei da creare</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold">
                    {groupedData.singles.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Singoli</div>
                </Card>
              </div>
              
              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <Card className="p-3 border-destructive/50 bg-destructive/5">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <X className="w-4 h-4" />
                    <span className="font-medium">{validationResult.errors.length} Errori</span>
                  </div>
                  <div className="text-sm space-y-1">
                    {validationResult.errors.slice(0, 5).map((err, i) => (
                      <div key={i}>Riga {err.row}: {err.message}</div>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <div className="text-muted-foreground">
                        ...e altri {validationResult.errors.length - 5} errori
                      </div>
                    )}
                  </div>
                </Card>
              )}
              
              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <Card className="p-3 border-yellow-500/50 bg-yellow-500/5">
                  <div className="flex items-center gap-2 text-yellow-600 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">{validationResult.warnings.length} Avvisi</span>
                  </div>
                  <div className="text-sm space-y-1">
                    {validationResult.warnings.slice(0, 3).map((warn, i) => (
                      <div key={i}>Riga {warn.row}: {warn.message}</div>
                    ))}
                    {validationResult.warnings.length > 3 && (
                      <div className="text-muted-foreground">
                        ...e altri {validationResult.warnings.length - 3} avvisi
                      </div>
                    )}
                  </div>
                </Card>
              )}
              
              {/* Duplicates handling */}
              {duplicates.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">
                      {duplicates.length} numeri di telefono già esistenti
                    </span>
                  </div>
                  <RadioGroup
                    value={duplicateStrategy}
                    onValueChange={(v) => setDuplicateStrategy(v as DuplicateStrategy)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="skip" id="skip" />
                      <Label htmlFor="skip">Salta duplicati (non importare)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="update" id="update" />
                      <Label htmlFor="update">Aggiorna dati esistenti</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="create" id="create" />
                      <Label htmlFor="create">Crea comunque (potenziale doppione)</Label>
                    </div>
                  </RadioGroup>
                </Card>
              )}
              
              {/* Preview table */}
              <Card className="p-4">
                <p className="text-sm font-medium mb-3">Anteprima Importazione</p>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cognome</TableHead>
                        <TableHead>Telefono</TableHead>
                        <TableHead>Nucleo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.valid.slice(0, 10).map((guest, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {guest.party_name ? (
                              <Users className="w-4 h-4 text-primary" />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{guest.first_name}</TableCell>
                          <TableCell>{guest.last_name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {guest.phone || '—'}
                          </TableCell>
                          <TableCell>
                            {guest.party_name ? (
                              <Badge variant="secondary">{guest.party_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {validationResult.valid.length > 10 && (
                    <div className="text-center text-sm text-muted-foreground py-2 border-t">
                      ...e altri {validationResult.valid.length - 10} ospiti
                    </div>
                  )}
                </div>
              </Card>
              
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Indietro
                </Button>
                <Button 
                  onClick={executeImport}
                  disabled={validationResult.valid.length === 0}
                >
                  Importa {validationResult.valid.length} Ospiti
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
          
          {/* STEP: Importing */}
          {step === 'importing' && (
            <div className="py-8 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="font-medium">Importazione in corso...</p>
              </div>
              <Progress value={importProgress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {importProgress}% completato
              </p>
            </div>
          )}
          
          {/* STEP: Complete */}
          {step === 'complete' && importStats && (
            <div className="py-8 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xl font-semibold">Importazione Completata!</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{importStats.guests}</div>
                  <div className="text-sm text-muted-foreground">Ospiti importati</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{importStats.parties}</div>
                  <div className="text-sm text-muted-foreground">Nuclei creati</div>
                </Card>
                {importStats.skipped > 0 && (
                  <Card className="p-4 text-center">
                    <div className="text-3xl font-bold text-orange-500">{importStats.skipped}</div>
                    <div className="text-sm text-muted-foreground">Duplicati saltati</div>
                  </Card>
                )}
                {importStats.groups > 0 && (
                  <Card className="p-4 text-center">
                    <div className="text-3xl font-bold">{importStats.groups}</div>
                    <div className="text-sm text-muted-foreground">Gruppi creati</div>
                  </Card>
                )}
              </div>
              
              <div className="flex justify-center pt-4">
                <Button onClick={handleComplete} size="lg">
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
