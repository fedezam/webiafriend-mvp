// ============================================
// api/export-json.js - Vercel Serverless Function
// Genera JSON del comercio y lo guarda en Vercel KV
// ============================================

import admin from 'firebase-admin';
import { kv } from '@vercel/kv';

// ═══════════════════════════════════════════════════════
// 🔧 Inicializar Firebase Admin (solo una vez)
// ═══════════════════════════════════════════════════════
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// ═══════════════════════════════════════════════════════
// 🎯 HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { comercioId, userId } = req.body;
    
    if (!comercioId) return res.status(400).json({ error: 'comercioId requerido' });
    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    console.log('📦 Generando JSON para comercio:', comercioId);

    // Generar el JSON desde Firebase
    const jsonData = await generateCommerceJSON(comercioId, userId);
    
    // Guardar en Vercel KV
    const result = await saveToVercelKV(jsonData, comercioId);

    console.log('✅ JSON actualizado en Vercel:', result.url);

    return res.status(200).json({ 
      success: true, 
      message: 'JSON actualizado correctamente',
      jsonData, 
      url: result.url,
      comercioId: result.comercioId
    });
  } catch (error) {
    console.error('❌ Error en export-json API:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message 
    });
  }
}

// ═══════════════════════════════════════════════════════
// 🏗️ GENERAR JSON DEL COMERCIO (FUNCIÓN AUXILIAR)
// ═══════════════════════════════════════════════════════
async function generateCommerceJSON(comercioId, userId) {
  const comercioRef = db.collection('comercios').doc(comercioId);
  const comercioSnap = await comercioRef.get();
  
  if (!comercioSnap.exists) {
    throw new Error("Comercio no encontrado");
  }

  const comercioData = comercioSnap.data();

  // ───────────────────────────────────────────────────────
  // 📦 Obtener productos (subcolección)
  // ───────────────────────────────────────────────────────
  const productosCol = comercioRef.collection('productos');
  const productosSnap = await productosCol.get();
  const productos = [];
  
  productosSnap.forEach(pSnap => {
    const p = pSnap.data();
    // Solo incluir productos activos (no pausados)
    if (!p.paused) {
      productos.push({ 
        id: pSnap.id, 
        ...p 
      });
    }
  });

  // ───────────────────────────────────────────────────────
  // 🎭 Construcción del SYSTEM_PROMPT
  // ───────────────────────────────────────────────────────
  const nombreIA = comercioData.aiName || "Asistente Virtual";
  const nombreComercio = comercioData.nombreComercio || "Mi Comercio";
  const personalidad = comercioData.aiConfig?.aiPersonality || "Amigable y cercano";
  const tono = comercioData.aiConfig?.aiTone || "Profesional";
  
  // Generar lista de productos para el prompt
  const productosLista = productos.slice(0, 20).map(p => 
    `• ${p.nombre}${p.precio ? ` - $${p.precio.toLocaleString('es-AR')}` : ''}`
  ).join('\n');

  const categoriasLista = (comercioData.categories || []).join(', ');

  // 🎯 SYSTEM PROMPT ESTRUCTURADO
  const systemPrompt = `ERES ${nombreIA.toUpperCase()} - ASISTENTE VIRTUAL DE ${nombreComercio.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 REGLA ABSOLUTA DE ORO:
ESTE JSON ES TU ÚNICA FUENTE DE VERDAD.
SOLO EXISTE LO QUE ESTÁ AQUÍ DECLARADO.
NUNCA INVENTES NADA.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 INVENTARIO COMPLETO (SOLO ESTOS):

${productos.length > 0 ? `✅ ${productos.length} PRODUCTOS:
${productosLista}` : '⚠️ Sin productos activos actualmente'}

${comercioData.categories?.length > 0 ? `\n📂 CATEGORÍAS: ${categoriasLista}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎭 TU IDENTIDAD:
• Nombre: ${nombreIA}
• Rol: ${comercioData.aiConfig?.aiRole || 'Empleado virtual amigable'}
• Tono: ${tono}
• Personalidad: ${personalidad}
• CRÍTICO: Nunca reveles que sos IA, bot o sistema
• Actuás como empleado humano del local

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 DATOS DEL LOCAL:
• Nombre: ${nombreComercio}
${comercioData.direccion ? `• Dirección: ${comercioData.direccion}${comercioData.ciudad ? `, ${comercioData.ciudad}` : ''}` : ''}
${comercioData.whatsapp ? `• WhatsApp: ${comercioData.whatsapp}` : ''}
${comercioData.telefono ? `• Teléfono: ${comercioData.telefono}` : ''}
${comercioData.instagram ? `• Instagram: ${comercioData.instagram}` : ''}
${comercioData.horarios?.length > 0 ? `• Horario: ${comercioData.horarios.join(', ')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 AL PRIMER MENSAJE:
Saludar con: "${comercioData.aiGreeting || comercioData.aiConfig?.aiGreeting || `¡Hola! Bienvenido a ${nombreComercio}. ¿En qué puedo ayudarte?`}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ TUS FUNCIONES:
1. Mostrar productos con precios exactos del JSON
2. Recomendar según preferencias del cliente
3. Informar sobre ${comercioData.paymentMethods?.length > 0 ? `métodos de pago disponibles: ${comercioData.paymentMethods.join(', ')}` : 'métodos de pago'}
4. Ayudar a personalizar pedidos
5. Generar link de WhatsApp cuando el cliente decida contactar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 PROHIBICIONES ABSOLUTAS:
1. Inventar productos no listados en el catálogo
2. Inventar o cambiar precios
3. Confirmar pedidos (solo generás link de WhatsApp)
4. Prometer tiempos exactos de entrega
5. Mencionar que sos IA, bot, JSON o sistema
6. Ofrecer productos que no estén en la lista
7. Responder sobre temas no relacionados con ${nombreComercio}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 SI PREGUNTAN POR PRODUCTO INEXISTENTE:
"No tenemos [producto]. ${comercioData.descripcion ? comercioData.descripcion + ' ' : ''}¿Te muestro las opciones disponibles?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 CUANDO CLIENTE DECIDE CONTACTAR:
1. Confirmar pedido/consulta completo con precios
2. Generar link de WhatsApp:
   https://wa.me/${comercioData.whatsapp?.replace(/\D/g, '')}?text=[mensaje_url_encoded]
   
Mensaje formato:
"Hola! Vengo de ${nombreComercio} 👋

[Consulta o pedido del cliente]

¡Gracias!"

3. Responder:
"¡Perfecto! Te armo el mensaje para que contactes directo:

👇 Clickeá acá:
[link]

El mensaje ya tiene todos los detalles. Solo envialo y te responden al toque 🚀"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ CHECKLIST ANTES DE CADA RESPUESTA:
□ ¿Producto existe en el catálogo? → Si NO: no mencionar
□ ¿Precio exacto del JSON? → Verificar
□ ¿Estoy inventando algo? → Eliminar
□ ¿Hablo como empleado humano? → Ajustar
□ ¿Menciono JSON/IA/bot? → NUNCA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECORDÁ: Este JSON es tu universo completo. No existe nada más allá de él. Mantené tu rol de empleado ${tono.toLowerCase()} en todo momento.`;

  // ───────────────────────────────────────────────────────
  // 🏗️ Construcción del JSON final
  // ───────────────────────────────────────────────────────
  return {
    // Metadata administrativa
    metadata: {
      version: "3.0",
      generado: new Date().toISOString(),
      comercioId,
      userId,
      dueñoId: comercioData.dueñoId,
      total_productos: productos.length,
      plan: comercioData.plan || 'trial',
      activo: true
    },

    // Información del comercio
    comercio: {
      nombre: nombreComercio,
      descripcion: comercioData.descripcion || '',
      direccion: comercioData.direccion || '',
      ciudad: comercioData.ciudad || '',
      provincia: comercioData.provincia || '',
      pais: comercioData.pais || 'Argentina',
      barrio: comercioData.barrio || '',
      telefono: comercioData.telefono || '',
      whatsapp: comercioData.whatsapp || '',
      email: comercioData.email || '',
      website: comercioData.website || '',
      instagram: comercioData.instagram || '',
      facebook: comercioData.facebook || '',
      tiktok: comercioData.tiktok || '',
      horarios: comercioData.horarios || [],
      metodos_pago: comercioData.paymentMethods || [],
      categorias: comercioData.categories || [],
      plan: comercioData.plan || 'trial',
      
      // 🎯 Campos clave para /api/start
      entidadZinnia: systemPrompt,
      entidad: systemPrompt,
      instrucciones_ia: systemPrompt
    },

    // Catálogo de productos (compatible con /api/start)
    productos: productos,
    
    // También como "tratamientos" para compatibilidad
    tratamientos: productos.map(p => ({
      nombre: p.nombre,
      duracion: p.duracion || '',
      precio: p.precio || '',
      descripcion: p.descripcion || '',
      categoria: p.categoria || '',
      imagen: p.imagen || ''
    })),

    // Configuración del asistente IA
    asistente_ia: {
      nombre: nombreIA,
      personalidad: personalidad,
      tono: tono,
      saludo_inicial: comercioData.aiGreeting || comercioData.aiConfig?.aiGreeting || `¡Hola! ¿En qué puedo ayudarte?`,
      configuracion: {
        precios_pausados: comercioData.aiConfig?.pricesPaused || false,
        comportamiento_sin_precio: comercioData.aiConfig?.noPriceBehavior || "contact",
        comportamiento_pausados: comercioData.aiConfig?.pausedBehavior || "hide"
      },
      fecha_actualizacion: new Date().toISOString()
    },

    // 🎯 SYSTEM PROMPT - Campo crítico para GPT
    SYSTEM_PROMPT: systemPrompt,

    // Instrucciones detalladas
    INSTRUCCIONES_IA: {
      saludo_inicial: comercioData.aiGreeting || `¡Hola! Bienvenido a ${nombreComercio}`,
      mostrar_menu: "Mostrar productos con nombres, descripciones y precios. Organizar por categorías si existen.",
      personalizaciones: "Ayudar al cliente según sus preferencias y necesidades",
      cuando_cliente_decide: {
        accion: "GENERAR_LINK_WHATSAPP",
        base_url: `https://wa.me/${comercioData.whatsapp?.replace(/\D/g, '')}`,
        formato_mensaje: `Hola! Vengo de ${nombreComercio}\n\n{detalle_consulta}\n\n¡Gracias!`,
        mensaje_despedida: "¡Perfecto! Te armo el mensaje para que contactes directo:\n\n👇 Clickeá acá:\n{link_whatsapp}\n\nEl mensaje ya tiene todos los detalles. Solo envialo y te responden al toque 🚀"
      },
      restricciones_criticas: [
        "NUNCA confirmar pedidos - solo generar link de WhatsApp",
        "NUNCA inventar productos, precios o información no presente en el JSON",
        "NUNCA mencionar que sos una IA, bot o sistema - actuar como empleado humano",
        "SOLO responder sobre productos que existen en el catálogo",
        "SI preguntan por productos inexistentes, responder: 'No tenemos [producto]. ¿Te puedo mostrar nuestras opciones disponibles?'"
      ]
    }
  };
}

// ═══════════════════════════════════════════════════════
// 💾 GUARDAR EN VERCEL KV (FUNCIÓN AUXILIAR)
// ═══════════════════════════════════════════════════════
async function saveToVercelKV(jsonData, comercioId) {
  const key = `comercio:${comercioId}`;
  
  // Guardar en Vercel KV (Redis)
  await kv.set(key, jsonData);
  
  // Construir URL pública del endpoint
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.BASE_URL || 'http://localhost:3000';
  
  const publicUrl = `${baseUrl}/api/comercio/${comercioId}`;
  
  // Actualizar URL en Firestore
  const comercioRef = db.collection('comercios').doc(comercioId);
  await comercioRef.update({ 
    jsonUrl: publicUrl,
    lastJsonUpdate: new Date().toISOString()
  });

  return { 
    success: true, 
    url: publicUrl,
    comercioId
  };
}
