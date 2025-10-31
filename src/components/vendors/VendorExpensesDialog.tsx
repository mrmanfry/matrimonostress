import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { ExpenseItemsManager } from "./ExpenseItemsManager";
import { ContractUploadDialog } from "./ContractUploadDialog";
import { ContractReviewDialog } from "./ContractReviewDialog";
import { ContractWidgets } from "./ContractWidgets";
import { supabase } from "@/integrations/supabase/client";

interface Vendor {
  id: string;
  name: string;
  category_id: string | null;
}

interface VendorExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
}

export function VendorExpensesDialog({
  open,
  onOpenChange,
  vendor,
}: VendorExpensesDialogProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [fileInfoData, setFileInfoData] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [weddingData, setWeddingData] = useState<{ id: string; wedding_date: string; total_budget?: number } | null>(null);

  useEffect(() => {
    if (vendor && open) {
      loadWeddingAndContract();
    }
  }, [vendor, open]);

  const loadWeddingAndContract = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wedding } = await supabase
        .from("weddings")
        .select("id, wedding_date, total_budget")
        .eq("created_by", user.id)
        .single();

      if (wedding) {
        setWeddingData(wedding);

        // Load existing contract
        const { data: contractData } = await supabase
          .from("vendor_contracts")
          .select("*")
          .eq("vendor_id", vendor!.id)
          .eq("wedding_id", wedding.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setContract(contractData);
      }
    } catch (error) {
      console.error("Error loading wedding and contract:", error);
    }
  };

  const handleAnalysisComplete = (analysis: any, fileInfo: any) => {
    setAnalysisData(analysis);
    setFileInfoData(fileInfo);
    setReviewDialogOpen(true);
  };

  const handleReviewComplete = () => {
    loadWeddingAndContract();
    setReviewDialogOpen(false);
    setAnalysisData(null);
    setFileInfoData(null);
  };

  if (!vendor) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Spese di {vendor.name}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
              className="gap-2"
            >
              <FileUp className="h-4 w-4" />
              Carica Contratto
            </Button>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ExpenseItemsManager vendorId={vendor.id} categoryId={vendor.category_id} />
            </div>

            {contract && (
              <div className="space-y-4">
                <ContractWidgets
                  contractId={contract.id}
                  analysis={contract.ai_analysis}
                  filePath={contract.file_path}
                  onRemove={() => {
                    setContract(null);
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {weddingData && (
        <>
          <ContractUploadDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            vendorId={vendor.id}
            weddingId={weddingData.id}
            weddingDate={weddingData.wedding_date}
            totalContract={weddingData.total_budget}
            onAnalysisComplete={handleAnalysisComplete}
          />

          {analysisData && fileInfoData && (
            <ContractReviewDialog
              open={reviewDialogOpen}
              onOpenChange={setReviewDialogOpen}
              analysis={analysisData}
              fileInfo={fileInfoData}
              vendorId={vendor.id}
              weddingId={weddingData.id}
              weddingDate={weddingData.wedding_date}
              totalContract={weddingData.total_budget}
              onSaveComplete={handleReviewComplete}
            />
          )}
        </>
      )}
    </>
  );
}
