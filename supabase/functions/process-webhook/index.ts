// ✨ Corrección 1: Agregamos @2 a la versión de Deno
import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WebhookPayload {
  event: string;
  order_id: string;
  // ✨ Corrección 2: Cambiamos any por unknown por reglas estrictas de TypeScript
  data: Record<string, unknown>;
  timestamp?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Validar evento
    const validEvents = ["order_created", "order_started", "order_completed", "order_cancelled"];
    if (!validEvents.includes(payload.event)) {
      return new Response(
        JSON.stringify({
          error: "Evento no válido",
          valid_events: validEvents,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Procesar según evento
    const result = await processEvent(payload);

    console.log(`✅ Webhook procesado: ${payload.event}`);
    console.log(`📋 Order: ${payload.order_id}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error en process-webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({
        error: "Error procesando webhook",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processEvent(payload: WebhookPayload) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  switch (payload.event) {
    case "order_created":
      return handleOrderCreated(supabase, payload);
    case "order_started":
      return handleOrderStarted(supabase, payload);
    case "order_completed":
      return await handleOrderCompleted(supabase, payload);
    case "order_cancelled":
      return handleOrderCancelled(supabase, payload);
    default:
      return { success: false, error: "Evento desconocido" };
  }
}

// ✨ Corrección 3: Quitamos 'async' porque no usa 'await', y ponemos _supabase (con guion bajo)
function handleOrderCreated(_supabase: SupabaseClient, payload: WebhookPayload) {
  console.log("📝 Nuevo pedido creado:", payload.order_id);
  return {
    success: true,
    event: "order_created",
    order_id: payload.order_id,
    message: "Pedido registrado exitosamente",
    timestamp: new Date().toISOString(),
  };
}

function handleOrderStarted(_supabase: SupabaseClient, payload: WebhookPayload) {
  console.log("🚀 Producción iniciada:", payload.order_id);
  return {
    success: true,
    event: "order_started",
    order_id: payload.order_id,
    message: "Producción iniciada",
    timestamp: new Date().toISOString(),
  };
}

// Este SÍ se queda con async porque usa await para conectarse a la base de datos
async function handleOrderCompleted(supabase: SupabaseClient, payload: WebhookPayload) {
  console.log("✅ Pedido completado:", payload.order_id);

  const { error } = await supabase
    .from("orders")
    .update({
      status: "completado",
      completed_at: new Date().toISOString(),
    })
    .eq("id", payload.order_id);

  if (error) {
    console.error("Error actualizando orden:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    event: "order_completed",
    order_id: payload.order_id,
    message: "Pedido marcado como completado",
    timestamp: new Date().toISOString(),
  };
}

function handleOrderCancelled(_supabase: SupabaseClient, payload: WebhookPayload) {
  console.log("❌ Pedido cancelado:", payload.order_id);
  return {
    success: true,
    event: "order_cancelled",
    order_id: payload.order_id,
    message: "Pedido cancelado",
    timestamp: new Date().toISOString(),
  };
}