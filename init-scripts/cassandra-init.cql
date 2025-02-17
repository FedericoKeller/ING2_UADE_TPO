-- Drop keyspace if exists to ensure a clean state
DROP KEYSPACE IF EXISTS ecommerce;

-- Create keyspace
CREATE KEYSPACE ecommerce
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
AND durable_writes = true;

-- Switch to the keyspace
USE ecommerce;

-- Create price_history table
CREATE TABLE price_history (
    product_id text,
    timestamp timestamp,
    price decimal,
    currency text,
    PRIMARY KEY (product_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND comment = 'Table for storing product price history';

-- Create product_changes table
CREATE TABLE product_changes (
    product_id text,
    timestamp timestamp,
    change_type text,
    old_value text,
    new_value text,
    PRIMARY KEY (product_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND comment = 'Table for storing product changes history';

-- Create invoice_operations table
CREATE TABLE invoice_operations (
    invoice_id text,
    order_id text,
    user_id text,
    operation text,
    amount decimal,
    timestamp timestamp,
    status text,
    details text,
    PRIMARY KEY ((invoice_id), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND comment = 'Table for storing invoice operations and audit trail';

-- Create secondary indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_invoice_ops_user ON invoice_operations (user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_ops_order ON invoice_operations (order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_ops_status ON invoice_operations (status); 