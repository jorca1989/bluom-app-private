import Client from 'shopify-buy';

// Use the environment variables we defined in Step 1
const domain = process.env.EXPO_PUBLIC_SHOPIFY_DOMAIN || 'bluom-3362.myshopify.com';
const storefrontAccessToken = process.env.EXPO_PUBLIC_SHOPIFY_ACCESS_TOKEN || '2b9d2f07b445e898303f731ba7d1a90b';

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