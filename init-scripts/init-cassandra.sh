#!/bin/bash

# Wait for Cassandra to be ready
until cqlsh -e "describe keyspaces" > /dev/null 2>&1; do
  echo "Waiting for Cassandra to be ready..."
  sleep 5
done

echo "Cassandra is ready. Creating keyspace and tables..."

# Create keyspace and tables
cqlsh -e "
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

CREATE TABLE IF NOT EXISTS invoice_operations (
    invoice_id text,
    order_id text,
    user_id text,
    operation text,
    amount decimal,
    timestamp timestamp,
    status text,
    details text,
    PRIMARY KEY ((invoice_id), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_ops_user ON invoice_operations (user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_ops_order ON invoice_operations (order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_ops_status ON invoice_operations (status);
"

echo "Initialization completed successfully." 