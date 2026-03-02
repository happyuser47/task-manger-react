import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ccggipaynrpetlphtcxy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZ2dpcGF5bnJwZXRscGh0Y3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTk3NTIsImV4cCI6MjA4NTQ5NTc1Mn0.Te88DaYri583AZ0CfoWr_B0zfAgIc0nYqYkYjhyT1Cs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)