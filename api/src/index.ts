export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        worker: 'wwwuabot-api',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname.startsWith('/api/scenario/')) {
      const slug = url.pathname.replace('/api/scenario/', '');
      return new Response(JSON.stringify({ 
        ok: true,
        message: `Scenario endpoint called with slug: ${slug}`,
        note: 'Implementation pending'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
