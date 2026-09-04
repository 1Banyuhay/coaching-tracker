const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = 'https://vszfhpbvzzxijcrrnclh.supabase.co';
const supabaseKey = 'sb_publishable_-k-cgjWWtBqotpk49mGuQg_8pr3UAWu';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedHierarchy() {
  console.log('🌱 Seeding hierarchy...\n');

  try {
    // Get or create branches
    const branches = ['Main Branch', 'North Branch', 'South Branch', 'East Branch'];
    let branchMap = {};

    console.log('📍 Creating branches...');
    for (const branchName of branches) {
      const { data: existing } = await supabase
        .from('branches')
        .select('id')
        .eq('name', branchName)
        .single();

      if (existing?.id) {
        branchMap[branchName] = existing.id;
      } else {
        const { data } = await supabase
          .from('branches')
          .insert([{ name: branchName }])
          .select();
        if (data?.[0]) {
          branchMap[branchName] = data[0].id;
        }
      }
    }
    console.log('✅ Branches:', Object.keys(branchMap).join(', '));

    // Create profiles with fake UUIDs (real auth would be via dashboard)
    const branchNames = Object.keys(branchMap);
    
    const profiles = [
      {
        id: uuidv4(),
        email: 'admin@1sang.test',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        branch_id: null,
        reports_to_id: null
      },
      // Senior Managers
      {
        id: uuidv4(),
        email: 'sm1@1sang.test',
        first_name: 'Sarah',
        last_name: 'Martinez',
        role: 'senior_manager',
        branch_id: branchMap[branchNames[1]],
        reports_to_id: null
      },
      {
        id: uuidv4(),
        email: 'sm2@1sang.test',
        first_name: 'James',
        last_name: 'Rodriguez',
        role: 'senior_manager',
        branch_id: branchMap[branchNames[2]],
        reports_to_id: null
      },
      {
        id: uuidv4(),
        email: 'sm3@1sang.test',
        first_name: 'Maria',
        last_name: 'Santos',
        role: 'senior_manager',
        branch_id: branchMap[branchNames[3]],
        reports_to_id: null
      }
    ];

    // Create managers under each SM
    const smIds = profiles.filter(p => p.role === 'senior_manager').map(p => p.id);
    let managerIds = [];
    
    for (let smIdx = 0; smIdx < smIds.length; smIdx++) {
      for (let i = 0; i < 2; i++) {
        const managerId = uuidv4();
        managerIds.push(managerId);
        profiles.push({
          id: managerId,
          email: `manager${smIdx * 2 + i + 1}@1sang.test`,
          first_name: `Manager${smIdx * 2 + i + 1}`,
          last_name: 'Team',
          role: 'manager',
          branch_id: branchMap[branchNames[smIdx + 1]],
          reports_to_id: smIds[smIdx]
        });
      }
    }

    // Create planners under each manager
    for (let mIdx = 0; mIdx < managerIds.length; mIdx++) {
      for (let i = 0; i < 3; i++) {
        profiles.push({
          id: uuidv4(),
          email: `planner${mIdx * 3 + i + 1}@1sang.test`,
          first_name: `Planner${mIdx * 3 + i + 1}`,
          last_name: 'Financial',
          role: 'planner',
          branch_id: branchMap[branchNames[(mIdx + 1) % branchNames.length]],
          reports_to_id: managerIds[mIdx]
        });
      }
    }

    console.log('\n👥 Creating profiles...');
    const { data: inserted, error } = await supabase
      .from('profiles')
      .insert(profiles)
      .select();

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log(`✅ Created ${inserted?.length || 0} profiles`);
    
    console.log('\n📊 Hierarchy structure:');
    console.log('  1 Admin');
    console.log('  ├─ 3 Senior Managers');
    console.log('  │  ├─ 2 Managers each (6 total)');
    console.log('  │  │  └─ 3 Planners each (18 total)');
    
    console.log('\n📋 Test credentials:');
    console.log('  Admin: admin@1sang.test / Admin123456');
    console.log('  SM: sm1/sm2/sm3@1sang.test / SM123456');
    console.log('  Mgrs: manager1-6@1sang.test / Manager123456');
    console.log('  Planners: planner1-18@1sang.test / Planner123456');
    console.log('\n⚠️  NOTE: You must create auth users in Supabase dashboard for each email');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

seedHierarchy();
