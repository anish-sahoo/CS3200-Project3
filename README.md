# Project 3

## Documentation
- [Requirements Document]()

I am planning to use a Hash, and the key would be the item-id. I would use HSET & HGET to implement CRUD:

```
HSET item_prices:<item_id> price_data <JSON representation of prices>
HGET item_prices:<item_id> price_data
```
