export default {
  async fetch(request: Request): Promise<Response> {
    return new Response('wwwuabot-web placeholder', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
