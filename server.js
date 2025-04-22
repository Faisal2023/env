require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// 🌟 Function: Get Pathao Access Token
async function getPathaoToken() {
  try {
    const response = await axios.post(`https://api-hermes.pathao.com/aladdin/api/v1/issue-token`, {
      client_id: process.env.PATHAO_CLIENT_ID,
      client_secret: process.env.PATHAO_CLIENT_SECRET,
      grant_type: 'password',
      username: process.env.PATHAO_USERNAME,
      password: process.env.PATHAO_PASSWORD
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('✅ Pathao Token Generated');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Error fetching Pathao token:', error.response ? error.response.data : error.message);
    throw new Error('Could not authenticate with Pathao');
  }
}

// 🌟 Function: Create Order in Pathao
async function createPathaoOrder(pathaoToken, shopifyOrder) {
  try {
    const orderPayload = {
      store_id: parseInt(process.env.PATHAO_STORE_ID),
      merchant_order_id: shopifyOrder.id.toString(),
      recipient_name: `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`,
      recipient_phone: shopifyOrder.customer.phone || shopifyOrder.billing_address.phone,
      recipient_address: `${shopifyOrder.shipping_address.address1}, ${shopifyOrder.shipping_address.city}`,
      recipient_city: parseInt(process.env.PATHAO_CITY_ID),
      recipient_zone: parseInt(process.env.PATHAO_ZONE_ID),
      recipient_area: parseInt(process.env.PATHAO_AREA_ID),
      delivery_type: 48, // Regular Delivery
      item_type: 2, // Parcel
      special_instruction: '',
      item_quantity: shopifyOrder.line_items.length,
      item_weight: "0.5",
      item_description: shopifyOrder.line_items.map(item => item.name).join(', '),
      amount_to_collect: parseFloat(shopifyOrder.total_price)
    };

    const response = await axios.post(`https://api-hermes.pathao.com/aladdin/api/v1/orders`, orderPayload, {
      headers: {
        Authorization: `Bearer ${pathaoToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Order Created in Pathao:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating Pathao order:', error.response ? error.response.data : error.message);
    throw new Error('Could not create order in Pathao');
  }
}

// 🌟 Route: Shopify Webhook Listener
app.post('/webhook', async (req, res) => {
  try {
    const shopifyOrder = req.body;
    console.log('📦 Received Shopify Order:', shopifyOrder.id);

    const pathaoToken = await getPathaoToken();
    const pathaoOrder = await createPathaoOrder(pathaoToken, shopifyOrder);

    res.status(200).send('Order received and processed successfully');
  } catch (error) {
    console.error('❌ Failed to process Shopify order:', error.message);
    res.status(500).send('Failed to process order');
  }
});

// 🌟 Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
