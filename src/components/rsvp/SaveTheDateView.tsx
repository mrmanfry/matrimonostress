import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, MapPin, Loader2, CheckCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Theme {
  font_family: "serif" | "sans" | "elegant";
  primary_color: string;
  show_countdown: boolean;
}

interface SaveTheDateViewProps {
  coupleName: string;
  weddingDate: string;
  weddingLocation?: string;
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
  weddingLocation,
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
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);

  // Parse couple names for display
  const names = coupleName.split(/\s*[&e]\s*/i);
  const name1 = names[0]?.trim() || "";
  const name2 = names[1]?.trim() || "";

  // Format date
  const eventDate = new Date(weddingDate);
  const dayNumber = eventDate.getDate();
  const monthName = eventDate.toLocaleDateString("it-IT", { month: "long" });
  const year = eventDate.getFullYear();

  // Calculate countdown
  const daysUntilWedding = Math.ceil(
    (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  // Theme-based styling
  const primaryColor = theme?.primary_color || "#D4AF37";
  const showCountdown = theme?.show_countdown ?? true;

  const handleResponse = async (response: 'likely_yes' | 'likely_no' | 'unsure') => {
    if (isReadOnly || submitting) return;
    
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
    const startDate = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(eventDate.getTime() + 12 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let url = '';
    
    switch (type) {
      case 'google':
        url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startDate}/${endDate}`;
        window.open(url, '_blank');
        break;
      case 'outlook':
        url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${eventTitle}&startdt=${eventDate.toISOString()}&enddt=${new Date(eventDate.getTime() + 12 * 60 * 60 * 1000).toISOString()}`;
        window.open(url, '_blank');
        break;
      case 'apple':
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:Matrimonio ${coupleName}
END:VEVENT
END:VCALENDAR`;
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `matrimonio-${coupleName.replace(/\s+/g, '-').toLowerCase()}.ics`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
        toast.success("File calendario scaricato!");
        break;
    }
    setShowCalendarOptions(false);
  };

  // Success state after submission
  if (submitted && !isPreview) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}08)` 
        }}
      >
        <div className="max-w-md w-full text-center bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
          <div 
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
          <h2 className="font-cormorant text-3xl font-light mb-2">Grazie {guestFirstName}!</h2>
          <p className="text-gray-600 mb-6">
            Abbiamo registrato la tua risposta. Ti invieremo presto tutti i dettagli!
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Segna la data!</p>
            <p className="font-cormorant text-2xl font-semibold capitalize">
              {dayNumber} {monthName} {year}
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => addToCalendar('google')} 
            className="w-full"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Aggiungi a Google Calendar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Preview Banner */}
      {isPreview && (
        <div 
          className="text-white text-center py-2 px-4 font-medium text-sm sticky top-0 z-50"
          style={{ backgroundColor: primaryColor }}
        >
          ⚠️ ANTEPRIMA - Questa è una simulazione
        </div>
      )}

      {/* Full-Screen Hero with Background Image */}
      <div 
        className="relative min-h-screen flex flex-col"
        style={{
          backgroundImage: heroImageUrl 
            ? `url(${heroImageUrl})` 
            : `linear-gradient(135deg, ${primaryColor}33 0%, ${primaryColor}11 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Dark Gradient Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: heroImageUrl 
              ? 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)'
              : 'transparent'
          }}
        />

        {/* Content Container */}
        <div className="relative z-10 flex-1 flex flex-col justify-end pb-8 px-6">
          {/* Main Content */}
          <div className="text-center text-white max-w-lg mx-auto space-y-6">
            
            {/* Couple Names - Large Typography */}
            <div className="space-y-2">
              <h1 className="font-cormorant text-5xl sm:text-6xl md:text-7xl font-light leading-tight">
                {name1}
              </h1>
              <p 
                className="font-playfair text-2xl sm:text-3xl italic"
                style={{ color: primaryColor }}
              >
                &
              </p>
              <h1 className="font-cormorant text-5xl sm:text-6xl md:text-7xl font-light leading-tight">
                {name2}
              </h1>
            </div>

            {/* Save The Date Label */}
            <p 
              className="uppercase tracking-[0.3em] text-sm font-light"
              style={{ color: heroImageUrl ? 'rgba(255,255,255,0.8)' : primaryColor }}
            >
              Save The Date
            </p>

            {/* Date Display */}
            <div className="space-y-1">
              <p className="font-cormorant text-4xl sm:text-5xl font-semibold">
                {dayNumber} {monthName}
              </p>
              <p 
                className="font-cormorant text-3xl sm:text-4xl font-light"
                style={{ color: heroImageUrl ? 'rgba(255,255,255,0.7)' : primaryColor }}
              >
                {year}
              </p>
            </div>

            {/* Location */}
            {weddingLocation && (
              <div className="flex items-center justify-center gap-2 text-white/80">
                <MapPin className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="text-sm tracking-wide">{weddingLocation}</span>
              </div>
            )}


            {/* Personalized Quote Message */}
            <div className="pt-4 pb-6">
              <p 
                className="font-playfair text-base sm:text-lg italic text-white/90 max-w-sm mx-auto leading-relaxed"
              >
                "{welcomeText || `Ciao ${guestFirstName}! Un capitolo d'amore ci aspetta, e vorremmo tu fossi parte di questa storia.`}"
              </p>
            </div>

            {/* Action Buttons - Glass Morphism Style */}
            <div className="space-y-4 pt-2">
              {/* Calendar Button */}
              <div className="relative">
                <button
                  onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-full backdrop-blur-md transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: primaryColor }}>event</span>
                  <span className="text-sm tracking-wide">Aggiungi al Calendario</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showCalendarOptions && "rotate-180")} />
                </button>
                
                {/* Calendar Dropdown */}
                {showCalendarOptions && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white/95 backdrop-blur-md rounded-xl shadow-xl overflow-hidden z-20">
                    {['google', 'apple', 'outlook'].map((cal) => (
                      <button
                        key={cal}
                        onClick={() => addToCalendar(cal as any)}
                        className="w-full px-4 py-3 text-left text-gray-800 hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm"
                      >
                        <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                        <span className="capitalize">{cal === 'apple' ? 'Apple Calendar' : cal === 'google' ? 'Google Calendar' : 'Outlook'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RSVP Buttons */}
              {!isReadOnly && (
                <div className="space-y-3">
                  <p className="text-white/70 text-xs tracking-wide uppercase">Pensi di esserci?</p>
                  <div className="flex gap-2 justify-center">
                    {[
                      { value: 'likely_yes', label: 'Ci sarò' },
                      { value: 'unsure', label: 'Forse' },
                      { value: 'likely_no', label: 'Non potrò' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleResponse(option.value as any)}
                        disabled={submitting}
                        className={cn(
                          "px-5 py-2.5 rounded-full backdrop-blur-md transition-all font-light tracking-wide text-sm",
                          selectedResponse === option.value
                            ? "scale-105"
                            : "hover:scale-[1.02]",
                          submitting && "opacity-50 cursor-not-allowed"
                        )}
                        style={{
                          backgroundColor: selectedResponse === option.value 
                            ? `${primaryColor}` 
                            : 'rgba(255,255,255,0.1)',
                          border: selectedResponse === option.value 
                            ? `1px solid ${primaryColor}` 
                            : '1px solid rgba(255,255,255,0.25)',
                          color: selectedResponse === option.value 
                            ? 'white'
                            : 'rgba(255,255,255,0.9)',
                        }}
                      >
                        {submitting && selectedResponse === option.value ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          option.label
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/50 text-xs">Non vincolante - ci aiuta a organizzarci!</p>
                </div>
              )}
            </div>

            {/* Scroll Indicator */}
            <div className="pt-8 pb-4 animate-bounce">
              <ChevronDown className="w-6 h-6 mx-auto text-white/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
