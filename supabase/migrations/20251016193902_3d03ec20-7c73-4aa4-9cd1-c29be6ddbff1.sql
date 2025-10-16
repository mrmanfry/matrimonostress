-- Function per generare task checklist automatici basati su wedding_date
CREATE OR REPLACE FUNCTION public.generate_checklist_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  template_tasks JSONB := '[
    {"title": "Scegliere la location", "description": "Visitare e prenotare il luogo del ricevimento", "months_before": 12, "category": "Location"},
    {"title": "Scegliere il fotografo", "description": "Contattare e prenotare il servizio fotografico", "months_before": 10, "category": "Foto & Video"},
    {"title": "Ordinare le partecipazioni", "description": "Progettare e ordinare le partecipazioni di matrimonio", "months_before": 6, "category": "Partecipazioni"},
    {"title": "Scegliere il menù", "description": "Confermare il menù definitivo con il catering", "months_before": 3, "category": "Catering"},
    {"title": "Organizzare il viaggio di nozze", "description": "Prenotare voli e hotel per il viaggio di nozze", "months_before": 4, "category": "Viaggio"},
    {"title": "Confermare la musica", "description": "Finalizzare la band/DJ per il ricevimento", "months_before": 5, "category": "Musica"},
    {"title": "Scegliere i testimoni", "description": "Chiedere ai testimoni di partecipare", "months_before": 8, "category": "Cerimonia"},
    {"title": "Acquistare le fedi", "description": "Scegliere e acquistare le fedi nuziali", "months_before": 4, "category": "Accessori"},
    {"title": "Scegliere il fioraio", "description": "Decidere composizioni floreali e bouquet", "months_before": 6, "category": "Fiori"},
    {"title": "Pianificare la prova generale", "description": "Organizzare la prova generale della cerimonia", "months_before": 1, "category": "Cerimonia"},
    {"title": "Confermare il numero degli invitati", "description": "Finalizzare la lista degli ospiti confermati", "months_before": 1, "category": "Invitati"},
    {"title": "Preparare la timeline del giorno", "description": "Creare la scaletta dettagliata degli eventi", "months_before": 1, "category": "Organizzazione"}
  ]'::JSONB;
  task JSONB;
  calculated_due_date DATE;
BEGIN
  -- Itera su ogni task del template
  FOR task IN SELECT * FROM jsonb_array_elements(template_tasks)
  LOOP
    -- Calcola la data di scadenza (wedding_date - N mesi)
    calculated_due_date := NEW.wedding_date - (INTERVAL '1 month' * (task->>'months_before')::INTEGER);
    
    -- Inserisci il task nella checklist
    INSERT INTO public.checklist_tasks (
      wedding_id,
      title,
      description,
      due_date,
      status,
      is_system_generated
    ) VALUES (
      NEW.id,
      task->>'title',
      task->>'description',
      calculated_due_date,
      'pending',
      true
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger per chiamare la function dopo l'inserimento di un matrimonio
CREATE TRIGGER generate_checklist_on_wedding_creation
  AFTER INSERT ON public.weddings
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_checklist_tasks();

-- Commento per chiarezza
COMMENT ON FUNCTION public.generate_checklist_tasks() IS 'Genera automaticamente i task della checklist quando viene creato un nuovo matrimonio';
COMMENT ON TRIGGER generate_checklist_on_wedding_creation ON public.weddings IS 'Trigger che popola la checklist con task standard basati sulla wedding_date';