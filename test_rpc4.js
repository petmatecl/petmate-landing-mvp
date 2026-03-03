const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ouezpeeiwjwawauidrqq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZXpwZWVpd2p3YXdhdWlkcnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MjAzODksImV4cCI6MjA3NTA5NjM4OX0.QaCigP-dAdh8nCuHOhTlI69VkJM704HAA_N_LG0Jz2A'
);

async function test() {
  const { data, error } = await supabase.rpc('buscar_servicios', {
    p_categoria_slug: null,
    p_comuna: null,
    p_tipo_mascota: null,
    p_tamano: null,
    p_precio_max: null
  }).limit(1);
  console.log('Row:', JSON.stringify(data[0], null, 2));
}
test();