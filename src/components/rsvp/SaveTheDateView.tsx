import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Heart, ThumbsUp, HelpCircle, ThumbsDown, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Theme {
  font_family: "serif" | "sans" | "elegant";
  primary_color: string;
  show_countdown: boolean;
}

interface SaveTheDateViewProps {
  coupleName: string;
  weddingDate: string;
  guestFirstName: string;
  guestLastName: string;
  heroImageUrl?: string | null;
  welcomeTitle?: string;
  welcomeText?: string;
  isReadOnly?: boolean;
  isPreview?: boolean;
  theme?: Theme | null;
  onSubmitResponse: (response: 'likely_yes' | 'likely_no' | 'unsure') => Promise<void>;
}

export function SaveTheDateView({
  coupleName,
  weddingDate,
  guestFirstName,
  guestLastName,
  heroImageUrl,
  welcomeTitle,
  welcomeText,
  isReadOnly,
  isPreview,
  theme,
  onSubmitResponse,
}: SaveTheDateViewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<'likely_yes' | 'likely_no' | 'unsure' | null>(null);

  const formattedDate = new Date(weddingDate).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calculate countdown
  const daysUntilWedding = Math.ceil(
    (new Date(weddingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  // Theme-based styling
  const fontClass = theme?.font_family === "sans" 
    ? "font-sans" 
    : theme?.font_family === "elegant" 
      ? "font-serif italic" 
      : "font-serif";
  
  const primaryColor = theme?.primary_color || "hsl(var(--primary))";
  const showCountdown = theme?.show_countdown ?? true;

  const handleResponse = async (response: 'likely_yes' | 'likely_no' | 'unsure') => {
    if (isReadOnly || submitting) return;
    
    // In preview mode, just show visual feedback
    if (isPreview) {
      setSelectedResponse(response);
      toast.info("Anteprima - click registrato!");
      return;
    }
    
    setSubmitting(true);
    setSelectedResponse(response);
    
    try {
      await onSubmitResponse(response);
      setSubmitted(true);
      toast.success("Grazie per la tua risposta! 💕");
    } catch (error) {
      toast.error("Si è verificato un errore. Riprova.");
      setSelectedResponse(null);
    } finally {
      setSubmitting(false);
    }
  };

  const addToCalendar = (type: 'google' | 'apple' | 'outlook') => {
    const eventTitle = encodeURIComponent(`Matrimonio ${coupleName}`);
    const eventDate = new Date(weddingDate);
    
    // Format for calendar links
    const startDate = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(eventDate.getTime() + 12 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let url = '';
    
    switch (type) {
      case 'google':
        url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startDate}/${endDate}`;
        break;
      case 'outlook':
        url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${eventTitle}&startdt=${eventDate.toISOString()}&enddt=${new Date(eventDate.getTime() + 12 * 60 * 60 * 1000).toISOString()}`;
        break;
      case 'apple':
        // Generate .ics file for Apple Calendar
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:Matrimonio ${coupleName}
END:VEVENT
END:VCALENDAR`;
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `matrimonio-${coupleName.replace(/\s+/g, '-').toLowerCase()}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("File calendario scaricato!");
        return;
    }
    
    window.open(url, '_blank');
  };

  if (submitted && !isPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className={cn("text-2xl font-bold mb-2", fontClass)}>Grazie {guestFirstName}! 💕</h2>
            <p className="text-muted-foreground mb-6">
              Abbiamo registrato la tua risposta. Ti invieremo presto tutti i dettagli!
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-2">Segna la data!</p>
              <p className={cn("font-semibold text-lg capitalize", fontClass)}>{formattedDate}</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => addToCalendar('google')} className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                Aggiungi a Google Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Preview Banner */}
      {isPreview && (
        <div className="bg-yellow-500 text-yellow-950 text-center py-2 px-4 font-medium text-sm sticky top-0 z-50">
          ⚠️ ANTEPRIMA - Questa è una simulazione
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden">
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt="Wedding"
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${primaryColor}33, ${primaryColor}11)` }}
          >
            <Heart className="w-24 h-24" style={{ color: `${primaryColor}55` }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        
        {/* Date Overlay */}
        <div className="absolute bottom-0 left-0 right-0 text-center pb-8">
          <div className="inline-block bg-background/90 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-lg">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Save The Date</p>
            <p className={cn("text-3xl md:text-4xl font-bold capitalize", fontClass)}>{formattedDate}</p>
            
            {/* Countdown */}
            {showCountdown && daysUntilWedding > 0 && (
              <p className="text-sm mt-2" style={{ color: primaryColor }}>
                Mancano {daysUntilWedding} giorni
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Couple Names */}
        <div className="text-center">
          <h1 
            className={cn("text-4xl font-bold mb-2", fontClass)}
            style={{ color: primaryColor }}
          >
            {coupleName}
          </h1>
          <p className="text-muted-foreground">si sposano!</p>
        </div>

        {/* Welcome Message */}
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">
              Ciao {guestFirstName}! 👋
            </h2>
            <p className="text-muted-foreground">
              {welcomeText || "Tieniti libero per questa data speciale. Ti invieremo presto tutti i dettagli!"}
            </p>
          </CardContent>
        </Card>

        {/* Add to Calendar */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-center flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Aggiungi al Calendario
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => addToCalendar('google')} className="text-sm">
                Google
              </Button>
              <Button variant="outline" onClick={() => addToCalendar('apple')} className="text-sm">
                Apple
              </Button>
              <Button variant="outline" onClick={() => addToCalendar('outlook')} className="text-sm">
                Outlook
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Soft RSVP Widget */}
        {!isReadOnly && (
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-center">
                Pensi di esserci? 🤔
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Non è vincolante - ci aiuta a organizzarci!
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleResponse('likely_yes')}
                  disabled={submitting}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    selectedResponse === 'likely_yes' 
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30" 
                      : "border-border hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/20",
                    submitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {submitting && selectedResponse === 'likely_yes' ? (
                    <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                  ) : (
                    <ThumbsUp className="w-8 h-8 text-green-500" />
                  )}
                  <span className="text-sm font-medium">Ci sarò!</span>
                </button>
                
                <button
                  onClick={() => handleResponse('unsure')}
                  disabled={submitting}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    selectedResponse === 'unsure' 
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" 
                      : "border-border hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
                    submitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {submitting && selectedResponse === 'unsure' ? (
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  ) : (
                    <HelpCircle className="w-8 h-8 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">Forse</span>
                </button>
                
                <button
                  onClick={() => handleResponse('likely_no')}
                  disabled={submitting}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    selectedResponse === 'likely_no' 
                      ? "border-red-500 bg-red-50 dark:bg-red-950/30" 
                      : "border-border hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20",
                    submitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {submitting && selectedResponse === 'likely_no' ? (
                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  ) : (
                    <ThumbsDown className="w-8 h-8 text-red-500" />
                  )}
                  <span className="text-sm font-medium">Difficile</span>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pb-8">
          <Heart className="w-4 h-4 inline-block mr-1" />
          Ti invieremo i dettagli ufficiali più avanti
        </div>
      </div>
    </div>
  );
}
