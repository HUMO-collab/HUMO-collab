import { workflow, node, trigger, sticky, placeholder, newCredential, switchCase, languageModel, outputParser, expr } from '@n8n/workflow-sdk';

// ─── TRIGGERS ─────────────────────────────────────────────────────────────────

const leadWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'New Property Lead',
    parameters: {
      httpMethod: 'POST',
      path: 'estates/lead',
      responseMode: 'onReceived'
    }
  },
  output: [{
    body: {
      name: 'Thabo Nkosi',
      email: 'thabo@email.com',
      phone: '+27831234567',
      budget: '2500000',
      property_type: 'apartment',
      location: 'Sandton',
      timeline: '3 months',
      message: 'Looking for a 2-bed apartment near Sandton under R2.5M'
    }
  }]
});

const dailyFollowUpTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Daily 8AM Follow-Up Check',
    parameters: {
      rule: {
        interval: [{ field: 'days', triggerAtHour: 8, triggerAtMinute: 0, daysInterval: 1 }]
      }
    }
  },
  output: [{}]
});

// ─── NORMALIZE PAYLOAD ────────────────────────────────────────────────────────

const normalizeLead = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize Lead Payload',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'a1', name: 'name', value: expr('{{ $json.body?.name ?? $json.name ?? "Unknown" }}'), type: 'string' },
          { id: 'a2', name: 'email', value: expr('{{ $json.body?.email ?? $json.email ?? "" }}'), type: 'string' },
          { id: 'a3', name: 'phone', value: expr('{{ $json.body?.phone ?? $json.phone ?? "" }}'), type: 'string' },
          { id: 'a4', name: 'budget', value: expr('{{ $json.body?.budget ?? $json.budget ?? "" }}'), type: 'string' },
          { id: 'a5', name: 'property_type', value: expr('{{ $json.body?.property_type ?? $json.property_type ?? "property" }}'), type: 'string' },
          { id: 'a6', name: 'location', value: expr('{{ $json.body?.location ?? $json.location ?? "" }}'), type: 'string' },
          { id: 'a7', name: 'timeline', value: expr('{{ $json.body?.timeline ?? $json.timeline ?? "" }}'), type: 'string' },
          { id: 'a8', name: 'message', value: expr('{{ $json.body?.message ?? $json.message ?? "" }}'), type: 'string' },
          { id: 'a9', name: 'received_at', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    }
  },
  output: [{
    name: 'Thabo Nkosi',
    email: 'thabo@email.com',
    phone: '+27831234567',
    budget: '2500000',
    property_type: 'apartment',
    location: 'Sandton',
    timeline: '3 months',
    message: 'Looking for a 2-bed apartment near Sandton under R2.5M',
    received_at: '2026-06-13T16:55:31.000Z'
  }]
});

// ─── AI LEAD QUALIFIER ────────────────────────────────────────────────────────

const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI GPT-5 Mini',
    parameters: {
      model: { __rl: true, mode: 'id', value: 'gpt-5-mini' }
    },
    credentials: { openAiApi: newCredential('OpenAI API') }
  }
});

const leadScoreParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Lead Score Parser',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "score": 85, "tier": "hot", "intent_summary": "Serious buyer with clear budget and short timeline", "recommended_action": "Call within 1 hour" }'
    }
  }
});

const aiQualifyLead = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'AI Lead Qualifier',
    parameters: {
      promptType: 'define',
      text: expr('Qualify this South African real estate lead:\n\nName: {{ $json.name }}\nBudget: R{{ $json.budget }}\nProperty Type: {{ $json.property_type }}\nLocation: {{ $json.location }}\nTimeline: {{ $json.timeline }}\nMessage: {{ $json.message }}\n\nScore 0-100. Classify as hot (80+), warm (40-79), or cold (<40).\nConsider: budget clarity, timeline urgency, location specificity, message seriousness.'),
      hasOutputParser: true,
      options: {
        systemMessage: 'You are a real estate lead qualifier for Patterniaq Estates, a South African property business. Analyze the lead and return structured JSON scoring only.'
      }
    },
    subnodes: {
      model: openAiModel,
      outputParser: leadScoreParser
    }
  },
  output: [{
    score: 85,
    tier: 'hot',
    intent_summary: 'Serious buyer with clear budget and short timeline',
    recommended_action: 'Call within 1 hour'
  }]
});

// ─── ATTACH ORIGINAL LEAD DATA TO AI SCORE ───────────────────────────────────

const attachLeadData = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Attach Lead Data to Score',
    parameters: {
      mode: 'manual',
      includeOtherFields: true,
      assignments: {
        assignments: [
          { id: 'b1', name: 'name', value: expr('{{ $("Normalize Lead Payload").item.json.name }}'), type: 'string' },
          { id: 'b2', name: 'email', value: expr('{{ $("Normalize Lead Payload").item.json.email }}'), type: 'string' },
          { id: 'b3', name: 'phone', value: expr('{{ $("Normalize Lead Payload").item.json.phone }}'), type: 'string' },
          { id: 'b4', name: 'budget', value: expr('{{ $("Normalize Lead Payload").item.json.budget }}'), type: 'string' },
          { id: 'b5', name: 'property_type', value: expr('{{ $("Normalize Lead Payload").item.json.property_type }}'), type: 'string' },
          { id: 'b6', name: 'location', value: expr('{{ $("Normalize Lead Payload").item.json.location }}'), type: 'string' },
          { id: 'b7', name: 'timeline', value: expr('{{ $("Normalize Lead Payload").item.json.timeline }}'), type: 'string' },
          { id: 'b8', name: 'message', value: expr('{{ $("Normalize Lead Payload").item.json.message }}'), type: 'string' },
          { id: 'b9', name: 'received_at', value: expr('{{ $("Normalize Lead Payload").item.json.received_at }}'), type: 'string' }
        ]
      }
    }
  },
  output: [{
    score: 85,
    tier: 'hot',
    intent_summary: 'Serious buyer with clear budget and short timeline',
    recommended_action: 'Call within 1 hour',
    name: 'Thabo Nkosi',
    email: 'thabo@email.com',
    phone: '+27831234567',
    budget: '2500000',
    property_type: 'apartment',
    location: 'Sandton',
    timeline: '3 months',
    message: 'Looking for a 2-bed apartment near Sandton under R2.5M',
    received_at: '2026-06-13T16:55:31.000Z'
  }]
});

// ─── SAVE LEAD TO SUPABASE ────────────────────────────────────────────────────

const saveToSupabase = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Save Lead to Supabase',
    parameters: {
      resource: 'row',
      operation: 'create',
      tableId: 'property_leads',
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'name', fieldValue: expr('{{ $json.name }}') },
          { fieldId: 'email', fieldValue: expr('{{ $json.email }}') },
          { fieldId: 'phone', fieldValue: expr('{{ $json.phone }}') },
          { fieldId: 'budget', fieldValue: expr('{{ $json.budget }}') },
          { fieldId: 'property_type', fieldValue: expr('{{ $json.property_type }}') },
          { fieldId: 'location', fieldValue: expr('{{ $json.location }}') },
          { fieldId: 'timeline', fieldValue: expr('{{ $json.timeline }}') },
          { fieldId: 'message', fieldValue: expr('{{ $json.message }}') },
          { fieldId: 'score', fieldValue: expr('{{ $json.score }}') },
          { fieldId: 'tier', fieldValue: expr('{{ $json.tier }}') },
          { fieldId: 'intent_summary', fieldValue: expr('{{ $json.intent_summary }}') },
          { fieldId: 'status', fieldValue: 'new' },
          { fieldId: 'received_at', fieldValue: expr('{{ $json.received_at }}') }
        ]
      }
    },
    credentials: { supabaseApi: newCredential('Supabase API') }
  },
  output: [{
    id: 'lead-uuid-1',
    created_at: '2026-06-13T16:55:31.000Z',
    name: 'Thabo Nkosi',
    email: 'thabo@email.com',
    phone: '+27831234567',
    budget: '2500000',
    property_type: 'apartment',
    location: 'Sandton',
    timeline: '3 months',
    message: 'Looking for a 2-bed apartment near Sandton under R2.5M',
    score: 85,
    tier: 'hot',
    intent_summary: 'Serious buyer with clear budget and short timeline',
    status: 'new',
    received_at: '2026-06-13T16:55:31.000Z'
  }]
});

// ─── ROUTE BY LEAD TIER ───────────────────────────────────────────────────────

const routeByTier = switchCase({
  version: 3.4,
  config: {
    name: 'Route by Lead Tier',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
            renameOutput: true,
            outputKey: 'Hot',
            conditions: {
              options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
              conditions: [{ leftValue: expr('{{ $json.tier }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'hot' }],
              combinator: 'and'
            }
          },
          {
            renameOutput: true,
            outputKey: 'Warm',
            conditions: {
              options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
              conditions: [{ leftValue: expr('{{ $json.tier }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'warm' }],
              combinator: 'and'
            }
          },
          {
            renameOutput: true,
            outputKey: 'Cold',
            conditions: {
              options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
              conditions: [{ leftValue: expr('{{ $json.tier }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'cold' }],
              combinator: 'and'
            }
          }
        ]
      },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'Unclassified' }
    }
  }
});

// ─── HOT LEAD BRANCH ─────────────────────────────────────────────────────────

const hotWhatsApp = node({
  type: 'n8n-nodes-base.whatsApp',
  version: 1.1,
  config: {
    name: 'WhatsApp — Hot Lead Alert',
    parameters: {
      resource: 'message',
      operation: 'send',
      phoneNumberId: placeholder('WhatsApp Business Phone Number ID'),
      recipientPhoneNumber: placeholder('Agent WhatsApp number e.g. +27821234567'),
      messageType: 'text',
      textBody: expr('🔥 HOT LEAD — Patterniaq Estates\n\n👤 {{ $json.name }}\n📞 {{ $json.phone }}\n📧 {{ $json.email }}\n🏠 {{ $json.property_type }} in {{ $json.location }}\n💰 R{{ $json.budget }} | ⏱ {{ $json.timeline }}\n\n"{{ $json.message }}"\n\n🎯 Score: {{ $json.score }}/100\n💡 {{ $json.intent_summary }}\n\n⚡ Call within 1 hour!')
    },
    credentials: { whatsAppApi: newCredential('WhatsApp Business API') }
  },
  output: [{ messages: [{ id: 'wamid.hot' }], messaging_product: 'whatsapp' }]
});

const hotEmail = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Gmail — Hot Lead Welcome Email',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Save Lead to Supabase").item.json.email }}'),
      subject: expr('{{ $("Save Lead to Supabase").item.json.name }}, your property match is ready — Patterniaq Estates'),
      emailType: 'html',
      message: expr('<h2>Hi {{ $("Save Lead to Supabase").item.json.name }},</h2><p>Thank you for reaching out to <strong>Patterniaq Estates</strong>.</p><p>We received your enquiry for a <strong>{{ $("Save Lead to Supabase").item.json.property_type }}</strong> in <strong>{{ $("Save Lead to Supabase").item.json.location }}</strong> with a budget of <strong>R{{ $("Save Lead to Supabase").item.json.budget }}</strong>.</p><p>An agent will call you <strong>within 60 minutes</strong>. We have strong listings in this area.</p><p>Warm regards,<br><strong>Patterniaq Estates</strong></p>'),
      options: { appendAttribution: false, senderName: 'Patterniaq Estates' }
    },
    credentials: { gmailOAuth2: newCredential('Gmail OAuth2') }
  },
  output: [{ id: 'msg-hot', labelIds: ['SENT'], threadId: 'thread-hot' }]
});

// ─── WARM LEAD BRANCH ─────────────────────────────────────────────────────────

const warmWhatsApp = node({
  type: 'n8n-nodes-base.whatsApp',
  version: 1.1,
  config: {
    name: 'WhatsApp — Warm Lead Alert',
    parameters: {
      resource: 'message',
      operation: 'send',
      phoneNumberId: placeholder('WhatsApp Business Phone Number ID'),
      recipientPhoneNumber: placeholder('Agent WhatsApp number e.g. +27821234567'),
      messageType: 'text',
      textBody: expr('🌡️ WARM LEAD — Patterniaq Estates\n\n👤 {{ $json.name }}\n📞 {{ $json.phone }}\n📧 {{ $json.email }}\n🏠 {{ $json.property_type }} in {{ $json.location }}\n💰 R{{ $json.budget }}\n\n🎯 Score: {{ $json.score }}/100\n💡 {{ $json.intent_summary }}\n\n📅 Follow up today')
    },
    credentials: { whatsAppApi: newCredential('WhatsApp Business API') }
  },
  output: [{ messages: [{ id: 'wamid.warm' }], messaging_product: 'whatsapp' }]
});

const warmEmail = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Gmail — Warm Lead Welcome Email',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Save Lead to Supabase").item.json.email }}'),
      subject: 'Your property search starts here — Patterniaq Estates',
      emailType: 'html',
      message: expr('<h2>Hi {{ $("Save Lead to Supabase").item.json.name }},</h2><p>Thanks for your interest in <strong>Patterniaq Estates</strong>. We received your enquiry for a <strong>{{ $("Save Lead to Supabase").item.json.property_type }}</strong> in <strong>{{ $("Save Lead to Supabase").item.json.location }}</strong>.</p><p>An agent will be in touch within <strong>24 hours</strong>.</p><p>Warm regards,<br><strong>Patterniaq Estates</strong></p>'),
      options: { appendAttribution: false, senderName: 'Patterniaq Estates' }
    },
    credentials: { gmailOAuth2: newCredential('Gmail OAuth2') }
  },
  output: [{ id: 'msg-warm', labelIds: ['SENT'], threadId: 'thread-warm' }]
});

// ─── COLD LEAD BRANCH ─────────────────────────────────────────────────────────

const coldEmail = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Gmail — Cold Lead Nurture Email',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Save Lead to Supabase").item.json.email }}'),
      subject: 'We will keep you posted — Patterniaq Estates',
      emailType: 'html',
      message: expr('<h2>Hi {{ $("Save Lead to Supabase").item.json.name }},</h2><p>Thank you for reaching out to <strong>Patterniaq Estates</strong>. We have added you to our property alerts list and will notify you when suitable listings in <strong>{{ $("Save Lead to Supabase").item.json.location }}</strong> become available.</p><p>When you are ready to take the next step, simply reply to this email.</p><p>Warm regards,<br><strong>Patterniaq Estates</strong></p>'),
      options: { appendAttribution: false, senderName: 'Patterniaq Estates' }
    },
    credentials: { gmailOAuth2: newCredential('Gmail OAuth2') }
  },
  output: [{ id: 'msg-cold', labelIds: ['SENT'], threadId: 'thread-cold' }]
});

// ─── DAILY FOLLOW-UP CHAIN ────────────────────────────────────────────────────

const fetchWarmLeads = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Fetch Uncontacted Warm Leads',
    parameters: {
      resource: 'row',
      operation: 'getAll',
      tableId: 'property_leads',
      returnAll: true,
      filterType: 'string',
      filterString: 'tier=eq.warm&status=eq.new'
    },
    credentials: { supabaseApi: newCredential('Supabase API') }
  },
  output: [{
    id: 'lead-uuid-2',
    name: 'Jane Dlamini',
    phone: '+27831111111',
    email: 'jane@email.com',
    tier: 'warm',
    score: 62,
    location: 'Pretoria',
    property_type: 'house'
  }]
});

const followUpReminder = node({
  type: 'n8n-nodes-base.whatsApp',
  version: 1.1,
  config: {
    name: 'WhatsApp — Daily Follow-Up Reminder',
    parameters: {
      resource: 'message',
      operation: 'send',
      phoneNumberId: placeholder('WhatsApp Business Phone Number ID'),
      recipientPhoneNumber: placeholder('Agent WhatsApp number e.g. +27821234567'),
      messageType: 'text',
      textBody: expr('⏰ FOLLOW-UP REMINDER — Patterniaq Estates\n\n{{ $json.name }} has not been contacted yet.\n📞 {{ $json.phone }} | 📧 {{ $json.email }}\n🏠 {{ $json.property_type }} in {{ $json.location }}\n🎯 Score: {{ $json.score }}/100\n\nCall today before this lead goes cold.')
    },
    credentials: { whatsAppApi: newCredential('WhatsApp Business API') }
  },
  output: [{ messages: [{ id: 'wamid.followup' }], messaging_product: 'whatsapp' }]
});

// ─── STICKY NOTES ─────────────────────────────────────────────────────────────

const titleNote = sticky(
  '## Patterniaq Estates — Lead Capture & AI Follow-Up Engine\n\n**Trigger 1:** Website POST → Normalize → AI scores 0-100 → Supabase → Route Hot/Warm/Cold → WhatsApp agent alert + lead email\n\n**Trigger 2 (Daily 8AM):** Fetch warm leads with status=new → WhatsApp reminder to agent\n\n**Credentials to configure:**\n- OpenAI API (GPT-5 Mini)\n- Supabase API (table: property_leads)\n- WhatsApp Business API\n- Gmail OAuth2',
  [],
  { color: 3 }
);

const pricingNote = sticky(
  '## Pricing This Workflow\n\n**Setup fee:** R8,500 once-off\n**Monthly retainer:** R2,800/mo\n\nRunning costs:\n- n8n VPS hosting: R400/mo\n- OpenAI API: ~R150/mo\n- WhatsApp Business: R150/mo\n- Supabase: R0 (free tier)\n- Your margin: ~R2,100/mo\n\nAvg SA property commission: R40,000 to R80,000+\n1 extra closed deal = 14 to 28x ROI on automation cost',
  [],
  { color: 5 }
);

// ─── COMPOSE WORKFLOW ─────────────────────────────────────────────────────────

export default workflow('patterniaq-estates-leads', 'Patterniaq Estates — Lead Capture & AI Follow-Up')
  .add(leadWebhook)
  .to(normalizeLead)
  .to(aiQualifyLead)
  .to(attachLeadData)
  .to(saveToSupabase)
  .to(routeByTier
    .onCase(0, hotWhatsApp.to(hotEmail))
    .onCase(1, warmWhatsApp.to(warmEmail))
    .onCase(2, coldEmail)
  )
  .add(dailyFollowUpTrigger)
  .to(fetchWarmLeads)
  .to(followUpReminder)
  .add(titleNote)
  .add(pricingNote);
