// functions/api/coaching/login.js
import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Username and password required' }),
        { status: 400 }
      );
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseAnonKey = env.SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: user, error } = await supabase
      .from('coaching_users')
      .select('id, username, full_name, role, branch, status')
      .eq('username', username)
      .eq('status', 'active')
      .single();

    if (error || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid username or password' }),
        { status: 401 }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: `${username}@1banyuhay.com`,
      password: password
    });

    if (authError || !authData.session) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid username or password' }),
        { status: 401 }
      );
    }

    const token = authData.session.access_token;

    return new Response(
      JSON.stringify({
        success: true,
        token: token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          branch: user.branch
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Login error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Server error' }),
      { status: 500 }
    );
  }
}
