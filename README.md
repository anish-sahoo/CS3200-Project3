# Project 3

## Documentation

- [Requirements Document](RequirementsDocument.pdf)

One possible way to use Redis would be to store item data so that I don’t have to query the database every time I want to show the items. Also, this way when I update the price, it is much quicker as I don’t have to do many CRUD queries on Mongo. This will help reduce resource use in my server, and help speed up API response times.

I am planning to use a hash to implement CRUD, and also use regular SET/GET.

```
HSET item_prices:<item_id> store_id price
HGET item_prices:<item_id> store_id
```
