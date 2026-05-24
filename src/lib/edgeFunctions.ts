/**
 * Edge Functions Integration Module
 * Maneja todas las llamadas a Edge Functions de Supabase
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Envía notificación de pedido por email
 */
export async function sendOrderNotification(
  orderId: string,
  clientName: string,
  printType: string,
  quantity: number,
  predictedHours: number,
  status: string,
  email: string
) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-order-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          client_name: clientName,
          print_type: printType,
          quantity,
          predicted_hours: predictedHours,
          status,
          email,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✉️ Notificación enviada:", data);
    return data;
  } catch (error) {
    console.error("Error enviando notificación:", error);
    throw error;
  }
}

/**
 * Procesa webhook de orden
 */
export async function processOrderWebhook(
  event: "order_created" | "order_started" | "order_completed" | "order_cancelled",
  orderId: string,
  data: Record<string, unknown> = {} // ✨ Aquí está la corrección aplicada
) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/process-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          event,
          order_id: orderId,
          data,
          timestamp: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`🔗 Webhook procesado (${event}):`, result);
    return result;
  } catch (error) {
    console.error("Error procesando webhook:", error);
    throw error;
  }
}

/**
 * Envía notificación al crear pedido
 */
export async function notifyOrderCreated(
  orderId: string,
  clientName: string,
  printType: string,
  quantity: number,
  predictedHours: number,
  userEmail: string
) {
  try {
    // Enviar notificación
    await sendOrderNotification(
      orderId,
      clientName,
      printType,
      quantity,
      predictedHours,
      "pendiente",
      userEmail
    );

    // Procesar webhook
    await processOrderWebhook("order_created", orderId, {
      client_name: clientName,
      print_type: printType,
      quantity,
      predicted_hours: predictedHours,
    });

    return { success: true };
  } catch (error) {
    console.error("Error en notifyOrderCreated:", error);
    // No lanzar error para no bloquear el flujo principal
    return { success: false, error };
  }
}

/**
 * Notifica inicio de producción
 */
export async function notifyOrderStarted(orderId: string) {
  try {
    await processOrderWebhook("order_started", orderId);
    return { success: true };
  } catch (error) {
    console.error("Error en notifyOrderStarted:", error);
    return { success: false, error };
  }
}

/**
 * Notifica completación de pedido
 */
export async function notifyOrderCompleted(orderId: string) {
  try {
    await processOrderWebhook("order_completed", orderId);
    return { success: true };
  } catch (error) {
    console.error("Error en notifyOrderCompleted:", error);
    return { success: false, error };
  }
}

/**
 * Notifica cancelación de pedido
 */
export async function notifyOrderCancelled(orderId: string) {
  try {
    await processOrderWebhook("order_cancelled", orderId);
    return { success: true };
  } catch (error) {
    console.error("Error en notifyOrderCancelled:", error);
    return { success: false, error };
  }
}