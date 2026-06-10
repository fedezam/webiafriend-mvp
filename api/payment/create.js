export default async function handler(req, res) {
  const { amount, description, name } = req.query;

  if (!amount || !description) {
    return res.status(400).json({ error: "amount y description requeridos" });
  }

  const preference = {
    items: [{
      title: description,
      quantity: 1,
      currency_id: "ARS",
      unit_price: parseFloat(amount)
    }],
    payer: {
      name: name || "Cliente"
    },
    back_urls: {
      success: `https://webiafriend-mvp.vercel.app/portal.html?status=payment_ok&name=${encodeURIComponent(name || "Cliente")}`,
      failure: `https://webiafriend-mvp.vercel.app/portal.html?status=payment_failure`,
      pending: `https://webiafriend-mvp.vercel.app/portal.html?status=payment_pending`
    },
    auto_return: "approved"
  };

  const mpRes = await fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preference)
    }
  );

  const mpData = await mpRes.json();

  if (mpData.init_point) {
    return res.redirect(mpData.init_point);
  }

  return res.status(500).json({
    error: "Error creando preferencia",
    detail: mpData
  });
}
