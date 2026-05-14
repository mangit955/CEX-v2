import {
  BALANCES,
  ORDERBOOKS,
  ORDERS,
  FILLS,
  type OrderBook,
  type CreateOrderInput,
  type OrderRecord,
  type RestingOrder,
  type DepthResponse,
} from "../store/exchange-store";

function getOrCreateOrderBook(symbol: string): OrderBook {
  let orderBook = ORDERBOOKS.get(symbol);

  if (!orderBook) {
    orderBook = {
      bids: new Map(),
      asks: new Map(),
    };

    ORDERBOOKS.set(symbol, orderBook);
  }
  return orderBook;
}

export function createOrder(input: CreateOrderInput) {
  const orderId = crypto.randomUUID();

  const order: OrderRecord = {
    orderId,
    userId: input.userId,
    side: input.side,
    type: input.type,
    symbol: input.symbol,
    price: input.price,
    qty: input.qty,
    filledQty: 0,
    status: "open",
    fills: [],
    createdAt: Date.now(),
  };

  ORDERS.set(orderId, order);

  if (input.type === "limit" && input.price !== null) {
    const orderBook = getOrCreateOrderBook(input.symbol);

    const restingOrder: RestingOrder = {
      orderId,
      userId: input.userId,
      side: input.side,
      type: "limit",
      symbol: input.symbol,
      price: input.price,
      qty: input.qty,
      filledQty: 0,
      status: "open",
      createdAt: Date.now(),
    };

    const bookSide = input.side === "buy" ? orderBook.bids : orderBook.asks;

    const existingLevel = bookSide.get(input.price) ?? [];

    existingLevel.push(restingOrder);

    bookSide.set(input.price, existingLevel);
  }

  return order;
}

export function getDepth(symbol: string): DepthResponse {
  const orderBook = ORDERBOOKS.get(symbol);

  if (!orderBook) {
    return {
      symbol,
      bids: [],
      asks: [],
    };
  }

  const bids = [...orderBook.bids.entries()].map(([price, orders]) => ({
    price,
    qty: orders.reduce((sum, order) => sum + (order.qty - order.filledQty), 0),
  }));

  const asks = [...orderBook.asks.entries()].map(([price, orders]) => ({
    price,
    qty: orders.reduce((sum, order) => sum + (order.qty - order.filledQty), 0),
  }));

  return {
    symbol,
    bids,
    asks,
  };
}

export function getUserBalance(userId: string) {
  return BALANCES.get(userId) ?? {};
}

export function getOrder(orderId: string) {
  const order = ORDERS.get(orderId);

  if (!order) {
    throw new Error("order_not_found");
  }
  return order;
}

export function cancleOrder(orderID: string) {
  const order = ORDERS.get(orderID);

  if (!order) {
    throw new Error("order_not_found");
  }

  order.status = "cancelled";

  return order;
}
