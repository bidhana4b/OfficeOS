/**
 * TITAN DEV AI — AI Service Layer
 * Manages Gemini API integration via Supabase Edge Function
 */

import { supabase, DEMO_TENANT_ID } from '@/lib/supabase';

// ============================================
// API KEY MANAGEMENT (stored in system_settings)
// ============================================

const AI_SETTINGS_SECTION = 'ai_api_keys';

export interface AIApiKeys {
  gemini_api_key: string;
  preferred_model: 'gemini-2.0-flash' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
  enabled: boolean;
}

const defaultKeys: AIApiKeys = {
  gemini_api_key: '',
  preferred_model: 'gemini-2.0-flash',
  enabled: false,
};

let cachedKeys: AIApiKeys | null = null;

export async function getAIApiKeys(): Promise<AIApiKeys> {
  if (cachedKeys) return cachedKeys;

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('config')
      .eq('tenant_id', DEMO_TENANT_ID)
      .eq('section', AI_SETTINGS_SECTION)
      .single();

    if (error || !data) return defaultKeys;

    const config = data.config as Record<string, unknown>;
    cachedKeys = {
      gemini_api_key: (config.gemini_api_key as string) || '',
      preferred_model: (config.preferred_model as AIApiKeys['preferred_model']) || 'gemini-2.0-flash',
      enabled: (config.enabled as boolean) ?? false,
    };
    return cachedKeys;
  } catch {
    return defaultKeys;
  }
}

export async function saveAIApiKeys(keys: AIApiKeys): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        tenant_id: DEMO_TENANT_ID,
        section: AI_SETTINGS_SECTION,
        config: keys,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,section' });

    if (error) throw error;
    cachedKeys = keys;
    return true;
  } catch (e) {
    console.error('Failed to save AI API keys:', e);
    return false;
  }
}

export function clearAIKeysCache() {
  cachedKeys = null;
}

// ============================================
// AI CHAT SERVICE
// ============================================

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface AIResponse {
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

const TITAN_SYSTEM_PROMPT = `You are TITAN AI, an intelligent assistant embedded in TITAN DEV AI — a multi-tenant agency management platform. 

Your capabilities:
- Analyze business metrics, revenue, expenses, and burn rate
- Help with client management decisions and health score analysis
- Provide insights on team workload, utilization, and capacity
- Assist with campaign performance analysis and media buying strategy
- Help with invoice management and financial planning
- Give actionable recommendations based on data

Guidelines:
- Be concise and data-driven
- Use bullet points for clarity
- Include specific numbers when available
- Suggest actionable next steps
- Respond in the language the user uses (support Bengali/Bangla and English)
- Format currency in BDT (৳) when relevant
- Keep responses focused and professional

You have access to the agency's operational data including:
- Client portfolios and health scores
- Team member assignments and workloads
- Package usage and deliverable tracking
- Financial metrics (revenue, invoices, wallet balances)
- Campaign performance data
- Messaging activity`;

/**
 * Send a chat message to AI via Supabase Edge Function
 */
export async function sendAIMessage(
  messages: ChatMessage[],
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    context?: string;
  }
): Promise<AIResponse> {
  const keys = await getAIApiKeys();

  if (!keys.enabled || !keys.gemini_api_key) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const systemPrompt = options?.systemPrompt || TITAN_SYSTEM_PROMPT;
  const enrichedSystemPrompt = options?.context
    ? `${systemPrompt}\n\nCurrent Context:\n${options.context}`
    : systemPrompt;

  const { data, error } = await supabase.functions.invoke('supabase-functions-ai-chat', {
    body: {
      messages,
      systemPrompt: enrichedSystemPrompt,
      apiKey: keys.gemini_api_key,
      model: keys.preferred_model,
      maxTokens: options?.maxTokens || 2048,
    },
  });

  if (error) {
    console.error('AI Edge Function error:', error);
    throw new Error('AI_REQUEST_FAILED');
  }

  if (data?.error) {
    console.error('AI API error:', data.error);
    throw new Error(data.error);
  }

  const result = data as AIResponse;

  // Log usage asynchronously (don't block the response)
  supabase.from('ai_usage_log').insert({
    tenant_id: DEMO_TENANT_ID,
    feature: options?.context ? 'contextual_chat' : 'chat',
    model: result.model || keys.preferred_model,
    prompt_tokens: result.usage?.promptTokens || 0,
    completion_tokens: result.usage?.completionTokens || 0,
    total_tokens: result.usage?.totalTokens || 0,
    request_context: options?.context?.substring(0, 500) || null,
  }).then(() => {}).catch(() => {});

  return result;
}

/**
 * Generate AI insights for dashboard using actual data
 */
export async function generateDashboardInsights(
  dashboardData: Record<string, unknown>
): Promise<string> {
  const context = `Dashboard Data Summary:
- Total Revenue: ${dashboardData.totalRevenue || 'N/A'}
- Active Clients: ${dashboardData.activeClients || 'N/A'}
- Team Utilization: ${dashboardData.teamUtilization || 'N/A'}
- Pending Deliverables: ${dashboardData.pendingDeliverables || 'N/A'}
- Overdue Invoices: ${dashboardData.overdueInvoices || 'N/A'}
- Active Campaigns: ${dashboardData.activeCampaigns || 'N/A'}`;

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: 'Based on the current dashboard data, provide 3 key insights and recommendations. Keep each insight to 1-2 sentences. Format as JSON array with objects containing: type (warning/prediction/opportunity), title, description, confidence (number 0-100).',
    },
  ];

  const response = await sendAIMessage(messages, {
    context,
    maxTokens: 1024,
    systemPrompt: `${TITAN_SYSTEM_PROMPT}\n\nIMPORTANT: Respond ONLY with valid JSON array. No markdown, no code blocks, just the JSON array.`,
  });

  return response.response;
}

/**
 * Generate AI suggestions for client health
 */
export async function analyzeClientHealth(
  clientData: Record<string, unknown>
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: `Analyze this client's health and provide recommendations:\n${JSON.stringify(clientData, null, 2)}`,
    },
  ];

  const response = await sendAIMessage(messages, { maxTokens: 1024 });
  return response.response;
}

/**
 * Test AI API key validity
 */
export async function testAIConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('supabase-functions-ai-chat', {
      body: {
        messages: [{ role: 'user', content: 'Hello, respond with "Connection successful" in one line.' }],
        apiKey,
        model: 'gemini-2.0-flash',
        maxTokens: 50,
      },
    });

    if (error || data?.error) {
      return { success: false, message: data?.error || error?.message || 'Connection failed' };
    }

    return { success: true, message: data?.response || 'Connected successfully' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Connection test failed' };
  }
}
