const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Function to get Pathao Access Token
async function getPathaoToken() {
  try {
    const response = await axios.post('https://api-hermes.pathao.com', {
      client_id: process.env.PATHAO_CLIENT_ID,
      client_secret: process.env.PATHAO_CLIENT_SECRET,
      grant_type: 'client_credentials'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching Pathao token:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Function to register Shopify Webhook
async function registerShopifyWebhook() {
  try {
    const response = await axios.post(`https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-04/webhooks.json`, {
      webhook: {
        topic: 'orders/create',
        address: 'https://env-k67r.onrender.com', // Change this to your server URL
        format: 'json'
      }
    }, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Shopify Webhook registered:', response.data.webhook.id);
  } catch (error) {
    console.error('❌ Error registering Shopify webhook:', error.response ? error.response.data : error.message);
  }
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const order = req.body;
  console.log('📦 New Order received from Shopify:', order.id);

  try {
    const pathaoToken = await getPathaoToken();

    const customerName = `${order.customer.first_name} ${order.customer.last_name}`;
    const customerPhone = order.customer.phone || order.billing_address.phone;
    const address = `${order.shipping_address.address1}, ${order.shipping_address.city}`;
    const price = order.total_price;

    const pathaoResponse = await axios.post('https://api.pathao.com//aladdin/api/v1/issue-token', {
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_address: address,
      item_price: price,
      // Add other required fields for Pathao
    }, {
      headers: {
        Authorization: `Bearer ${pathaoToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Delivery Order Created on Pathao:', pathaoResponse.data);
    res.status(200).send('Delivery order created successfully');
  } catch (error) {
    console.error('❌ Error sending order to Pathao:', error.response ? error.response.data : error.message);
    res.status(500).send('Error creating delivery');
  }
});

app.get('/', (req, res) => res.send('🚀 Shopify Pathao Integration Running!'));

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await registerShopifyWebhook();
});
