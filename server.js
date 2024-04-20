import express from "express";
import bodyParser from "body-parser";
import { MongoClient } from "mongodb";
import { createClient } from "redis";

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = createClient();
redisClient.on("error", (err) => console.log("Redis Client Error", err));
await redisClient.connect();
console.log("Connected to Redis");
await redisClient.flushAll(); // Clear Redis cache
console.log("Cleared Redis cache");

app.use(bodyParser.json());

// Connect to MongoDB
const mongo = await MongoClient.connect("mongodb://localhost:27017/");
const db = mongo.db("nearbyPrices");
console.log("Connected to MongoDB");

// Cache all items and prices to Redis
const cacheAllItemsAndPrices = async () => {
  try {
    const allItems = await db.collection("items").find({}).toArray();
    console.log("All items fetched from MongoDB", allItems.length);
    for (const item of allItems) {
      await redisClient.set(
        `item:${item.item_id}`,
        JSON.stringify(item.prices),
      ); // Cache for 1 hour
    }
    console.log("All items and prices cached to Redis");
  } catch (error) {
    console.error("Error caching items and prices to Redis:", error);
  }
};

// Fetch item prices from Redis cache or MongoDB
const getItemPrices = async (itemId, callback) => {
  console.log("Fetching item prices for item ID:", itemId);
  const results = await redisClient.get(`item:${itemId}`);
  if (results) {
    console.log("Item prices fetched from Redis cache");
    callback(null, JSON.parse(results));
  } else {
    console.log("Item prices not found in Redis cache. Fetching from MongoDB");
    const item = await db.collection("items").findOne({ item_id: itemId });
    if (item) {
      console.log("Item prices fetched from MongoDB");
      await redisClient.set(`item:${itemId}`, JSON.stringify(item.prices)); // Cache for 1 hour
      console.log("Item prices cached to Redis");
      callback(null, item.prices);
    } else {
      console.log("Item not found in MongoDB");
      callback({ error: "Item not found" }, null);
    }
  }
};

const recordUpdatedPrices = async (itemId, storeId, price) => {
  try {
    await redisClient.hset(`updated_prices:${itemId}`, storeId, price);
    console.log(
      `Updated price recorded for item ${itemId} at store ${storeId}: ${price}`,
    );
  } catch (error) {
    console.error("Error recording updated price:", error);
  }
};

const getFullHistory = async () => {
  // get everything from hset
  const keys = await redisClient.keys("updated_prices:*");
  const results = await Promise.all(
    keys.map((key) => redisClient.hgetall(key)),
  );
  return results;
};

// API endpoint to fetch item prices
app.get("/api/items/:id/prices", async (req, res) => {
  const itemId = req.params.id;
  console.log("GET /api/items/:id/prices", itemId);
  await getItemPrices(itemId, (err, prices) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.json(prices);
  });
});

// Update price of an item given item ID and store ID
app.put("/api/items/:itemId/prices/:storeId", async (req, res) => {
  const { itemId, storeId } = req.params;
  const { price } = req.body;
  console.log("PUT /api/items/:itemId/prices/:storeId", itemId, storeId, price);
  if (!itemId || !storeId || !price) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    // Check if the item exists
    console.log("Checking if the item exists", itemId);
    const item = await db
      .collection("items")
      .findOne({ item_id: Number(itemId) });
    console.log("Item found", item);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    // Check if the store exists for the item
    const storeIndex = item.prices.findIndex(
      (price) => String(price.store.store_id) === String(storeId),
    );
    console.log("Store index", storeIndex);
    if (storeIndex === -1) {
      res.status(404).json({ error: "Store not found for the item" });
      return;
    }

    // Update the price in MongoDB
    await db
      .collection("items")
      .updateOne(
        { item_id: Number(itemId), "prices.store.store_id": Number(storeId) },
        { $set: { "prices.$.price": Number(price) } },
      );

    await recordUpdatedPrices(itemId, storeId, price);

    // Fetch the updated item from MongoDB
    const updatedItem = await db
      .collection("items")
      .findOne({ item_id: Number(itemId) });
    console.log("Updated item", updatedItem);
    // Cache the updated item in Redis
    redisClient.set(`item:${itemId}`, JSON.stringify(updatedItem.prices)); // Cache for 1 hour
    console.log("Item prices updated in Redis cache");

    res.json({ message: "Price updated successfully" });
  } catch (error) {
    console.error("Error updating price:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/items/history", async (req, res) => {
  console.log("GET /api/items/history");
  const results = await getFullHistory();
  if (!results) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  cacheAllItemsAndPrices();
});
