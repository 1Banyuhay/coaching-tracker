import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vszfhpbvzzxijcrrnclh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzemZocGJ2enp4aWpjcnJuY2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMzAzMTEsImV4cCI6MjEwMzgwNjMxMX0.p48DdmF9k4nSOdm6Eeag42yZBO1HKZVin2Bhl_MNQ7Q';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
