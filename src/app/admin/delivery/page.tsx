import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Delivery Management</h1>
        <p className="text-gray-600">
          Manage shipping methods, carriers, and delivery tracking.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Shipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2</div>
            <p className="text-xs text-gray-600">days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shipping Methods</CardTitle>
            <CardDescription>
              Configure available shipping options.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Standard Shipping</h4>
                  <p className="text-sm text-gray-600">5-7 business days</p>
                </div>
                <span className="text-green-600 text-sm">Active</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Express Shipping</h4>
                  <p className="text-sm text-gray-600">2-3 business days</p>
                </div>
                <span className="text-green-600 text-sm">Active</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Overnight Shipping</h4>
                  <p className="text-sm text-gray-600">1 business day</p>
                </div>
                <span className="text-yellow-600 text-sm">Inactive</span>
              </div>
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Add Shipping Method
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Carriers</CardTitle>
            <CardDescription>
              Manage shipping carrier integrations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-brown-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">UPS</span>
                  </div>
                  <span className="font-medium">UPS</span>
                </div>
                <span className="text-green-600 text-sm">Connected</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">FX</span>
                  </div>
                  <span className="font-medium">FedEx</span>
                </div>
                <span className="text-green-600 text-sm">Connected</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">DH</span>
                  </div>
                  <span className="font-medium">DHL</span>
                </div>
                <span className="text-gray-600 text-sm">Disconnected</span>
              </div>
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Add Carrier
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
