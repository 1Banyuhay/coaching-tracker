const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vszfhpbvzzxijcrrnclh.supabase.co';
const supabaseAdminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzemZocGJ2enp4aWpjcnJuY2xoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNDI5NDM5MCwiZXhwIjoxODYyMDYwMzkwfQ.KzXZ_c1z9z9z9z9z9z9z9z9z9z9z9z9z9z9z9z9z9z8';

const supabase = createClient(supabaseUrl, supabaseAdminKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestPlanner() {
  try {
    console.log('Creating test planner user...');

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'planner@coaching.test',
      password: 'Test123456',
      email_confirm: true,
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    const plannerId = authData.user.id;
    console.log(`✓ Created auth user: ${plannerId}`);

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: plannerId,
        email: 'planner@coaching.test',
        first_name: 'Test',
        last_name: 'Planner',
        role: 'planner',
        reports_to_id: '7f403c3d-44c8-41ca-8cb7-2ecd634a1c33',
        branch_id: 'e793347b-ad50-4b2d-9e7e-d66ba44848b0',
        created_at: new Date(),
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return;
    }

    console.log('✓ Created profile');
    console.log('\n✅ Test planner user created!');
    console.log('Email: planner@coaching.test');
    console.log('Password: Test123456');
    console.log('Role: planner');
    console.log('\nLog in at: https://coaching-tracker.pages.dev');

  } catch (error) {
    console.error('Error:', error);
  }
}

createTestPlanner();
