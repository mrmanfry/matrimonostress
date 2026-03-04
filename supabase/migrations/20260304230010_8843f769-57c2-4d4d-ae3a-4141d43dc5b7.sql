-- Add UPDATE policy on message_reads so upsert (merge-duplicates) works
CREATE POLICY "Users can update their own reads"
ON public.message_reads
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());