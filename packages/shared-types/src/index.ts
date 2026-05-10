export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  AGENT_L1 = 'AGENT_L1',
  AGENT_L2 = 'AGENT_L2',
  AGENT_L3 = 'AGENT_L3',
  CUSTOMER = 'CUSTOMER',
}

export enum MemberLevel {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
}

export enum ProductStatus {
  ON_SALE = 'ON_SALE',
  OFF_SALE = 'OFF_SALE',
  DRAFT = 'DRAFT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PriceType {
  AGENT_L1 = 'AGENT_L1',
  AGENT_L2 = 'AGENT_L2',
  AGENT_L3 = 'AGENT_L3',
  MEMBER_GOLD = 'MEMBER_GOLD',
  MEMBER_SILVER = 'MEMBER_SILVER',
  MEMBER_BRONZE = 'MEMBER_BRONZE',
  RETAIL = 'RETAIL',
}
