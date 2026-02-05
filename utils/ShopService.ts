import client from './shopify';

export const ShopService = {
  fetchAllProducts: async () => {
    try {
      const products = await client.product.fetchAll();
      return products;
    } catch (error) {
      console.error('Error fetching products from Shopify:', JSON.stringify(error, null, 2));
      if ((error as any)?.message) console.error('Shopify Error Message:', (error as any).message);
      return [];
    }
  },

  createCheckout: async () => {
    try {
      const checkout = await client.checkout.create();
      return checkout;
    } catch (error) {
      console.error('Error creating checkout:', JSON.stringify(error, null, 2));
      return null;
    }
  },

  testConnection: async () => {
    try {
      console.log('Testing Shopify connection...');
      const shop = await client.shop.fetchInfo();
      console.log('Shop connection successful:', JSON.stringify(shop, null, 2));
      return shop;
    } catch (error) {
      console.error('Shop connection failed:', JSON.stringify(error, null, 2));
      if ((error as any)?.message) console.error('Connection Error Message:', (error as any).message);
      return null;
    }
  }
};
