import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Mail, Loader2, User, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContactVendorWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    description: string | null;
    wedding_id: string;
  };
  vendor: {
    id: string;
    name: string;
    category_id: string | null;
    phone: string | null;
    email: string | null;
    category?: { name: string } | null;
  };
  senderName: string;
  senderRole: string | null;
}

type Channel = 'whatsapp' | 'email';
type Tone = 'formal' | 'friendly';

export function ContactVendorWizard({
  open,
  onOpenChange,
  task,
  vendor,
  senderName,
  senderRole,
}: ContactVendorWizardProps) {
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [tone, setTone] = useState<Tone>('friendly');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Check if contact info is available
  const canUseWhatsApp = !!vendor.phone;
  const canUseEmail = !!vendor.email;

  const generateDraft = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vendor-comm', {
        body: {
          taskTitle: task.title,
          taskDescription: task.description,
          vendorName: vendor.name,
          vendorCategory: vendor.category?.name || 'Fornitore',
          channel,
          tone,
          senderName,
          senderRole: senderRole || 'other',
        },
      });

      if (error) throw error;

      if (channel === 'email' && data.subject) {
        setSubject(data.subject);
      }
      setMessageBody(data.body);

      // Log draft generation
      await supabase.from('vendor_communications').insert({
        wedding_id: task.wedding_id,
        vendor_id: vendor.id,
        task_id: task.id,
        sender_user_id: (await supabase.auth.getUser()).data.user?.id,
        channel,
        tone,
        message_content: data.body,
        outcome: 'draft_generated',
      });

    } catch (error: any) {
      console.error('Error generating draft:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile generare la bozza',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!messageBody.trim()) {
      toast({
        title: 'Attenzione',
        description: 'Genera prima una bozza',
        variant: 'destructive',
      });
      return;
    }

    // Log as opened (user clicked to send)
    await supabase.from('vendor_communications').insert({
      wedding_id: task.wedding_id,
      vendor_id: vendor.id,
      task_id: task.id,
      sender_user_id: (await supabase.auth.getUser()).data.user?.id,
      channel,
      tone,
      message_content: messageBody,
      outcome: 'opened',
    });

    if (channel === 'whatsapp') {
      const phoneNumber = vendor.phone?.replace(/\D/g, '');
      const encodedMessage = encodeURIComponent(messageBody);
      window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
    } else {
      const encodedSubject = encodeURIComponent(subject);
      const encodedBody = encodeURIComponent(messageBody);
      window.open(`mailto:${vendor.email}?subject=${encodedSubject}&body=${encodedBody}`, '_blank');
    }

    toast({
      title: 'Link aperto',
      description: `Verifica e invia il messaggio su ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}`,
    });
  };

  // Auto-generate on open
  useState(() => {
    if (open && !messageBody) {
      generateDraft();
    }
  });

  const roleLabel = senderRole === 'groom' ? 'Lo Sposo' 
    : senderRole === 'bride' ? 'La Sposa'
    : senderRole === 'planner' ? 'Wedding Planner'
    : 'Organizzatore';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Contatta {vendor.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sender Identity */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Stai scrivendo come: <strong>{senderName}</strong> ({roleLabel})
            </span>
          </div>

          {/* Channel Selection */}
          <div className="space-y-2">
            <Label>Canale</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={channel === 'whatsapp' ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => {
                  if (canUseWhatsApp) {
                    setChannel('whatsapp');
                    setTone('friendly');
                  }
                }}
                disabled={!canUseWhatsApp}
              >
                <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                WhatsApp
                {!canUseWhatsApp && <span className="ml-2 text-xs">(No Tel.)</span>}
              </Button>
              <Button
                type="button"
                variant={channel === 'email' ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => {
                  if (canUseEmail) {
                    setChannel('email');
                    setTone('formal');
                  }
                }}
                disabled={!canUseEmail}
              >
                <Mail className="h-4 w-4 mr-2 text-blue-500" />
                Email
                {!canUseEmail && <span className="ml-2 text-xs">(No Email)</span>}
              </Button>
            </div>
          </div>

          {/* Tone Selection */}
          <div className="space-y-2">
            <Label>Tono</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={tone === 'formal' ? 'default' : 'outline'}
                onClick={() => setTone('formal')}
              >
                👔 Formale
              </Button>
              <Button
                type="button"
                variant={tone === 'friendly' ? 'default' : 'outline'}
                onClick={() => setTone('friendly')}
              >
                👋 Amichevole
              </Button>
            </div>
          </div>

          {/* Email Subject (only for email) */}
          {channel === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="subject">Oggetto</Label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Oggetto email..."
              />
            </div>
          )}

          {/* Message Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Bozza Messaggio</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateDraft}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Rigenera</span>
              </Button>
            </div>
            <Textarea
              id="message"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={channel === 'whatsapp' ? 6 : 10}
              placeholder="Genera una bozza usando l'AI..."
              disabled={isGenerating}
            />
          </div>

          {/* Disclaimer */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ Bozza generata da AI - Verifica e modifica prima di inviare
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!messageBody.trim() || isGenerating}
            >
              {channel === 'whatsapp' ? 'Apri WhatsApp' : 'Apri Client Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
