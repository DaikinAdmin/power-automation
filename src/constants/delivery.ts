
export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  RETURNED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export const DELIVERY_STATUS_OPTIONS = [
  'PENDING', 
  'PROCESSING', 
  'IN_TRANSIT', 
  'DELIVERED', 
  'RETURNED', 
  'CANCELLED'
] as const;

export const DELIVERY_TYPE_OPTIONS = [
  'PICKUP',
  'USER_ADDRESS',
  'NOVA_POSHTA',
  'COURIER'
] as const;