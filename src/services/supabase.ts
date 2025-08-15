

// api.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rwnupgdkjwrbcsdnmxns.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bnVwZ2RrandyYmNzZG5teG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMDU1NDMsImV4cCI6MjA3MDc4MTU0M30.CXcX2l8oBd_jJkflvjO2oTsauIwIJu8Q5Xhd0NoUK4s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
