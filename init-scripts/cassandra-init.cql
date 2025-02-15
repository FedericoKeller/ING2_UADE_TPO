CREATE KEYSPACE IF NOT EXISTS ecommerce
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE ecommerce;

CREATE TABLE IF NOT EXISTS price_history (
    product_id text,
    timestamp timestamp,
    price decimal,
    currency text,
    PRIMARY KEY (product_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);

CREATE TABLE IF NOT EXISTS product_changes (
    product_id text,
    timestamp timestamp,
    change_type text,
    old_value text,
    new_value text,
    PRIMARY KEY (product_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC); 