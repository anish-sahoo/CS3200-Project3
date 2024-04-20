import axios from "axios";

const BASE_URL = "http://localhost:3000";

// Function to fetch item prices
const getItemPrices = async (itemId) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/items/${itemId}/prices`);
    const prices = response.data;
    console.log("Item Prices:", prices);
  } catch (error) {
    console.error("Error fetching item prices:", error);
  }
};

// Function to update item price
const updateItemPrice = async (itemId, storeId, price) => {
  try {
    const response = await axios.put(`${BASE_URL}/api/items/${itemId}/prices/${storeId}`, { price });
    console.log("Update Response:", response.data);
  } catch (error) {
    console.error("Error updating item price:", error.response.data);
  }
};

// Test data
const itemId = 1; // Item ID
const storeId = 95; // Store ID
const newPrice = 19.99; // New price

// Fetch item prices
await getItemPrices(itemId);

// Update item price
await updateItemPrice(itemId, storeId, newPrice);

await getItemPrices(itemId);