export const typeDefs = `#graphql
  # Intent status enum
  enum IntentStatus {
    PENDING
    COMPLETED
    FAILED
  }

  # Intent type enum
  enum IntentType {
    TRANSACTION
  }

  # Asset type enum
  enum AssetType {
    BTC
    BRC20
    RUNE
    ALKANE
    COLLECTIBLE
  }

  # Transaction type enum
  enum TransactionType {
    SEND
    RECEIVE
    TRADE
    LIST
    CLAIM
  }

  # BRC20 operation enum
  enum BRC20Operation {
    DEPLOY
    MINT
    TRANSFER
  }

  # Rune operation enum
  enum RuneOperation {
    ETCHING
    MINT
    TRANSFER
  }

  # Base intent interface
  interface Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
  }

  # Transaction intent
  type TransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
  }

  # BTC transaction intent
  type BTCTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    amount: Float!
  }

  # BRC20 transaction intent
  type BRC20TransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    ticker: String!
    tickerAmount: Float
    operation: BRC20Operation!
    max: Float
    limit: Float
  }

  # Rune etching transaction intent
  type RuneEtchingTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    operation: RuneOperation!
    runeName: String!
    inscription: CategorizedInscription
  }

  # Rune mint transaction intent
  type RuneMintTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    operation: RuneOperation!
    runeId: String!
    runeName: String!
    runeAmount: String!
    runeDivisibility: Int!
    inscription: CategorizedInscription
  }

  # Rune transfer transaction intent
  type RuneTransferTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    operation: RuneOperation!
    runeId: String!
    runeName: String!
    runeAmount: String!
    runeDivisibility: Int!
    inscription: CategorizedInscription
  }

  # Collectible transaction intent
  type CollectibleTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    inscriptionId: String!
    contentType: String!
    content: String!
    receiverAddress: String
  }

  # BRC20 trade transaction intent
  type BRC20TradeTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    ticker: String!
    tickerAmount: Float!
    totalPrice: Float!
  }

  # Rune trade transaction intent
  type RuneTradeTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    operation: RuneOperation!
    runeName: String!
    runeAmount: String!
    totalPrice: Float!
  }

  # Collectible trade transaction intent
  type CollectibleTradeTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    inscriptionId: String!
    contentType: String!
    content: String!
    totalPrice: Float!
  }

  # Collectible list transaction intent
  type CollectibleListTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    marketplace: String!
    inscriptionId: String!
    collectionName: String!
    inscriptionName: String!
    price: Float!
    listingId: String
  }

  # Collectible claim transaction intent
  type CollectibleClaimTransactionIntent implements Intent {
    id: ID!
    timestamp: Float!
    address: String!
    status: IntentStatus!
    reason: String
    type: IntentType!
    transactionType: TransactionType!
    assetType: AssetType!
    transactionIds: [String!]!
    btcAmount: Float!
    inscriptionId: String
    imageUrl: String!
    collectionName: String!
  }

  # Categorized inscription
  interface CategorizedInscription {
    id: ID!
    assetType: AssetType!
  }

  # BRC20 asset
  type Brc20Asset implements CategorizedInscription {
    id: ID!
    assetType: AssetType!
    p: String!
    op: String!
    amt: String!
    tick: String!
    max: String
    lim: String
  }

  # Collectible asset
  type CollectibleAsset implements CategorizedInscription {
    id: ID!
    assetType: AssetType!
    content_type: String!
    content: String!
  }

  # Transaction details
  type TransactionDetails {
    txid: String!
    blockHeight: Int
    blockHash: String
    blockTime: Float
    confirmed: Boolean!
    fee: Float
    size: Int
    weight: Int
    inputs: [TransactionInput!]!
    outputs: [TransactionOutput!]!
  }

  # Transaction input
  type TransactionInput {
    txid: String!
    vout: Int!
    address: String
    value: Float
  }

  # Transaction output
  type TransactionOutput {
    address: String
    value: Float
    scriptPubKey: String!
  }

  # Intent details
  type IntentDetails {
    intent: Intent!
    transactions: [TransactionDetails!]!
    totalFee: Float!
    totalSize: Int!
    totalVirtualSize: Float!
    confirmationTime: Float
    externalAddress: String
  }

  # Activity feed item
  type ActivityFeedItem {
    id: ID!
    type: IntentType!
    status: IntentStatus!
    address: String!
    timestamp: Float!
    assetType: AssetType!
    transactionType: TransactionType!
    transactionIds: [String!]!
    btcAmount: Float!
    assetData: JSON
  }

  # JSON scalar type
  scalar JSON

  # Queries
  type Query {
    # Get all intents for an address
    getIntentsByAddress(address: String!): [Intent!]!
    
    # Get intent by ID
    getIntentById(id: ID!): Intent
    
    # Get intent details by ID
    getIntentDetails(id: ID!): IntentDetails
    
    # Get activity feed for an address
    getActivityFeed(address: String!, limit: Int, offset: Int): [ActivityFeedItem!]!
    
    # Get transaction details by ID
    getTransactionById(txid: String!): TransactionDetails
  }

  # Mutations
  type Mutation {
    # Update intent status
    updateIntentStatus(id: ID!, status: IntentStatus!, reason: String): Intent!
    
    # Add transaction ID to intent
    addTransactionToIntent(id: ID!, txid: String!): Intent!
  }

  # Subscriptions
  type Subscription {
    # Subscribe to intent updates for an address
    intentUpdated(address: String!): Intent!
    
    # Subscribe to new intents for an address
    newIntent(address: String!): Intent!
    
    # Subscribe to activity feed updates for an address
    activityFeedUpdated(address: String!): ActivityFeedItem!
  }
`;