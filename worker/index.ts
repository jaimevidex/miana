// Worker entry - thin router. Handlers live in worker/routes/handlers.ts

import { json, type Env } from './lib';
import { CORS, requireAuth, getCookieValue, validateCsrf } from './http';
import { renderLoginPage, renderDashboard, renderLeadsList, renderLeadDetail, renderClientsList, renderClientDetail, renderSettingsPage } from './admin';
import {
  handleLogin,
  handleLogout,
  handleLead,
  handleDiagnosticoSave,
  handleDiagnostico,
  handleDiagnosticPage,
  handleUpdateStatus,
  handlePreviewQuote,
  handleSendQuote,
  handleDiagnosticInvite,
  handleAcceptLead,
  handleEditLead,
  handleClientDiagnosticInvite,
  handleCreateClient,
  handleEditClient,
  handleUpdateSettings,
  handleExportLeads,
  handleExportClients,
  handleServePhoto,
} from './routes/handlers';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (path === '/api/lead' && method === 'POST') return handleLead(request, env);
    if (path === '/api/diagnostico/save' && method === 'POST') return handleDiagnosticoSave(request, env);
    if (path === '/api/diagnostico' && method === 'POST') return handleDiagnostico(request, env);
    if (path === '/diagnostico' && method === 'GET') return handleDiagnosticPage(request, env);

    if (path === '/admin/login' && method === 'GET') return renderLoginPage();
    if (path === '/api/admin/login' && method === 'POST') return handleLogin(request, env);
    if (path === '/api/admin/logout' && method === 'POST') return handleLogout(request, env);

    if (path.startsWith('/admin')) {
      const userId = await requireAuth(request, env);
      if (!userId) return new Response(null, { status: 302, headers: { Location: '/admin/login' } });

      const csrfToken = getCookieValue(request, 'csrf_token') || '';

      if (path === '/admin' && method === 'GET') return renderDashboard(env, csrfToken);
      if (path === '/admin/leads' && method === 'GET') {
        return renderLeadsList(env, {
          status: url.searchParams.get('status') || undefined,
          search: url.searchParams.get('search') || undefined,
          type: url.searchParams.get('type') || undefined,
          dateFrom: url.searchParams.get('dateFrom') || undefined,
          dateTo: url.searchParams.get('dateTo') || undefined,
          page: parseInt(url.searchParams.get('page') || '1', 10),
        }, csrfToken);
      }
      if (path === '/admin/clients' && method === 'GET') {
        return renderClientsList(env, {
          search: url.searchParams.get('search') || undefined,
          page: parseInt(url.searchParams.get('page') || '1', 10),
        }, csrfToken);
      }
      if (path === '/admin/settings' && method === 'GET') return renderSettingsPage(env, csrfToken);
      if (path.startsWith('/admin/lead/') && method === 'GET') {
        return renderLeadDetail(env, path.split('/admin/lead/')[1], csrfToken);
      }
      if (path.startsWith('/admin/client/') && method === 'GET') {
        return renderClientDetail(env, path.split('/admin/client/')[1], csrfToken);
      }
    }

    if (path.startsWith('/api/admin/')) {
      const userId = await requireAuth(request, env);
      if (!userId) return json({ error: 'Não autenticado' }, 401);

      if (method !== 'GET' && !validateCsrf(request)) {
        return json({ error: 'CSRF inválido' }, 403);
      }

      if (path.startsWith('/api/admin/lead/') && path.endsWith('/status') && method === 'POST') {
        return handleUpdateStatus(request, env, path.split('/api/admin/lead/')[1]?.replace('/status', ''));
      }
      if (path.startsWith('/api/admin/lead/') && path.endsWith('/preview') && method === 'POST') {
        return handlePreviewQuote(request, env, path.split('/api/admin/lead/')[1]?.replace('/preview', ''));
      }
      if (path.startsWith('/api/admin/lead/') && path.endsWith('/quote') && method === 'POST') {
        return handleSendQuote(request, env, path.split('/api/admin/lead/')[1]?.replace('/quote', ''), userId);
      }
      if (path.startsWith('/api/admin/lead/') && path.endsWith('/diagnostic-invite') && method === 'POST') {
        return handleDiagnosticInvite(request, env, path.split('/api/admin/lead/')[1]?.replace('/diagnostic-invite', ''));
      }
      if (path.startsWith('/api/admin/lead/') && path.endsWith('/accept') && method === 'POST') {
        return handleAcceptLead(request, env, path.split('/api/admin/lead/')[1]?.replace('/accept', ''));
      }
      if (path.startsWith('/api/admin/lead/') && method === 'PUT') {
        return handleEditLead(request, env, path.split('/api/admin/lead/')[1]);
      }
      if (path.startsWith('/api/admin/client/') && path.endsWith('/diagnostic-invite') && method === 'POST') {
        return handleClientDiagnosticInvite(request, env, path.split('/api/admin/client/')[1]?.replace('/diagnostic-invite', ''));
      }
      if (path === '/api/admin/client' && method === 'POST') return handleCreateClient(request, env);
      if (path.startsWith('/api/admin/client/') && method === 'PUT') {
        return handleEditClient(request, env, path.split('/api/admin/client/')[1]);
      }
      if (path === '/api/admin/settings' && method === 'PUT') return handleUpdateSettings(request, env);
      if (path === '/api/admin/export/leads' && method === 'GET') return handleExportLeads(request, env);
      if (path === '/api/admin/export/clients' && method === 'GET') return handleExportClients(request, env);
      if ((path === '/api/admin/photo' || path.startsWith('/api/admin/photo/')) && method === 'GET') {
        const fromQuery = url.searchParams.get('key') || '';
        const fromPath = path.startsWith('/api/admin/photo/')
          ? decodeURIComponent(path.slice('/api/admin/photo/'.length))
          : '';
        return handleServePhoto(env, fromQuery || fromPath);
      }
    }

    return env.ASSETS.fetch(request as Request);
  },
} satisfies ExportedHandler<Env>;
