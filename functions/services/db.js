/**
 * Backend Supabase Client
 * Uses the Service Role Key to bypass RLS for backend operations.
 */
require('dotenv').config({ path: '../.env' }); // Load from root .env locally
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in backend.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
