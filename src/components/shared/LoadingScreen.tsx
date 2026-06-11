import { Heart } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Caricamento..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
      <div className="text-center space-y-5 px-6">
        <Heart className="w-14 h-14 text-accent fill-accent animate-pulse mx-auto" />
        <div className="space-y-1">
          <h1 className="font-serif text-2xl tracking-tight text-foreground">WedsApp</h1>
          <p
            key={message}
            className="text-sm text-muted-foreground transition-opacity duration-300 animate-in fade-in"
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
