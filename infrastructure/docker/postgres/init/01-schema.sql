-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schema
CREATE SCHEMA IF NOT EXISTS wallet_intents;

-- Create tables
CREATE TABLE wallet_intents.intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  address VARCHAR(100) NOT NULL,
  timestamp BIGINT NOT NULL,
  asset_type VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  transaction_ids TEXT[] NOT NULL DEFAULT '{}',
  btc_amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
  reason TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_intents_address ON wallet_intents.intents(address);
CREATE INDEX idx_intents_status ON wallet_intents.intents(status);
CREATE INDEX idx_intents_timestamp ON wallet_intents.intents(timestamp DESC);
CREATE INDEX idx_intents_asset_type ON wallet_intents.intents(asset_type);
CREATE INDEX idx_intents_transaction_type ON wallet_intents.intents(transaction_type);
CREATE INDEX idx_intents_transaction_ids ON wallet_intents.intents USING GIN(transaction_ids);

-- Create table for transactions
CREATE TABLE wallet_intents.transactions (
  txid VARCHAR(64) PRIMARY KEY,
  block_height INTEGER,
  block_hash VARCHAR(64),
  block_time BIGINT,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  fee NUMERIC(20, 8),
  size INTEGER,
  weight INTEGER,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_confirmed ON wallet_intents.transactions(confirmed);
CREATE INDEX idx_transactions_block_time ON wallet_intents.transactions(block_time);

-- Create table for inscriptions
CREATE TABLE wallet_intents.inscriptions (
  id VARCHAR(100) PRIMARY KEY,
  content_type VARCHAR(100) NOT NULL,
  content TEXT,
  transaction_id VARCHAR(64) NOT NULL REFERENCES wallet_intents.transactions(txid),
  output_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for runes
CREATE TABLE wallet_intents.runes (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  divisibility INTEGER NOT NULL DEFAULT 0,
  etching_txid VARCHAR(64) NOT NULL REFERENCES wallet_intents.transactions(txid),
  block_height INTEGER NOT NULL,
  premine NUMERIC(38, 0),
  cap NUMERIC(38, 0),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for address balances
CREATE TABLE wallet_intents.address_balances (
  address VARCHAR(100) NOT NULL,
  asset_type VARCHAR(50) NOT NULL,
  asset_id VARCHAR(100) NOT NULL,
  balance NUMERIC(38, 0) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (address, asset_type, asset_id)
);

-- Create index for address balances
CREATE INDEX idx_address_balances_address ON wallet_intents.address_balances(address);
CREATE INDEX idx_address_balances_asset_type ON wallet_intents.address_balances(asset_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION wallet_intents.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update updated_at timestamp
CREATE TRIGGER update_intents_updated_at
BEFORE UPDATE ON wallet_intents.intents
FOR EACH ROW
EXECUTE FUNCTION wallet_intents.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON wallet_intents.transactions
FOR EACH ROW
EXECUTE FUNCTION wallet_intents.update_updated_at_column();

CREATE TRIGGER update_inscriptions_updated_at
BEFORE UPDATE ON wallet_intents.inscriptions
FOR EACH ROW
EXECUTE FUNCTION wallet_intents.update_updated_at_column();

CREATE TRIGGER update_runes_updated_at
BEFORE UPDATE ON wallet_intents.runes
FOR EACH ROW
EXECUTE FUNCTION wallet_intents.update_updated_at_column();

-- Create view for activity feed
CREATE OR REPLACE VIEW wallet_intents.activity_feed AS
SELECT 
  i.id,
  i.type,
  i.status,
  i.address,
  i.timestamp,
  i.asset_type,
  i.transaction_type,
  i.transaction_ids,
  i.btc_amount,
  i.reason,
  i.data,
  CASE 
    WHEN i.asset_type = 'btc' THEN NULL
    WHEN i.asset_type = 'brc-20' THEN (
      SELECT jsonb_build_object(
        'ticker', data->>'ticker',
        'amount', data->>'tickerAmount',
        'operation', data->>'operation'
      )
    )
    WHEN i.asset_type = 'rune' THEN (
      SELECT jsonb_build_object(
        'name', data->>'runeName',
        'amount', data->>'runeAmount',
        'operation', data->>'operation'
      )
    )
    WHEN i.asset_type = 'collectible' THEN (
      SELECT jsonb_build_object(
        'inscriptionId', data->>'inscriptionId',
        'contentType', data->>'contentType'
      )
    )
    ELSE NULL
  END AS asset_data
FROM wallet_intents.intents i
ORDER BY i.timestamp DESC;