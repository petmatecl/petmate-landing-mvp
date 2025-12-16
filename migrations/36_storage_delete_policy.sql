-- PERMITIR QUE USUARIOS ELIMINEN SUS PROPIOS DOCUMENTOS
-- Bucket: 'documents'

CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING ( bucket_id = 'documents' AND owner = auth.uid() );
