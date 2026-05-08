import Client from 'shopify-buy';

// Use the environment variables we defined in Step 1
const domain = process.env.EXPO_PUBLIC_SHOPIFY_DOMAIN || 'bluom-3362.myshopify.com';
const storefrontAccessToken = process.env.EXPO_PUBLIC_SHOPIFY_ACCESS_TOKEN || 'c8159e4108e55bce3716cb1566b5dfff';

console.log('Connecting to shop:', domain);

if (!domain || !storefrontAccessToken) {
  throw new Error('Missing required Shopify environment variables');
}

const client = Client.buildClient({
  domain: domain,
  storefrontAccessToken: storefrontAccessToken,
  apiVersion: '2024-01' // Adding the version is required in newer SDKs
});

export default client;