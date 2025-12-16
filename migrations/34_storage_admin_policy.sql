-- PERMITIR QUE ADMINS VEAN DOCUMENTOS PRIVADOS
-- Bucket: 'documents' (Privado)

-- Política para que los admins puedan hacer SELECT en cualquier objeto del bucket documents
CREATE POLICY "Admins can view ALL documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND lower(auth.jwt() ->> 'email') IN (
    'admin@petmate.cl', 
    'aldo@petmate.cl', 
    'canocortes@gmail.com',
    'eduardo.a.cordova.d@gmail.com'
  )
);
