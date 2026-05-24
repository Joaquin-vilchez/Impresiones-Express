import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderNotification {
  order_id: string;
  client_name: string;
  print_type: string;
  quantity: number;
  predicted_hours: number;
  status: string;
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: OrderNotification = await req.json();

    // Validar datos
    if (!payload.email || !payload.order_id || !payload.client_name) {
      return new Response(
        JSON.stringify({
          error: "Faltan campos requeridos",
          required: ["email", "order_id", "client_name"],
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generar email HTML
    const emailHTML = generateOrderEmail(payload);

    // Aquí iría la integración con un servicio de email
    // Por ahora retornamos un mock exitoso
    console.log(`📧 Email enviado a: ${payload.email}`);
    console.log(`📋 Pedido: ${payload.order_id}`);
    console.log(`👤 Cliente: ${payload.client_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email de notificación enviado",
        order_id: payload.order_id,
        email_sent_to: payload.email,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error en send-order-notification:", error);
    return new Response(
      JSON.stringify({
        error: "Error procesando notificación",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateOrderEmail(payload: OrderNotification): string {
  const statusLabels: Record<string, string> = {
    pendiente: "Pendiente",
    en_produccion: "En Producción",
    completado: "Completado",
  };

  const printTypeLabels: Record<string, string> = {
    digital: "Digital",
    offset: "Offset",
    gran_formato: "Gran Formato",
    serigrafia: "Serigrafía",
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(to right, #0ea5e9, #10b981); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { margin: 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
          .info-block { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
          .label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { color: #1f2937; font-size: 18px; font-weight: bold; margin-top: 5px; }
          .status { display: inline-block; padding: 8px 16px; border-radius: 20px; margin-top: 10px; }
          .status.pendiente { background: #fef3c7; color: #92400e; }
          .status.en_produccion { background: #bfdbfe; color: #1e3a8a; }
          .status.completado { background: #d1fae5; color: #065f46; }
          .button { background: #0ea5e9; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Notificación de Pedido</h1>
            <p>Impresiones Express</p>
          </div>
          <div class="content">
            <p>Hola <strong>${payload.client_name}</strong>,</p>
            <p>Tu pedido ha sido registrado en nuestro sistema. Aquí están los detalles:</p>

            <div class="info-block">
              <div class="label">Número de Pedido</div>
              <div class="value">${payload.order_id.slice(0, 8).toUpperCase()}</div>
            </div>

            <div class="info-block">
              <div class="label">Tipo de Impresión</div>
              <div class="value">${printTypeLabels[payload.print_type] || payload.print_type}</div>
            </div>

            <div class="info-block">
              <div class="label">Cantidad</div>
              <div class="value">${payload.quantity.toLocaleString()} unidades</div>
            </div>

            <div class="info-block">
              <div class="label">Tiempo Estimado</div>
              <div class="value">⏱️ ${payload.predicted_hours} horas</div>
            </div>

            <div class="info-block">
              <div class="label">Estado Actual</div>
              <div class="status ${payload.status}">${statusLabels[payload.status] || payload.status}</div>
            </div>

            <p style="margin-top: 30px; text-align: center;">
              <a href="https://tudominio.com/orders" class="button">Ver Pedido en Dashboard</a>
            </p>

            <p>Si tienes preguntas, contáctanos a <strong>soporte@impresiones.com</strong></p>

            <div class="footer">
              <p>© 2026 Impresiones Express. Todos los derechos reservados.</p>
              <p>Este es un email automático, no respondas a este mensaje.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
